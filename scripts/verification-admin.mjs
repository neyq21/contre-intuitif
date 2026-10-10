/**
 * Vérification de la phase 3 (admin) avec Playwright : définition de fini 5, 6, 7.
 * 5. se connecter, passer un métier en brouillon, voir qu'il disparaît du catalogue recruteur
 *    au prochain chargement, sans toucher au recrutement déjà figé ;
 * 6. recevoir une demande de métier de test et la marquer livrée ;
 * 7. créer un code licence Entreprise et le voir accepté dans les réglages recruteur.
 * Usage : npm run build && npm start, puis `node scripts/verification-admin.mjs [url] [chromium] [email] [mot de passe]`.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const URL = process.argv[2] ?? "http://localhost:3000";
const EXECUTABLE = process.argv[3] ?? process.env.CHROMIUM_PATH;
const EMAIL = process.argv[4] ?? process.env.EMAIL_ADMIN ?? "enselme.anthony@outlook.fr";
const MDP = process.argv[5] ?? process.env.MOT_DE_PASSE_INITIAL ?? "Neyqanthony21-";
const DOSSIER = process.env.CAPTURES ?? "captures-e2e";
mkdirSync(DOSSIER, { recursive: true });
function ok(c, m) {
  if (!c) throw new Error(`ÉCHEC : ${m}`);
  console.log(`✓ ${m}`);
}

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
const recruteur = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" });
const admin = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" });
const pr = await recruteur.newPage();
const pa = await admin.newPage();

// Recruteur : un recrutement figé sur « Maçon » avant la dépublication.
await pr.goto(`${URL}/metiers/macon`);
await pr.getByRole("link", { name: "Créer un recrutement" }).first().click();
await pr.waitForURL(/preparer\/poste/);
const idRec = pr.url().match(/recrutements\/(rec_[a-f0-9]+)/)[1];
await pr.goto(`${URL}/recrutements/${idRec}/preparer/verifier`);
await pr.getByRole("button", { name: "Figer l'épreuve et passer aux candidats" }).click();
await pr.waitForURL(/\/candidats$/);
ok(true, "recruteur : recrutement « Maçon » figé");

// 5. Connexion admin
await pa.goto(`${URL}/admin`);
await pa.waitForURL(/\/admin\/login/);
ok(true, "admin : redirection vers la connexion sans session");
await pa.getByLabel("E-mail").fill(EMAIL);
await pa.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
await pa.getByRole("button", { name: "Se connecter" }).click();
await pa.getByRole("alert").waitFor();
ok(true, "admin : mauvais mot de passe refusé");
await pa.waitForTimeout(800); // React remet le formulaire à zéro après l'action
await pa.getByLabel("Mot de passe").fill(MDP);
await pa.getByLabel("Mot de passe").press("Enter");
await pa.getByRole("heading", { name: "Tableau de bord" }).waitFor({ timeout: 20000 });
await pa.screenshot({ path: join(DOSSIER, "30-admin-tableau.png"), fullPage: true });
ok(true, "admin : connecté, tableau de bord");

// Dépublier Maçon
await pa.goto(`${URL}/admin/catalogue`);
const ligne = pa.getByRole("row", { name: /Maçon/ });
await ligne.getByRole("button", { name: "Dépublier" }).click();
await pa.getByRole("row", { name: /Maçon/ }).getByRole("button", { name: "Publier" }).waitFor();
ok(true, "admin : Maçon passé en brouillon");
await pa.screenshot({ path: join(DOSSIER, "31-admin-catalogue.png"), fullPage: false });

// Recruteur : au prochain chargement, Maçon disparaît, le recrutement figé reste intact
await pr.goto(`${URL}/metiers`);
await pr.getByText("Catalogue mis à jour").waitFor({ timeout: 20000 });
ok(true, "recruteur : « catalogue mis à jour » affiché");
const texteMetiers = await pr.locator("main").innerText();
ok(!texteMetiers.includes("Maçon"), "recruteur : Maçon absent du catalogue");
await pr.goto(`${URL}/recrutements/${idRec}/candidats`);
await pr.getByText("questions figées").first().waitFor();
await pr.getByLabel("Prénom ou code").fill("Après dépublication");
await pr.getByRole("button", { name: "Ajouter", exact: true }).click();
await pr.getByRole("button", { name: "Passer l'épreuve sur cet écran" }).click();
await pr.waitForURL(/\/passer\//);
await pr.getByRole("button", { name: "Commencer" }).click();
await pr.getByText("Situation 1 sur 4").waitFor();
ok(true, "recruteur : l'épreuve figée de Maçon reste passable après dépublication");

// Édition d'un métier publié : la version augmente, le recruteur voit la mise à jour
await pa.goto(`${URL}/admin/catalogue/serveur`);
await pa.getByRole("tab", { name: "Éditer" }).waitFor();
const champResume = pa.locator("textarea, input").filter({ hasText: "" }).nth(0);
void champResume;
const resume = pa.getByLabel("Résumé").first();
let resumeChamp = resume;
if (!(await resume.count())) resumeChamp = pa.locator("input.champ").nth(4);
await resumeChamp.fill("Accueille les clients, prend les commandes, sert à table et encaisse, en lien avec la cuisine. (édité)");
await pa.getByRole("button", { name: "Enregistrer", exact: true }).click();
await pa.getByText(/Enregistré \(version 2026\.10\.1/).waitFor();
ok(true, "admin : métier publié modifié → version 2026.10.1, catalogue republié");
await pa.getByRole("tab", { name: "Aperçu : comme le candidat" }).click();
await pa.getByRole("button", { name: "Commencer" }).waitFor();
ok(true, "admin : aperçu comme le candidat");
await pa.screenshot({ path: join(DOSSIER, "32-admin-apercu.png"), fullPage: false });
await pa.getByRole("tab", { name: "Aperçu : comme le recruteur" }).click();
await pa.getByText("Porte 1 : questions et corrigés").first().waitFor();
ok(true, "admin : aperçu comme le recruteur");

// 6. Demande de métier de test → livrée
await pr.goto(`${URL}/demande`);
await pr.getByLabel(/Intitulé du métier/).fill("Pharmacien / Pharmacienne d'officine (test)");
await pr.getByLabel(/Le contexte/).fill("Officine de quartier, 4 personnes.");
await pr.getByLabel(/Les tâches principales/).fill("Délivrance, conseil, gestion des stocks.");
await pr.getByLabel(/Les contraintes et les règles/).fill("Ordonnances, chaîne du froid.");
await pr.getByLabel(/Votre prénom et nom/).fill("Test Demandeur");
await pr.getByLabel(/Votre e-mail/).fill("test@example.org");
await pr.getByRole("button", { name: "Envoyer la demande" }).click();
await pr.getByText(/Demande reçue \(référence dem_/).waitFor();
ok(true, "recruteur : demande de métier envoyée (seulement les champs du formulaire)");
await pa.goto(`${URL}/admin/demandes`);
await pa.getByRole("link", { name: "Pharmacien / Pharmacienne d'officine (test)" }).first().click();
await pa.waitForURL(/\/admin\/demandes\/dem_/);
const texteDemande = await pa.locator("main").innerText();
ok(texteDemande.includes("Échéance (72 h ouvrées)") && texteDemande.includes("Reçue"), "admin : demande reçue avec son échéance");
await pa.getByLabel("Statut").selectOption("livree");
await pa.getByRole("button", { name: "Enregistrer" }).click();
await pa.waitForTimeout(500);
await pa.reload();
await pa.getByText("Livrée").first().waitFor();
ok(true, "admin : demande marquée livrée");
await pa.screenshot({ path: join(DOSSIER, "33-admin-demande.png"), fullPage: true });

// 7. Licence Entreprise → acceptée côté recruteur
await pa.goto(`${URL}/admin/licences`);
await pa.getByLabel("Type").selectOption("entreprise");
await pa.getByLabel(/Nom \(personne ou entité\)/).fill("Entreprise Test");
await pa.getByLabel("SIREN (facultatif)").fill("123456789");
await pa.getByRole("button", { name: "Créer un code" }).click();
await pa.getByText("Entreprise Test").waitFor();
const code = (await pa.locator("td.font-mono").first().innerText()).trim();
ok(/^CI5E-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code), `admin : code licence Entreprise créé (${code})`);
await pr.goto(`${URL}/donnees`);
await pr.getByPlaceholder("Code de licence").fill(code);
await pr.getByRole("button", { name: "Enregistrer", exact: true }).click();
await pr.getByText("Licence Entreprise enregistrée sur cet ordinateur").waitFor();
ok(true, "recruteur : code licence accepté, bandeau affiché");
await pr.goto(`${URL}/donnees`);
await pr.getByPlaceholder("Code de licence").fill("CI5E-FAUX-FAUX-FAUX");
await pr.getByRole("button", { name: "Enregistrer", exact: true }).click();
await pr.getByText("n'est pas reconnu").waitFor();
ok(true, "recruteur : code inconnu refusé");

// Journal
await pa.goto(`${URL}/admin/journal`);
const journal = await pa.locator("main").innerText();
ok(journal.includes("metier_depublie") && journal.includes("licence_creee") && journal.includes("metier_modifie"), "admin : journal (dépublication, licence, modification)");

// Textes : enregistrer la section « besoins » sans changement interdit, puis vérifier côté guide
await pa.goto(`${URL}/admin/textes/besoins`);
await pa.getByRole("button", { name: /Ajouter/ }).click();
await pa.locator("input.champ").last().fill("Un support écrit des consignes (test)");
await pa.getByRole("button", { name: "Enregistrer", exact: true }).click();
await pa.getByText("Enregistré. Le catalogue a été republié.").waitFor();
await pr.goto(`${URL}/guide/profils`);
await pr.getByText("Un support écrit des consignes (test)").waitFor();
ok(true, "admin : texte de la base modifié et visible côté recruteur");

// Admin sur téléphone : lire une demande et publier
const tel = await admin.browser().newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const cookies = await admin.cookies();
await tel.addCookies(cookies);
const pt = await tel.newPage();
await pt.goto(`${URL}/admin/catalogue`);
await pt.getByRole("row", { name: /Maçon/ }).getByRole("button", { name: "Publier" }).click();
await pt.getByRole("row", { name: /Maçon/ }).getByRole("button", { name: "Dépublier" }).waitFor();
ok(true, "admin sur téléphone : Maçon republié");
await pt.screenshot({ path: join(DOSSIER, "34-admin-tel.png"), fullPage: false });

await browser.close();
console.log("\nTerminé (phase 3).");
