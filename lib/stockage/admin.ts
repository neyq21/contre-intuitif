/**
 * Opérations de l'admin sur SQLite : catalogue, domaines, demandes, licences, journal.
 * Chaque action qui change ce que voit le recruteur publie une nouvelle version du catalogue.
 */
import { randomBytes } from "node:crypto";
import { calculerEmpreinteSync } from "@/lib/contenu/empreinte";
import { validerPack } from "@/lib/contenu/schema";
import type { Base, Pack } from "@/lib/contenu/types";
import { echeanceDemande } from "@/lib/methode/delais";
import { ecrireBase, journaliser, lireMetier, maintenant, publierCatalogue, type BaseSqlite, type LigneMetier } from "./sqlite";

export type Qui = string;

// --- Métiers ---------------------------------------------------------------

/** Version suivante : « 2026.10 » → « 2026.10.1 » → « 2026.10.2 ». */
export function versionSuivante(version: string): string {
  const m = version.match(/^(.*?)(?:\.(\d+))?$/);
  if (!m) return `${version}.1`;
  const base = m[1];
  const n = m[2] ? Number(m[2]) + 1 : 1;
  // Si la version est « 2026.10 », on ne doit pas la lire comme base « 2026 » + suffixe 10.
  if (/^\d{4}\.\d{2}$/.test(version)) return `${version}.1`;
  return `${base}.${n}`;
}

export function enregistrerMetier(db: BaseSqlite, qui: Qui, pack: Pack, options: { nouveau?: boolean; bumpVersion?: boolean } = {}): { pack: Pack; erreurs?: string[] } {
  const r = validerPack(pack);
  if (!r.ok) return { pack, erreurs: r.erreurs };
  const existant = lireMetier(db, pack.id);
  let final = { ...r.valeur };
  if (existant && options.bumpVersion !== false) {
    const contenuChange = calculerEmpreinteSync(final) !== calculerEmpreinteSync(existant.pack);
    if (contenuChange) final = { ...final, version: versionSuivante(existant.pack.version) };
  }
  final = { ...final, _pv: calculerEmpreinteSync(final) };
  const date = maintenant();
  if (existant) {
    db.prepare("UPDATE metiers SET json = ?, version = ?, nom = ?, secteur = ?, modifie_le = ? WHERE id = ?").run(JSON.stringify(final), final.version, final.nom, final.secteur, date, final.id);
    journaliser(db, qui, "metier_modifie", final.id, `version ${final.version}`);
    if (existant.statut === "publie") publierCatalogue(db, `Métier ${final.id} modifié (version ${final.version})`);
  } else {
    db.prepare("INSERT INTO metiers (id, json, version, nom, secteur, statut, plus_recrute, modifie_le, publie_le) VALUES (?, ?, ?, ?, ?, 'brouillon', 0, ?, NULL)").run(
      JSON.stringify(final),
      final.version,
      final.nom,
      final.secteur,
      date,
    );
    journaliser(db, qui, options.nouveau ? "metier_cree" : "metier_importe", final.id, final.nom);
  }
  return { pack: final };
}

export function publierMetier(db: BaseSqlite, qui: Qui, id: string, publie: boolean): void {
  const m = lireMetier(db, id);
  if (!m) return;
  db.prepare("UPDATE metiers SET statut = ?, publie_le = ?, modifie_le = ? WHERE id = ?").run(publie ? "publie" : "brouillon", publie ? maintenant() : m.publie_le, maintenant(), id);
  journaliser(db, qui, publie ? "metier_publie" : "metier_depublie", id, m.nom);
  publierCatalogue(db, `${publie ? "Publication" : "Dépublication"} de ${id}`);
  if (publie) {
    // Une demande liée passe « livrée ».
    db.prepare("UPDATE demandes SET statut = 'livree', modifie_le = ? WHERE metier_id = ? AND statut <> 'livree'").run(maintenant(), id);
  }
}

export function marquerPlusRecrute(db: BaseSqlite, qui: Qui, id: string, valeur: boolean): void {
  db.prepare("UPDATE metiers SET plus_recrute = ?, modifie_le = ? WHERE id = ?").run(valeur ? 1 : 0, maintenant(), id);
  journaliser(db, qui, valeur ? "plus_recrute_coche" : "plus_recrute_decoche", id);
  publierCatalogue(db, `Plus recrutés : ${id}`);
}

export function dupliquerMetier(db: BaseSqlite, qui: Qui, id: string): string | null {
  const m = lireMetier(db, id);
  if (!m) return null;
  let nouvelId = `${id}-copie`;
  let n = 2;
  while (lireMetier(db, nouvelId)) nouvelId = `${id}-copie-${n++}`;
  const pack: Pack = { ...m.pack, id: nouvelId, nom: `${m.pack.nom} (copie)` };
  enregistrerMetier(db, qui, pack, { nouveau: true });
  return nouvelId;
}

export function supprimerMetier(db: BaseSqlite, qui: Qui, id: string): void {
  const m = lireMetier(db, id);
  if (!m) return;
  if (m.statut === "publie") return; // on dépublie d'abord
  db.prepare("DELETE FROM metiers WHERE id = ?").run(id);
  journaliser(db, qui, "metier_supprime", id, m.nom);
}

/** Pack vide prérempli avec un intitulé (pour « créer le métier à partir de cette demande »). */
export function packVide(id: string, nom: string, secteur: string, base: Base): Pack {
  const competence = (code: "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8", titre: string) => ({
    code,
    titre,
    pourquoi: "",
    niveau_requis: 3 as const,
    situation: { titre: "", texte: "", document: null },
    portes: {
      p1: {
        questions: [1, 2, 3, 4, 5].map((n) => ({
          id: `q${n}`,
          texte: "",
          options: ["a", "b", "c", "d"].map((o) => ({ id: o, texte: "", points: 0 as const, repere: null })),
          explication: "",
          relance: "",
        })),
      },
      p2: { debuts: [1, 2, 3].map((n) => ({ id: `d${n}`, debut: "", justes: [{ texte: "", repere: null }], partielles: [], a_eviter: [] })), bonus: [] },
      p3: {
        reponse: "",
        question: { options: ["a", "b", "c", "d"].map((o) => ({ id: o, texte: "", points: 0 as const })) },
        indices: { options: [1, 2, 3, 4, 5, 6].map((n) => ({ id: `i${n}`, texte: "", juste: n <= 3 })) },
        suite: { options: ["a", "b", "c", "d"].map((o) => ({ id: o, texte: "", points: 0 as const, repere: null })) },
        explication: "",
      },
      p4: {
        type: "ordonner" as const,
        titre: "",
        consigne: "",
        elements: [1, 2, 3, 4, 5].map((n) => ({ id: `e${n}`, texte: "" })),
        regles: [{ avant: "e1", apres: "e2", explication: "" }],
        repere_reussite: null,
        repere_echec: null,
        reel: { consigne: "", criteres: [1, 2, 3, 4].map(() => ({ texte: "", repere: null })), bonus: { texte: "", repere: null } },
      },
      p5: { questions: [1, 2, 3].map((n) => ({ id: `o${n}`, texte: "", justes: [{ texte: "", repere: null }], partielles: [], a_eviter: [] })), bonus: [] },
    },
    integration: [],
  });
  return {
    schema: "ci5p-pack/3",
    id,
    version: new Date().toISOString().slice(0, 7).replace("-", "."),
    nom,
    secteur,
    alias: [],
    resume: "",
    contexte: "",
    cadre: "",
    competences: [competence("C1", base.competences[0].nom), competence("C2", base.competences[1].nom), competence("C7", base.competences[6].nom), competence("C4", base.competences[3].nom)],
    entretien: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: `e${n}`, competence: (["C1", "C1", "C2", "C2", "C7", "C7", "C4", "C4"] as const)[n - 1], texte: "", suite: [], attendus: ["", "", ""], relance: "", alternative: "" })),
    _pv: "",
  };
}

export function identifiantDepuisNom(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/\s*\/\s*/)[0]
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "metier";
}

// --- Base (textes, barèmes, …) ---------------------------------------------

export function enregistrerBase(db: BaseSqlite, qui: Qui, base: Base, section: string): void {
  ecrireBase(db, base);
  journaliser(db, qui, "base_modifiee", section);
  publierCatalogue(db, `Base modifiée : ${section}`);
}

// --- Domaines ---------------------------------------------------------------

export function enregistrerDomaine(db: BaseSqlite, qui: Qui, d: { id: string; nom: string; ordre: number; bientot: string[] }): void {
  db.prepare("INSERT INTO domaines (id, nom, ordre, bientot) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, ordre = excluded.ordre, bientot = excluded.bientot").run(
    d.id,
    d.nom,
    d.ordre,
    JSON.stringify(d.bientot),
  );
  journaliser(db, qui, "domaine_modifie", d.id, d.nom);
  publierCatalogue(db, `Domaine ${d.id}`);
}

export function supprimerDomaine(db: BaseSqlite, qui: Qui, id: string): boolean {
  const n = (db.prepare("SELECT count(*) AS n FROM metiers WHERE secteur = ?").get(id) as { n: number }).n;
  if (n > 0) return false;
  db.prepare("DELETE FROM domaines WHERE id = ?").run(id);
  journaliser(db, qui, "domaine_supprime", id);
  publierCatalogue(db, `Domaine ${id} supprimé`);
  return true;
}

// --- Demandes ---------------------------------------------------------------

export interface Demande {
  id: string;
  recu_le: string;
  echeance: string;
  statut: "recue" | "incomplete" | "en_cours" | "livree" | "refusee";
  intitule: string;
  contexte: string;
  taches: string;
  contraintes: string;
  nom: string;
  entreprise: string;
  email: string;
  telephone: string;
  metier_id: string | null;
  note: string;
  modifie_le: string;
}

export const STATUTS_DEMANDE: Record<Demande["statut"], string> = { recue: "Reçue", incomplete: "Incomplète", en_cours: "En cours", livree: "Livrée", refusee: "Refusée" };

export function listerDemandes(db: BaseSqlite): Demande[] {
  return db.prepare("SELECT * FROM demandes ORDER BY recu_le DESC").all() as Demande[];
}
export function lireDemande(db: BaseSqlite, id: string): Demande | null {
  return (db.prepare("SELECT * FROM demandes WHERE id = ?").get(id) as Demande | undefined) ?? null;
}
export function modifierDemande(db: BaseSqlite, qui: Qui, id: string, champs: Partial<Pick<Demande, "statut" | "note" | "metier_id">>): void {
  const d = lireDemande(db, id);
  if (!d) return;
  const statut = champs.statut ?? d.statut;
  // Une demande qui devient complète (reçue) fait repartir le délai de 72 h ouvrées.
  const echeance = d.statut === "incomplete" && statut === "recue" ? echeanceDemande(new Date()).toISOString() : d.echeance;
  db.prepare("UPDATE demandes SET statut = ?, note = ?, metier_id = ?, echeance = ?, modifie_le = ? WHERE id = ?").run(statut, champs.note ?? d.note, champs.metier_id === undefined ? d.metier_id : champs.metier_id, echeance, maintenant(), id);
  journaliser(db, qui, "demande_modifiee", id, `statut ${statut}`);
}
export function enRetard(d: Demande, maintenantIso = maintenant()): boolean {
  return (d.statut === "recue" || d.statut === "en_cours") && d.echeance < maintenantIso;
}

// --- Licences ---------------------------------------------------------------

export interface Licence {
  id: string;
  code: string;
  type: "solo" | "entreprise";
  nom: string;
  email: string;
  siren: string;
  fin_le: string | null;
  statut: "actif" | "revoque";
  cree_le: string;
}

function codeLicence(type: Licence["type"]): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const octets = randomBytes(12);
  let s = "";
  for (let i = 0; i < 12; i++) s += alphabet[octets[i] % alphabet.length];
  return `${type === "solo" ? "CI5S" : "CI5E"}-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export function creerLicence(db: BaseSqlite, qui: Qui, l: { type: Licence["type"]; nom: string; email: string; siren: string; fin_le: string | null }): Licence {
  const licence: Licence = { id: `lic_${randomBytes(6).toString("hex")}`, code: codeLicence(l.type), type: l.type, nom: l.nom, email: l.email, siren: l.siren, fin_le: l.fin_le, statut: "actif", cree_le: maintenant() };
  db.prepare("INSERT INTO licences (id, code, type, nom, email, siren, fin_le, statut, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?, 'actif', ?)").run(licence.id, licence.code, licence.type, licence.nom, licence.email, licence.siren, licence.fin_le, licence.cree_le);
  journaliser(db, qui, "licence_creee", licence.code, `${licence.type} · ${licence.nom}`);
  return licence;
}
export function listerLicences(db: BaseSqlite): Licence[] {
  return db.prepare("SELECT * FROM licences ORDER BY cree_le DESC").all() as Licence[];
}
export function changerStatutLicence(db: BaseSqlite, qui: Qui, id: string, statut: Licence["statut"]): void {
  db.prepare("UPDATE licences SET statut = ? WHERE id = ?").run(statut, id);
  journaliser(db, qui, statut === "revoque" ? "licence_revoquee" : "licence_reactivee", id);
}

// --- Journal ---------------------------------------------------------------

export interface EntreeJournal {
  id: number;
  date: string;
  qui: string;
  action: string;
  objet: string;
  detail: string;
}
export function lireJournal(db: BaseSqlite, limite = 200): EntreeJournal[] {
  return db.prepare("SELECT * FROM journal ORDER BY id DESC LIMIT ?").all(limite) as EntreeJournal[];
}

export function compterMetiers(db: BaseSqlite): { publies: number; brouillons: number } {
  const rows = db.prepare("SELECT statut, count(*) AS n FROM metiers GROUP BY statut").all() as { statut: string; n: number }[];
  return { publies: rows.find((r) => r.statut === "publie")?.n ?? 0, brouillons: rows.find((r) => r.statut === "brouillon")?.n ?? 0 };
}

export type { LigneMetier };
