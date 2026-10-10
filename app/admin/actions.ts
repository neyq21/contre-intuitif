"use server";

/**
 * Actions serveur de l'admin. Chacune vérifie la session.
 * Aucune n'accède à des données de candidats : il n'y en a pas sur le serveur.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE_SESSION, changerMotDePasse, creerSession, exigerAdmin, supprimerSession, verifierIdentifiants } from "@/lib/admin/session";
import { lireBase, journaliser, ouvrirBase, lireMetier } from "@/lib/stockage/sqlite";
import {
  changerStatutLicence,
  creerLicence,
  dupliquerMetier,
  enregistrerDomaine,
  enregistrerMetier,
  marquerPlusRecrute,
  modifierDemande,
  publierMetier,
  supprimerDomaine,
  supprimerMetier,
  type Demande,
  type Licence,
} from "@/lib/stockage/admin";
import { lireJson, importerPack } from "@/lib/fichiers/formats";

function texte(fd: FormData, cle: string): string {
  const v = fd.get(cle);
  return typeof v === "string" ? v.trim() : "";
}

export async function connecter(_etat: { erreur: string; email: string } | null, fd: FormData): Promise<{ erreur: string; email: string } | null> {
  const db = ouvrirBase();
  const admin = verifierIdentifiants(db, texte(fd, "email"), typeof fd.get("mot_de_passe") === "string" ? (fd.get("mot_de_passe") as string) : "");
  if (!admin) {
    journaliser(db, texte(fd, "email") || "inconnu", "connexion_refusee");
    return { erreur: "E-mail ou mot de passe incorrect.", email: texte(fd, "email") };
  }
  const s = creerSession(db, admin.id);
  const magasin = await cookies();
  magasin.set(COOKIE_SESSION, s.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && (process.env.URL_PUBLIQUE ?? "").startsWith("https"), path: "/", expires: s.expire });
  journaliser(db, admin.email, "connexion");
  redirect("/admin");
}

export async function deconnecter(): Promise<void> {
  const magasin = await cookies();
  const id = magasin.get(COOKIE_SESSION)?.value;
  if (id) supprimerSession(ouvrirBase(), id);
  magasin.delete(COOKIE_SESSION);
  redirect("/admin/login");
}

export async function changerMotDePasseAction(_etat: { message: string } | null, fd: FormData): Promise<{ message: string }> {
  const admin = await exigerAdmin();
  const db = ouvrirBase();
  const actuel = (fd.get("actuel") as string) ?? "";
  const nouveau = (fd.get("nouveau") as string) ?? "";
  const confirmation = (fd.get("confirmation") as string) ?? "";
  if (!verifierIdentifiants(db, admin.email, actuel)) return { message: "Le mot de passe actuel est incorrect." };
  if (nouveau.length < 12) return { message: "Le nouveau mot de passe doit faire au moins 12 caractères." };
  if (nouveau !== confirmation) return { message: "La confirmation ne correspond pas." };
  changerMotDePasse(db, admin.id, nouveau);
  journaliser(db, admin.email, "mot_de_passe_change");
  const magasin = await cookies();
  magasin.delete(COOKIE_SESSION);
  redirect("/admin/login?mdp=1");
}

// --- Catalogue --------------------------------------------------------------

export async function actionMetier(fd: FormData): Promise<void> {
  const admin = await exigerAdmin();
  const db = ouvrirBase();
  const id = texte(fd, "id");
  const action = texte(fd, "action");
  if (!id) return;
  if (action === "publier") publierMetier(db, admin.email, id, true);
  else if (action === "depublier") publierMetier(db, admin.email, id, false);
  else if (action === "plus_recrute") marquerPlusRecrute(db, admin.email, id, texte(fd, "valeur") === "1");
  else if (action === "dupliquer") {
    const nouvel = dupliquerMetier(db, admin.email, id);
    revalidatePath("/admin/catalogue");
    if (nouvel) redirect(`/admin/catalogue/${nouvel}`);
  } else if (action === "supprimer") supprimerMetier(db, admin.email, id);
  revalidatePath("/admin/catalogue");
  revalidatePath("/admin");
}

export async function importerMetierAction(_etat: { message: string } | null, fd: FormData): Promise<{ message: string }> {
  const admin = await exigerAdmin();
  const f = fd.get("fichier");
  if (!(f instanceof File)) return { message: "Choisissez un fichier .json." };
  const json = lireJson(await f.text());
  if (!json.ok) return { message: json.erreur };
  const r = importerPack(json.valeur);
  if (!r.ok) return { message: r.erreur };
  const db = ouvrirBase();
  const existant = lireMetier(db, r.valeur.id);
  const res = enregistrerMetier(db, admin.email, r.valeur, { nouveau: !existant });
  if (res.erreurs) return { message: res.erreurs.join("\n") };
  revalidatePath("/admin/catalogue");
  return { message: `${existant ? "Métier mis à jour" : "Métier importé en brouillon"} : ${res.pack.nom} (version ${res.pack.version}).${r.avertissements.length ? " " + r.avertissements.join(" ") : ""}` };
}

export async function domaineAction(fd: FormData): Promise<void> {
  const admin = await exigerAdmin();
  const db = ouvrirBase();
  const action = texte(fd, "action");
  const id = texte(fd, "id")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
  if (!id) return;
  if (action === "supprimer") supprimerDomaine(db, admin.email, id);
  else {
    enregistrerDomaine(db, admin.email, {
      id,
      nom: texte(fd, "nom") || id,
      ordre: Number(texte(fd, "ordre")) || 0,
      bientot: texte(fd, "bientot")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }
  revalidatePath("/admin/catalogue/domaines");
}

// --- Demandes -------------------------------------------------------------

export async function demandeAction(fd: FormData): Promise<void> {
  const admin = await exigerAdmin();
  const db = ouvrirBase();
  const id = texte(fd, "id");
  const statut = texte(fd, "statut") as Demande["statut"];
  const metier = texte(fd, "metier_id");
  modifierDemande(db, admin.email, id, { statut: ["recue", "incomplete", "en_cours", "livree", "refusee"].includes(statut) ? statut : undefined, note: texte(fd, "note"), metier_id: metier || null });
  revalidatePath(`/admin/demandes/${id}`);
  revalidatePath("/admin/demandes");
  revalidatePath("/admin");
}

export async function creerMetierDepuisDemande(fd: FormData): Promise<void> {
  await exigerAdmin();
  const id = texte(fd, "id");
  redirect(`/admin/catalogue/nouveau?demande=${encodeURIComponent(id)}`);
}

// --- Licences -------------------------------------------------------------

export async function licenceAction(fd: FormData): Promise<void> {
  const admin = await exigerAdmin();
  const db = ouvrirBase();
  const action = texte(fd, "action");
  if (action === "creer") {
    const type = (texte(fd, "type") === "entreprise" ? "entreprise" : "solo") as Licence["type"];
    if (!texte(fd, "nom")) return;
    creerLicence(db, admin.email, { type, nom: texte(fd, "nom"), email: texte(fd, "email"), siren: texte(fd, "siren"), fin_le: texte(fd, "fin_le") || null });
  } else if (action === "revoquer") changerStatutLicence(db, admin.email, texte(fd, "id"), "revoque");
  else if (action === "reactiver") changerStatutLicence(db, admin.email, texte(fd, "id"), "actif");
  revalidatePath("/admin/licences");
  revalidatePath("/admin");
}

// --- Vidéo -----------------------------------------------------------------

export async function transcriptionAction(fd: FormData): Promise<void> {
  const admin = await exigerAdmin();
  const db = ouvrirBase();
  const { ecrireReglage } = await import("@/lib/stockage/sqlite");
  ecrireReglage(db, "video_transcription", texte(fd, "transcription"));
  journaliser(db, admin.email, "transcription_modifiee");
  const { publierCatalogue } = await import("@/lib/stockage/sqlite");
  publierCatalogue(db, "Transcription de la vidéo");
  revalidatePath("/admin/video");
}

export async function baseActuelle() {
  await exigerAdmin();
  return lireBase(ouvrirBase());
}
