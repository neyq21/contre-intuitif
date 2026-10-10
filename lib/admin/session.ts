/**
 * Session admin : un seul utilisateur, e-mail + mot de passe haché (bcrypt),
 * cookie de session httpOnly. Pas de service d'auth externe. Serveur uniquement.
 */
import { randomBytes } from "node:crypto";
import { compareSync, hashSync } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { maintenant, ouvrirBase, type BaseSqlite } from "@/lib/stockage/sqlite";

export const COOKIE_SESSION = "ci5p_admin";
const DUREE_SESSION_JOURS = 7;

export interface Admin {
  id: number;
  email: string;
}

export function verifierIdentifiants(db: BaseSqlite, email: string, motDePasse: string): Admin | null {
  const r = db.prepare("SELECT id, email, hash FROM admin WHERE lower(email) = lower(?)").get(email.trim()) as { id: number; email: string; hash: string } | undefined;
  if (!r) {
    // Même coût qu'une vraie comparaison, pour ne pas révéler l'existence du compte.
    compareSync(motDePasse, "$2a$10$abcdefghijklmnopqrstuuAbCdEfGhIjKlMnOpQrStUvWxYz012345");
    return null;
  }
  return compareSync(motDePasse, r.hash) ? { id: r.id, email: r.email } : null;
}

export function creerSession(db: BaseSqlite, adminId: number): { id: string; expire: Date } {
  const id = randomBytes(32).toString("base64url");
  const expire = new Date(Date.now() + DUREE_SESSION_JOURS * 24 * 3600 * 1000);
  db.prepare("DELETE FROM sessions WHERE expire_le < ?").run(maintenant());
  db.prepare("INSERT INTO sessions (id, admin_id, cree_le, expire_le) VALUES (?, ?, ?, ?)").run(id, adminId, maintenant(), expire.toISOString());
  return { id, expire };
}

export function supprimerSession(db: BaseSqlite, id: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function adminDeSession(db: BaseSqlite, sessionId: string | undefined): Admin | null {
  if (!sessionId) return null;
  const r = db
    .prepare("SELECT a.id, a.email FROM sessions s JOIN admin a ON a.id = s.admin_id WHERE s.id = ? AND s.expire_le > ?")
    .get(sessionId, maintenant()) as Admin | undefined;
  return r ?? null;
}

/** L'admin connecté, ou null. À appeler dans les composants serveur et les route handlers. */
export async function sessionCourante(): Promise<Admin | null> {
  const magasin = await cookies();
  return adminDeSession(ouvrirBase(), magasin.get(COOKIE_SESSION)?.value);
}

/** Redirige vers la connexion si personne n'est connecté. */
export async function exigerAdmin(): Promise<Admin> {
  const admin = await sessionCourante();
  if (!admin) redirect("/admin/login");
  return admin;
}

export function changerMotDePasse(db: BaseSqlite, adminId: number, nouveau: string): void {
  db.prepare("UPDATE admin SET hash = ? WHERE id = ?").run(hashSync(nouveau, 10), adminId);
  db.prepare("DELETE FROM sessions WHERE admin_id = ?").run(adminId);
}
