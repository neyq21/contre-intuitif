/**
 * « Décrire mon besoin » : mots-clés et synonymes, toujours les mêmes.
 * Aucune IA. Chaque réglage dit quels mots l'ont déclenché. Si rien n'est reconnu,
 * on ne devine pas.
 */
import type { Base, CodeCompetence, Niveau, Pack, PorteId } from "@/lib/contenu/types";
import { LIMITES } from "./tirage";

export interface ReglageDeclenche {
  reglage: string;
  valeur: string;
  mots: string[];
}

export interface ResultatBesoin {
  metier: { id: string; nom: string; mots: string[] } | null;
  poste: string | null;
  competences: { code: CodeCompetence; niveau_requis: Niveau }[];
  portes: PorteId[] | null;
  nombres: { p1: number; p2: number; p5: number } | null;
  reglages: ReglageDeclenche[];
}

/** Synonymes explicites, en plus des alias des packs. */
export const SYNONYMES: Record<string, string[]> = {
  serveur: ["serveuse", "service en salle", "salle", "brasserie", "restaurant", "café", "bar"],
  cuisinier: ["cuisinière", "cuisine", "chef de partie", "commis de cuisine"],
  "employe-restauration": ["employé polyvalent", "employée polyvalente", "restauration rapide", "fast-food", "équipier", "équipière"],
  "aide-soignant": ["aide-soignante", "aide soignante", "aide soignant", "ehpad", "soins", "maison de retraite"],
  "aide-domicile": ["auxiliaire de vie", "aide à domicile", "domicile", "personnes âgées"],
  infirmier: ["infirmière", "ide", "soins infirmiers"],
  "agent-entretien": ["agent d'entretien", "agente d'entretien", "entretien", "nettoyage", "ménage", "propreté", "bureaux"],
  "agent-securite": ["agent de sécurité", "agente de sécurité", "sécurité", "gardiennage", "vigile"],
  "employe-libre-service": ["libre-service", "libre service", "mise en rayon", "rayon", "supermarché", "grande distribution"],
  "hote-caisse": ["hôte de caisse", "hôtesse de caisse", "caisse", "caissier", "caissière", "encaissement"],
  vendeur: ["vendeuse", "vente en magasin", "magasin", "boutique"],
  commercial: ["commerciale", "vente", "prospection", "business developer"],
  "conseiller-clientele": ["conseiller clientèle", "conseillère clientèle", "relation client", "service client", "centre d'appels", "téléconseiller"],
  "preparateur-commandes": ["préparateur de commandes", "préparatrice de commandes", "préparation de commandes", "entrepôt", "picking"],
  cariste: ["chariot élévateur", "caces"],
  "chauffeur-livreur": ["chauffeuse-livreuse", "livreur", "livreuse", "livraison", "tournée"],
  "operateur-production": ["opérateur de production", "opératrice de production", "production", "ligne de production", "usine"],
  "controleur-qualite": ["contrôleur qualité", "contrôleuse qualité", "qualité", "contrôle qualité"],
  "technicien-maintenance": ["technicien de maintenance", "technicienne de maintenance", "maintenance", "dépannage"],
  electricien: ["électricienne", "électricité", "électrique"],
  plombier: ["plombière", "plomberie", "chauffagiste", "sanitaire"],
  macon: ["maçonne", "maçonnerie", "gros œuvre", "chantier"],
  "assistant-administratif": ["assistante administrative", "administratif", "secrétariat", "secrétaire"],
  comptable: ["comptabilité", "assistant comptable", "assistante comptable"],
  "gestionnaire-paie": ["paie", "gestionnaire de paie", "bulletins"],
  developpeur: ["développeuse", "développement", "programmeur", "programmeuse", "logiciel"],
  "data-analyst": ["analyste de données", "données", "data"],
  "support-informatique": ["support informatique", "technicien support", "technicienne support", "helpdesk", "assistance informatique"],
  testeur: ["testeuse", "test logiciel", "qa", "recette"],
  communication: ["chargé de communication", "chargée de communication", "réseaux sociaux", "community"],
  manager: ["manager d'équipe", "responsable d'équipe", "chef d'équipe", "cheffe d'équipe", "encadrement"],
  "ouvrier-agricole": ["ouvrière agricole", "agricole", "ferme", "exploitation", "récolte", "vendanges", "maraîchage"],
  animateur: ["animatrice", "animation", "centre de loisirs", "périscolaire", "colonie"],
};

const REGLES: { reglage: string; mots: string[]; appliquer: (r: ResultatBesoin, pack: Pack | null) => string }[] = [
  {
    reglage: "Niveau requis",
    mots: ["débutant", "débutante", "sans expérience", "première expérience", "junior", "apprenti", "apprentie", "alternance"],
    appliquer: (r) => {
      r.competences = r.competences.map((c) => ({ ...c, niveau_requis: Math.min(c.niveau_requis, 2) as Niveau }));
      return "2 (Partiel) pour toutes les compétences : les débutants ne sont pas écartés";
    },
  },
  {
    reglage: "Niveau requis",
    mots: ["confirmé", "confirmée", "expérimenté", "expérimentée", "senior", "autonome tout de suite"],
    appliquer: (r) => {
      r.competences = r.competences.map((c) => ({ ...c, niveau_requis: Math.max(c.niveau_requis, 3) as Niveau }));
      return "au moins 3 (Attendu) pour toutes les compétences";
    },
  },
  {
    reglage: "Nombre de questions",
    mots: ["épreuve courte", "court", "courte", "rapide", "vite", "peu de temps"],
    appliquer: (r) => {
      r.nombres = { p1: LIMITES.p1.min, p2: LIMITES.p2.min, p5: LIMITES.p5.min };
      return "épreuve courte : 3 choix multiples, 2 phrases, 2 questions orales ou écrites";
    },
  },
  {
    reglage: "Nombre de questions",
    mots: ["épreuve complète", "épreuve longue", "approfondi", "approfondie", "complet", "complète"],
    appliquer: (r) => {
      r.nombres = { p1: 8, p2: 5, p5: 5 };
      return "épreuve longue : 8 choix multiples, 5 phrases, 5 questions orales ou écrites";
    },
  },
  {
    reglage: "Portes proposées",
    mots: ["sans écrit", "sans ecrit", "pas d'écrit", "peu d'écrit", "oral", "à l'oral"],
    appliquer: (r) => {
      r.portes = ["p1", "p3", "p4", "p5"];
      return "choix multiples, retrouvez la question, défi pratique, et oral (porte 5, réponse orale notée par vous) ; sans phrases à compléter";
    },
  },
  {
    reglage: "Portes proposées",
    mots: ["écrit uniquement", "par écrit", "à l'écrit"],
    appliquer: (r) => {
      r.portes = ["p1", "p2", "p3", "p4", "p5"];
      return "les cinq portes, réponses écrites possibles partout";
    },
  },
  {
    reglage: "Recrutement inclusif",
    mots: ["inclusif", "inclusive", "neurodivergent", "neurodivergente", "neuroatypique", "aménagement", "aménagements", "handicap"],
    appliquer: () => "questions envoyées à l'avance, la question « De quoi avez-vous besoin ? » dès l'invitation, déroulé jamais proposé si un besoin est signalé (c'est déjà le fonctionnement du kit)",
  },
  {
    reglage: "Savoir-être essentiels",
    mots: ["fiable", "fiabilité", "ponctuel", "ponctuelle", "sérieux", "sérieuse", "rigoureux", "rigoureuse"],
    appliquer: () => "« Respect des règles et des engagements » et « Rigueur et précision » mis en avant dans le profil de travail",
  },
  {
    reglage: "Savoir-être essentiels",
    mots: ["coup de feu", "rush", "pression", "forte affluence", "stress"],
    appliquer: () => "« Calme sous pression » et « Organisation » mis en avant dans le profil de travail ; les situations de forte activité du métier en premier",
  },
  {
    reglage: "Savoir-être essentiels",
    mots: ["équipe", "esprit d'équipe", "collectif"],
    appliquer: () => "« Travail en équipe » mis en avant dans le profil de travail",
  },
  {
    reglage: "Savoir-être essentiels",
    mots: ["clients", "accueil", "relation client", "sens du service"],
    appliquer: () => "« Sens du service » mis en avant dans le profil de travail",
  },
];

function normaliser(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function contient(phrase: string, mot: string): boolean {
  const p = normaliser(phrase);
  const m = normaliser(mot);
  // mot entier (frontières) ; pluriel simple accepté
  const re = new RegExp(`(^|[^a-z0-9])${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|es)?($|[^a-z0-9])`, "i");
  return re.test(p);
}

/** Table des mots-clés par métier : alias du pack + synonymes explicites. Visible dans le guide. */
export function motsClesMetier(pack: Pack): string[] {
  return [...new Set([pack.nom, ...pack.nom.split(" / "), ...pack.alias, ...(SYNONYMES[pack.id] ?? [])].map((m) => m.trim()).filter(Boolean))];
}

export function analyserBesoin(phrase: string, packs: Pack[], base: Base): ResultatBesoin {
  const resultat: ResultatBesoin = { metier: null, poste: null, competences: [], portes: null, nombres: null, reglages: [] };
  if (!phrase.trim()) return resultat;

  // Métier : on garde celui dont le mot-clé reconnu est le plus long (le plus précis).
  let meilleur: { pack: Pack; mots: string[]; longueur: number } | null = null;
  for (const pack of packs) {
    const mots = motsClesMetier(pack).filter((m) => contient(phrase, m));
    if (!mots.length) continue;
    const longueur = Math.max(...mots.map((m) => m.length));
    if (!meilleur || longueur > meilleur.longueur) meilleur = { pack, mots, longueur };
  }
  const pack = meilleur?.pack ?? null;
  if (pack && meilleur) {
    resultat.metier = { id: pack.id, nom: pack.nom, mots: meilleur.mots };
    resultat.poste = pack.nom;
    resultat.competences = pack.competences.map((c) => ({ code: c.code, niveau_requis: c.niveau_requis }));
  }

  for (const regle of REGLES) {
    const mots = regle.mots.filter((m) => contient(phrase, m));
    if (!mots.length) continue;
    const valeur = regle.appliquer(resultat, pack);
    resultat.reglages.push({ reglage: regle.reglage, valeur, mots });
  }

  // Compétences qui en parlent : mots de la phrase retrouvés dans les titres ou situations du métier.
  if (pack) {
    const motsPhrase = normaliser(phrase)
      .split(/[^a-z0-9]+/)
      .filter((m) => m.length >= 5);
    const touchees = pack.competences
      .map((c) => {
        const texte = normaliser(`${c.titre} ${c.situation.titre} ${c.situation.texte}`);
        const trouves = motsPhrase.filter((m) => texte.includes(m) && !motsClesMetier(pack).some((k) => normaliser(k).includes(m)));
        return { c, trouves };
      })
      .filter((x) => x.trouves.length);
    if (touchees.length) {
      resultat.reglages.push({
        reglage: "Situations qui en parlent",
        valeur: touchees.map((t) => `${t.c.code} · ${t.c.titre}`).join(" ; "),
        mots: [...new Set(touchees.flatMap((t) => t.trouves))],
      });
    }
  }
  void base;
  return resultat;
}
