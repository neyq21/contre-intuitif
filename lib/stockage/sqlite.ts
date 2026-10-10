/**
 * Base SQLite de l'admin : `data/admin.sqlite`, créée au premier lancement,
 * seedée depuis `contenu/`. Serveur uniquement.
 *
 * Elle ne contient jamais de réponses, de candidats, de déroulés ni de motifs
 * de décision : tout cela reste dans le navigateur du recruteur.
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { hashSync } from "bcryptjs";
import { chargerBase, chargerPacks } from "@/lib/contenu/charger";
import type { Base, Domaine, Pack } from "@/lib/contenu/types";
import { REGLAGES } from "@/lib/reglages";

export type BaseSqlite = Database.Database;

const CHEMIN_DEFAUT = process.env.CHEMIN_SQLITE ?? join(process.cwd(), "data", "admin.sqlite");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL,
  cree_le TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admin(id),
  cree_le TEXT NOT NULL,
  expire_le TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS base (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL,
  modifie_le TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS domaines (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  bientot TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS metiers (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  version TEXT NOT NULL,
  nom TEXT NOT NULL,
  secteur TEXT NOT NULL,
  statut TEXT NOT NULL CHECK (statut IN ('publie', 'brouillon')),
  plus_recrute INTEGER NOT NULL DEFAULT 0,
  modifie_le TEXT NOT NULL,
  publie_le TEXT
);
CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER NOT NULL,
  date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS demandes (
  id TEXT PRIMARY KEY,
  recu_le TEXT NOT NULL,
  echeance TEXT NOT NULL,
  statut TEXT NOT NULL CHECK (statut IN ('recue', 'incomplete', 'en_cours', 'livree', 'refusee')),
  intitule TEXT NOT NULL,
  contexte TEXT NOT NULL DEFAULT '',
  taches TEXT NOT NULL DEFAULT '',
  contraintes TEXT NOT NULL DEFAULT '',
  nom TEXT NOT NULL DEFAULT '',
  entreprise TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telephone TEXT NOT NULL DEFAULT '',
  metier_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  modifie_le TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS licences (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('solo', 'entreprise')),
  nom TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  siren TEXT NOT NULL DEFAULT '',
  fin_le TEXT,
  statut TEXT NOT NULL CHECK (statut IN ('actif', 'revoque')),
  cree_le TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  qui TEXT NOT NULL,
  action TEXT NOT NULL,
  objet TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS epreuves (
  token TEXT PRIMARY KEY,
  blob TEXT NOT NULL,
  cree_le TEXT NOT NULL,
  expire_le TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reglages (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);
`;

let instance: BaseSqlite | null = null;

export function maintenant(): string {
  return new Date().toISOString();
}

/** Ouvre (et crée si besoin) la base. Singleton par processus. */
export function ouvrirBase(chemin: string = CHEMIN_DEFAUT): BaseSqlite {
  if (instance && chemin === CHEMIN_DEFAUT) return instance;
  if (chemin !== ":memory:") mkdirSync(dirname(chemin), { recursive: true });
  const db = new Database(chemin);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  seederSiVide(db);
  if (chemin === CHEMIN_DEFAUT) instance = db;
  return db;
}

export function fermerBase(): void {
  instance?.close();
  instance = null;
}

export function lireReglage(db: BaseSqlite, cle: string): string | null {
  const r = db.prepare("SELECT valeur FROM reglages WHERE cle = ?").get(cle) as { valeur: string } | undefined;
  return r?.valeur ?? null;
}

export function ecrireReglage(db: BaseSqlite, cle: string, valeur: string): void {
  db.prepare("INSERT INTO reglages (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur").run(
    cle,
    valeur,
  );
}

export function journaliser(db: BaseSqlite, qui: string, action: string, objet = "", detail = ""): void {
  db.prepare("INSERT INTO journal (date, qui, action, objet, detail) VALUES (?, ?, ?, ?, ?)").run(
    maintenant(),
    qui,
    action,
    objet,
    detail,
  );
}

/** Seed depuis `contenu/` si la base est vide. Idempotent. */
export function seederSiVide(db: BaseSqlite): { seede: boolean } {
  const existe = db.prepare("SELECT 1 FROM base WHERE id = 1").get();
  if (existe) return { seede: false };

  const base = chargerBase();
  const packs = chargerPacks();
  const date = maintenant();
  const plusRecrutes = new Set(base.catalogue.plus_recrutes);

  const tx = db.transaction(() => {
    db.prepare("INSERT INTO base (id, json, modifie_le) VALUES (1, ?, ?)").run(JSON.stringify(base), date);
    const insDom = db.prepare("INSERT INTO domaines (id, nom, ordre, bientot) VALUES (?, ?, ?, ?)");
    base.secteurs.forEach((s, i) => insDom.run(s.id, s.nom, i, JSON.stringify(s.bientot ?? [])));
    const insMet = db.prepare(
      "INSERT INTO metiers (id, json, version, nom, secteur, statut, plus_recrute, modifie_le, publie_le) VALUES (?, ?, ?, ?, ?, 'publie', ?, ?, ?)",
    );
    for (const p of packs) {
      insMet.run(p.id, JSON.stringify(p), p.version, p.nom, p.secteur, plusRecrutes.has(p.id) ? 1 : 0, date, date);
    }
    ecrireReglage(db, "catalogue_version", "1");
    ecrireReglage(db, "catalogue_publie_le", date);
    ecrireReglage(db, "video_transcription", "");
    db.prepare("INSERT INTO publications (version, date, note) VALUES (1, ?, 'Seed initial depuis contenu/')").run(date);
    const admin = db.prepare("SELECT 1 FROM admin WHERE email = ?").get(REGLAGES.EMAIL_ADMIN);
    if (!admin) {
      db.prepare("INSERT INTO admin (email, hash, cree_le) VALUES (?, ?, ?)").run(
        REGLAGES.EMAIL_ADMIN,
        hashSync(REGLAGES.MOT_DE_PASSE_INITIAL, 10),
        date,
      );
    }
    journaliser(db, "système", "seed", "catalogue", `${packs.length} métiers, base ${base.meta.version}`);
  });
  tx();
  return { seede: true };
}

// ---------------------------------------------------------------------------
// Lectures du catalogue
// ---------------------------------------------------------------------------

export function lireBase(db: BaseSqlite): Base {
  const r = db.prepare("SELECT json FROM base WHERE id = 1").get() as { json: string };
  return JSON.parse(r.json) as Base;
}

export function ecrireBase(db: BaseSqlite, base: Base): void {
  db.prepare("UPDATE base SET json = ?, modifie_le = ? WHERE id = 1").run(JSON.stringify(base), maintenant());
}

export function lireDomaines(db: BaseSqlite): Domaine[] {
  const rows = db.prepare("SELECT id, nom, ordre, bientot FROM domaines ORDER BY ordre, nom").all() as {
    id: string;
    nom: string;
    ordre: number;
    bientot: string;
  }[];
  return rows.map((r) => ({ id: r.id, nom: r.nom, ordre: r.ordre, bientot: JSON.parse(r.bientot) as string[] }));
}

export interface LigneMetier {
  id: string;
  version: string;
  nom: string;
  secteur: string;
  statut: "publie" | "brouillon";
  plus_recrute: boolean;
  modifie_le: string;
  publie_le: string | null;
}

export function listerMetiers(db: BaseSqlite, seulementPublies = false): LigneMetier[] {
  const rows = db
    .prepare(
      `SELECT id, version, nom, secteur, statut, plus_recrute, modifie_le, publie_le FROM metiers ${seulementPublies ? "WHERE statut = 'publie'" : ""} ORDER BY nom`,
    )
    .all() as (Omit<LigneMetier, "plus_recrute"> & { plus_recrute: number })[];
  return rows.map((r) => ({ ...r, plus_recrute: r.plus_recrute === 1 }));
}

export function lireMetier(db: BaseSqlite, id: string): (LigneMetier & { pack: Pack }) | null {
  const r = db.prepare("SELECT * FROM metiers WHERE id = ?").get(id) as
    | (Omit<LigneMetier, "plus_recrute"> & { plus_recrute: number; json: string })
    | undefined;
  if (!r) return null;
  const { json, plus_recrute, ...reste } = r;
  return { ...reste, plus_recrute: plus_recrute === 1, pack: JSON.parse(json) as Pack };
}

export function lirePacksPublies(db: BaseSqlite): Pack[] {
  const rows = db.prepare("SELECT json FROM metiers WHERE statut = 'publie' ORDER BY nom").all() as { json: string }[];
  return rows.map((r) => JSON.parse(r.json) as Pack);
}

export function versionCatalogue(db: BaseSqlite): { version: number; publie_le: string } {
  return {
    version: Number(lireReglage(db, "catalogue_version") ?? "1"),
    publie_le: lireReglage(db, "catalogue_publie_le") ?? "",
  };
}

/** Nouvelle publication du catalogue : la version augmente. */
export function publierCatalogue(db: BaseSqlite, note: string): number {
  const v = versionCatalogue(db).version + 1;
  const date = maintenant();
  ecrireReglage(db, "catalogue_version", String(v));
  ecrireReglage(db, "catalogue_publie_le", date);
  db.prepare("INSERT INTO publications (version, date, note) VALUES (?, ?, ?)").run(v, date, note);
  return v;
}

