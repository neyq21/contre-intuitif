/**
 * Vérification de bout en bout de la « définition de fini » (points 1 à 4), avec Playwright.
 * Usage : npm run build && npm start, puis `node scripts/verification-e2e.mjs [url] [chromium]`.
 * Ce script n'est pas un test unitaire : il pilote un vrai navigateur sur l'application.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const URL = process.argv[2] ?? "http://localhost:3000";
const EXECUTABLE = process.argv[3] ?? process.env.CHROMIUM_PATH;
const DOSSIER = process.env.CAPTURES ?? "captures-e2e";
mkdirSync(DOSSIER, { recursive: true });

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
const contexte = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR", acceptDownloads: true });
const page = await contexte.newPage();
const erreursConsole = [];
page.on("pageerror", (e) => erreursConsole.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") erreursConsole.push(m.text());
});

function ok(condition, message) {
  if (!condition) throw new Error(`ÉCHEC : ${message}`);
  console.log(`✓ ${message}`);
}
async function capture(nom) {
  await page.screenshot({ path: join(DOSSIER, `${nom}.png`), fullPage: true });
}

// 1. Regarder l'exemple fictif
await page.goto(`${URL}/exemple`);
await page.getByText("Rang 1").first().waitFor({ timeout: 30000 });
const texteExemple = await page.locator("main").innerText();
ok(texteExemple.includes("FICTIF"), "l'exemple est étiqueté FICTIF");
ok(texteExemple.includes("Alix (FICTIF)") && texteExemple.includes("Camille (FICTIF)") && texteExemple.includes("Sacha (FICTIF)"), "trois candidats fictifs classés");
await capture("01-exemple");
await page.goto(`${URL}/recrutements/rec_exemple_fictif/candidats/cand_exemple_1/analyse`);
await page.getByText("au niveau requis").first().waitFor();
await capture("01b-exemple-analyse");
await page.goto(`${URL}/recrutements/rec_exemple_fictif/classement`);
await page.getByText("Comparaison et classement").waitFor();
await capture("01c-exemple-classement");

// 2. Choisir Serveur, tirage court, passer l'épreuve, niveaux cohérents
await page.goto(`${URL}/metiers/serveur`);
await page.getByRole("link", { name: "Créer un recrutement" }).first().click();
await page.waitForURL(/\/recrutements\/rec_[a-f0-9]+\/preparer\/poste/);
const idRec = page.url().match(/recrutements\/(rec_[a-f0-9]+)/)[1];
console.log("recrutement", idRec);
await page.goto(`${URL}/recrutements/${idRec}/preparer/epreuve`);
await page.getByText("Les portes proposées").waitFor();
const nombres = page.locator('input[type="number"]');
await nombres.nth(0).fill("3");
await nombres.nth(0).blur();
await nombres.nth(1).fill("2");
await nombres.nth(1).blur();
await nombres.nth(2).fill("2");
await nombres.nth(2).blur();
await page.waitForTimeout(300);
await page.goto(`${URL}/recrutements/${idRec}/preparer/verifier`);
await page.getByText("3 choix multiples").first().waitFor();
ok(true, "tirage court : 3 choix multiples");
await capture("02-verifier");
await page.getByRole("button", { name: "Figer l'épreuve et passer aux candidats" }).click();
await page.waitForURL(/\/candidats$/);
await page.getByLabel("Prénom ou code").fill("Test A");
await page.getByRole("button", { name: "Ajouter", exact: true }).click();
await page.getByText("Test A").first().waitFor();
await page.getByRole("button", { name: "Passer l'épreuve sur cet écran" }).click();
await page.waitForURL(/\/passer\//);
await page.getByRole("button", { name: "Commencer" }).click();
for (let i = 0; i < 4; i++) {
  await page.getByText(`Situation ${i + 1} sur 4`).waitFor();
  // Porte 1 pour les deux premières, porte 4 puis porte 3 pour les autres.
  const porte = i < 2 ? "Porte 1" : i === 2 ? "Porte 4" : "Porte 3";
  await page.getByRole("radio", { name: new RegExp(`^${porte}`) }).click();
  if (porte === "Porte 1") {
    const groupes = page.getByRole("radiogroup", { name: /^Question/ });
    const n = await groupes.count();
    ok(n === 3, `3 questions à la porte 1 (situation ${i + 1})`);
    for (let k = 0; k < n; k++) await groupes.nth(k).getByRole("radio").first().click();
  } else if (porte === "Porte 4") {
    // On touche au moins une chose : monter le dernier élément, ou classer / repérer le premier.
    const monter = page.getByRole("button", { name: /^Monter/ });
    if (await monter.count()) await monter.last().click();
    const classer = page.getByRole("radiogroup", { name: /^Catégorie/ });
    if (await classer.count()) for (let k = 0; k < (await classer.count()); k++) await classer.nth(k).getByRole("radio").first().click();
    const reperer = page.getByRole("checkbox");
    if (!(await monter.count()) && !(await classer.count())) await reperer.first().click();
  } else {
    await page.getByRole("radiogroup", { name: "Question de départ" }).getByRole("radio").first().click();
    await page.getByRole("group", { name: "Indices" }).getByRole("checkbox").first().click();
    await page.getByRole("radiogroup", { name: "La suite" }).getByRole("radio").first().click();
  }
  if (i === 0) await capture("03-epreuve-situation");
  await page.getByRole("button", { name: i < 3 ? "Situation suivante →" : "Continuer →" }).click();
}
await page.getByText("Avant de rendre vos réponses").waitFor();
await page.getByRole("button", { name: "Terminer et enregistrer mes réponses" }).click();
await page.getByText("Merci, vos réponses sont enregistrées.").waitFor();
ok(true, "épreuve passée sur cet écran");
await page.goto(`${URL}/recrutements/${idRec}/candidats/`);
await page.getByText("Épreuve rendue").waitFor();
const lienAnalyse = page.getByRole("link", { name: "Analyse" }).first();
await lienAnalyse.click();
await page.waitForURL(/\/analyse$/);
const texteAnalyse = await page.locator("main").innerText();
const niveaux = texteAnalyse.match(/Niveau [1-4] · (Insuffisant|Partiel|Attendu|Remarquable)/g) ?? [];
ok(niveaux.length >= 4, `niveau par compétence affiché (${niveaux.length} pilules)`);
await capture("04-analyse");

// 3. Importer un second candidat via fichier, classement, décision motivée
const reponsesB = await page.evaluate(async (id) => {
  const req = indexedDB.open("ci5p", 1);
  const db = await new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  const etat = await new Promise((res, rej) => {
    const t = db.transaction("donnees").objectStore("donnees").get("etat");
    t.onsuccess = () => res(t.result);
    t.onerror = () => rej(t.error);
  });
  const r = etat.recrutements.find((x) => x.id === id);
  const competences = {};
  for (const c of r.epreuve.competences) {
    const p1 = {};
    for (const q of c.portes.p1.questions) p1[q.id] = q.options.find((o) => o.points === 2).id;
    competences[c.code] = { porte: "p1", p1 };
  }
  return {
    schema: "ci5p-reponses/2",
    recrutement_id: id,
    epreuve_empreinte: r.epreuve.empreinte,
    candidat: { id: null, nom: "Test B (fichier)" },
    rendu_le: new Date().toISOString(),
    competences,
    profil_travail: null,
    besoins: null,
    deroule: null,
  };
}, idRec);
const cheminReponses = join(DOSSIER, "reponses-test-b.json");
writeFileSync(cheminReponses, JSON.stringify(reponsesB, null, 2));
await page.goto(`${URL}/recrutements/${idRec}/candidats`);
await page.getByLabel("Ou le fichier de réponses (.json)").setInputFiles(cheminReponses);
await page.getByText("Réponses de Test B (fichier) importées.").waitFor();
ok(true, "second candidat importé via fichier");
await page.goto(`${URL}/recrutements/${idRec}/classement`);
await page.getByText("Comparaison et classement").waitFor();
const classement = await page.locator("main").innerText();
ok(classement.includes("Test B (fichier)") && classement.includes("Test A"), "classement avec les deux candidats");
ok(classement.indexOf("Test B (fichier)") < classement.indexOf("Test A"), "Test B (meilleures réponses) classé avant Test A");
await capture("05-classement");
await page.getByRole("link", { name: "Test B (fichier)" }).first().click();
await page.waitForURL(/\/analyse$/);
const idCandB = page.url().match(/candidats\/(cand_[a-f0-9]+)/)[1];
await page.goto(`${URL}/recrutements/${idRec}/candidats/${idCandB}/decision`);
await page.getByRole("radio", { name: "Retenu", exact: true }).click();
await page.getByLabel(/Motifs/).fill("Niveau remarquable sur les 4 compétences (meilleures réponses à la porte 1). Vérifié avec les grilles.");
await page.getByRole("button", { name: "Enregistrer la décision" }).click();
await page.getByText("Enregistré.").waitFor();
ok(true, "décision motivée enregistrée");
await capture("06-decision");

// 4. Sauvegarder, vider IndexedDB, restaurer, retrouver les deux candidats
await page.goto(`${URL}/donnees`);
const [telechargement] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Sauvegarder dans un fichier" }).click()]);
const cheminSauvegarde = join(DOSSIER, "sauvegarde.json");
await telechargement.saveAs(cheminSauvegarde);
ok(true, `sauvegarde téléchargée (${telechargement.suggestedFilename()})`);
await page.getByLabel("Je confirme : j'ai sauvegardé ce que je voulais garder.").check();
await page.getByRole("button", { name: "Effacer toutes les données locales" }).click();
await page.getByText("Toutes les données locales ont été effacées.").waitFor();
await page.goto(`${URL}/recrutements`);
await page.getByText("Aucun recrutement pour l'instant").waitFor();
ok(true, "IndexedDB vidée : aucun recrutement");
await page.goto(`${URL}/donnees`);
await page.getByLabel("Fichier de sauvegarde").setInputFiles(cheminSauvegarde);
await page.getByText(/Sauvegarde restaurée/).waitFor();
await page.goto(`${URL}/recrutements/${idRec}/candidats`);
await page.getByText("Test A").first().waitFor();
await page.getByText("Test B (fichier)").first().waitFor();
ok(true, "restauration : les deux candidats sont de retour");
await capture("07-restaure");

// Téléphone 390 px : accueil, exemple, épreuve
const tel = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true });
const pt = await tel.newPage();
await pt.goto(`${URL}/`);
await pt.screenshot({ path: join(DOSSIER, "08-tel-accueil.png"), fullPage: true });
await pt.goto(`${URL}/metiers`);
await pt.getByText("Les métiers").first().waitFor();
await pt.screenshot({ path: join(DOSSIER, "09-tel-metiers.png"), fullPage: false });
await pt.goto(`${URL}/metiers/serveur/essai`);
await pt.getByRole("button", { name: "Commencer" }).click();
await pt.getByRole("radio", { name: /^Porte 4/ }).click();
await pt.screenshot({ path: join(DOSSIER, "10-tel-epreuve-p4.png"), fullPage: true });
await tel.close();

await browser.close();
const vraiesErreurs = erreursConsole.filter((e) => !/favicon|manifest|404/.test(e));
if (vraiesErreurs.length) {
  console.log("Erreurs console :");
  for (const e of vraiesErreurs) console.log("  ", e);
}
console.log(`\nTerminé. Captures dans ${DOSSIER}/`);
