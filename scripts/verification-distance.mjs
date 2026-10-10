/**
 * Vérification de la phase 2 (distance) avec Playwright :
 * lien chiffré → épreuve dans un autre navigateur → code CI5Z → import chez le recruteur,
 * fichier d'épreuve → /e/fichier → fichier de réponses → import,
 * déroulé, profil de travail, détecteur, décrire mon besoin, archive, impression.
 * Usage : npm run build && npm start, puis `node scripts/verification-distance.mjs [url] [chromium]`.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const URL = process.argv[2] ?? "http://localhost:3000";
const EXECUTABLE = process.argv[3] ?? process.env.CHROMIUM_PATH;
const DOSSIER = process.env.CAPTURES ?? "captures-e2e";
mkdirSync(DOSSIER, { recursive: true });
const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
const recruteur = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR", acceptDownloads: true });
const page = await recruteur.newPage();
const requetes = [];
page.on("request", (r) => {
  if (r.method() === "POST") requetes.push({ url: r.url(), corps: r.postData() ?? "" });
});
function ok(c, m) {
  if (!c) throw new Error(`ÉCHEC : ${m}`);
  console.log(`✓ ${m}`);
}

// Décrire mon besoin → recrutement
await page.goto(`${URL}/metiers`);
await page.getByPlaceholder("Un serveur débutant pour le coup de feu, épreuve courte").first().fill("Une aide-soignante en EHPAD, recrutement inclusif, sans écrit si possible");
await page.getByRole("button", { name: "Reconnaître le métier" }).first().click();
await page.getByText("Métier reconnu :").first().waitFor();
const texteBesoin = await page.locator("aside").innerText();
ok(texteBesoin.includes("Aide-soignant") && texteBesoin.includes("« aide-soignante »"), "métier reconnu avec les mots déclencheurs");
ok(texteBesoin.includes("sans écrit"), "réglage « sans écrit » affiché avec son mot");
await page.screenshot({ path: join(DOSSIER, "20-besoin.png"), fullPage: true });
await page.getByRole("button", { name: "Créer le recrutement" }).first().click();
await page.waitForURL(/\/preparer\/poste/);
const idRec = page.url().match(/recrutements\/(rec_[a-f0-9]+)/)[1];

// Profil de travail (phrases) et déroulé
await page.getByRole("checkbox", { name: /Proposer les phrases/ }).check();
await page.goto(`${URL}/recrutements/${idRec}/preparer/epreuve`);
await page.getByRole("checkbox", { name: /Garder la démarche/ }).check();
const texteEpreuve = await page.locator("main").innerText();
ok(texteEpreuve.includes("Phrases à compléter") && !(await page.getByRole("checkbox", { name: /Porte 2/ }).isChecked()), "porte 2 décochée par « sans écrit »");

// Détecteur : une question interdite refusée, une question de métier acceptée
await page.goto(`${URL}/recrutements/${idRec}/preparer/questions`);
const zone = page.getByPlaceholder("Une idée à la fois, sur une situation du poste.").first();
await zone.fill("Avez-vous des enfants à charge ?");
await page.getByRole("button", { name: "Ajouter la question" }).first().click();
await page.getByText("Cette question ne peut pas être enregistrée").waitFor();
ok(true, "détecteur : question sur la famille refusée");
await page.screenshot({ path: join(DOSSIER, "21-detecteur.png"), fullPage: false });
await zone.fill("Un résident refuse sa toilette ce matin. Que faites-vous ?");
await page.getByRole("button", { name: "Ajouter la question" }).first().click();
await page.getByText("Un résident refuse sa toilette ce matin.").first().waitFor();
ok(true, "détecteur : question de métier acceptée");

// Candidat à distance : lien chiffré
await page.goto(`${URL}/recrutements/${idRec}/candidats`);
await page.getByLabel("Prénom ou code").fill("Dist 1");
await page.getByRole("radio", { name: "À distance" }).click();
await page.getByRole("button", { name: "Ajouter", exact: true }).click();
await page.waitForURL(/\/epreuve$/);
await page.getByRole("button", { name: "Créer le lien personnel" }).click();
await page.getByText("Lien créé.").waitFor();
const lien = (await page.locator("p.font-mono").innerText()).trim();
ok(/\/e\/[A-Za-z0-9_-]+#k=[A-Za-z0-9_-]+$/.test(lien), `lien personnel créé : ${lien.slice(0, 60)}…`);
const post = requetes.find((r) => r.url.endsWith("/api/epreuves"));
ok(post && !/points|justes|repere|explication/.test(post.corps) && /"blob":"[A-Za-z0-9_-]+"/.test(post.corps), "le serveur ne reçoit qu'un blob chiffré, sans corrigé");
ok(!lien.includes("?k="), "la clé est dans le fragment, pas dans la query string");
await page.screenshot({ path: join(DOSSIER, "22-lien.png"), fullPage: true });

// Le candidat ouvre le lien dans un autre navigateur (autre contexte)
const candidat = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", isMobile: true, hasTouch: true, acceptDownloads: true });
const pc = await candidat.newPage();
const postsCandidat = [];
pc.on("request", (r) => {
  if (r.method() !== "GET") postsCandidat.push(r.url());
});
await pc.goto(lien);
await pc.getByRole("button", { name: "Commencer" }).waitFor({ timeout: 30000 });
const accueil = await pc.locator("main").innerText();
ok(accueil.includes("Dist 1"), "le candidat voit son prénom (lien personnel)");
ok(accueil.includes("Le déroulé de l'épreuve"), "le déroulé est proposé (refusable)");
await pc.getByRole("radio", { name: "J'accepte" }).click();
await pc.getByRole("button", { name: "Commencer" }).click();
for (let i = 0; i < 4; i++) {
  await pc.getByText(`Situation ${i + 1} sur 4`).waitFor();
  const portes = await pc.getByRole("radiogroup", { name: "Porte" }).getByRole("radio").allInnerTexts();
  ok(!portes.some((p) => p.includes("Porte 2")), `situation ${i + 1} : porte 2 absente`);
  await pc.getByRole("radio", { name: i === 3 ? /^Porte 5/ : /^Porte 1/ }).click();
  if (i === 3) {
    const zones = pc.locator("textarea");
    const n = await zones.count();
    for (let k = 0; k < n; k++) await zones.nth(k).fill("Je préviens l'infirmière et je note ce que le résident m'a dit, avec l'heure. ".repeat(3));
    const oral = pc.getByRole("radio", { name: "À l'oral" });
    await oral.first().click();
  } else {
    const groupes = pc.getByRole("radiogroup", { name: /^Question/ });
    const n = await groupes.count();
    for (let k = 0; k < n; k++) await groupes.nth(k).getByRole("radio").nth(1).click();
  }
  await pc.getByRole("button", { name: i < 3 ? "Situation suivante →" : "Continuer →" }).click();
}
await pc.getByText("Votre façon de travailler (facultatif)").waitFor();
const groupesProfil = pc.getByRole("radiogroup");
const nProfil = await groupesProfil.count();
for (let k = 0; k < nProfil; k++) await groupesProfil.nth(k).getByRole("radio").nth(3).click();
await pc.screenshot({ path: join(DOSSIER, "23-tel-profil.png"), fullPage: true });
await pc.getByRole("button", { name: "Continuer →" }).click();
await pc.getByText("Avant de rendre vos réponses").waitFor();
await pc.getByRole("button", { name: "Terminer et rendre mes réponses" }).click();
await pc.getByText("Merci, votre épreuve est terminée.").waitFor();
const code = await pc.getByLabel("Code de réponses").inputValue();
ok(code.startsWith("CI5Z-") && code.length > 100, `code CI5Z produit (${code.length} caractères)`);
ok(postsCandidat.length === 0, "aucune réponse postée au serveur par le candidat");
await pc.screenshot({ path: join(DOSSIER, "24-tel-fin.png"), fullPage: true });
const [dl] = await Promise.all([pc.waitForEvent("download"), pc.getByRole("button", { name: "Télécharger le fichier de réponses" }).click()]);
const cheminRep = join(DOSSIER, "reponses-dist1.json");
await dl.saveAs(cheminRep);
const repJson = JSON.parse(readFileSync(cheminRep, "utf8"));
ok(repJson.schema === "ci5p-reponses/2" && Array.isArray(repJson.deroule) && repJson.deroule.length > 0 && repJson.profil_travail, "fichier de réponses avec déroulé et profil de travail");
ok(!JSON.stringify(repJson).match(/"(temps|duree|chrono)/), "aucune durée dans les réponses");

// Import du code chez le recruteur
await page.goto(`${URL}/recrutements/${idRec}/candidats`);
await page.getByLabel("Code CI5Z-…").fill(code);
await page.getByRole("button", { name: "Importer le code" }).click();
await page.getByText("Réponses de Dist 1 importées.").waitFor();
ok(true, "code importé, rattaché à Dist 1");
await page.goto(`${URL}/recrutements/${idRec}/candidats`);
await page.getByText("Épreuve rendue").first().waitFor();
ok(true, "Dist 1 : épreuve rendue");

// Fichier d'épreuve → /e/fichier → import du fichier de réponses pour un second candidat
await page.getByLabel("Prénom ou code").fill("Dist 2");
await page.getByRole("radio", { name: "À distance" }).click();
await page.getByRole("button", { name: "Ajouter", exact: true }).click();
await page.waitForURL(/\/epreuve$/);
const [dlEp] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Télécharger le fichier d'épreuve/ }).click()]);
const cheminEp = join(DOSSIER, "epreuve-dist2.json");
await dlEp.saveAs(cheminEp);
const ep = JSON.parse(readFileSync(cheminEp, "utf8"));
ok(!/"(points|justes|repere|explication|regles|accepte|erreur|juste)":/.test(readFileSync(cheminEp, "utf8")), "fichier d'épreuve sans corrigé (aucune clé de corrigé)");
const pc2 = await candidat.newPage();
await pc2.goto(`${URL}/e/fichier`);
await pc2.getByLabel("Fichier d'épreuve").setInputFiles(cheminEp);
await pc2.getByRole("button", { name: "Commencer" }).waitFor();
ok(true, "fichier d'épreuve ouvert sur /e/fichier");
await pc2.getByRole("button", { name: "Commencer" }).click();
for (let i = 0; i < 4; i++) {
  await pc2.getByText(`Situation ${i + 1} sur 4`).waitFor();
  await pc2.getByRole("radio", { name: /^Porte 1/ }).click();
  const groupes = pc2.getByRole("radiogroup", { name: /^Question/ });
  const n = await groupes.count();
  for (let k = 0; k < n; k++) await groupes.nth(k).getByRole("radio").nth(1).click();
  await pc2.getByRole("button", { name: i < 3 ? "Situation suivante →" : "Continuer →" }).click();
}
await pc2.getByRole("button", { name: "Passer cette partie" }).click();
await pc2.getByRole("button", { name: "Terminer et rendre mes réponses" }).click();
const [dl2] = await Promise.all([pc2.waitForEvent("download"), pc2.getByRole("button", { name: "Télécharger le fichier de réponses" }).click()]);
const cheminRep2 = join(DOSSIER, "reponses-dist2.json");
await dl2.saveAs(cheminRep2);
await page.goto(`${URL}/recrutements/${idRec}/candidats`);
await page.getByLabel("Ou le fichier de réponses (.json)").setInputFiles(cheminRep2);
await page.getByText("Réponses de Dist 2 importées.").waitFor();
ok(true, "fichier de réponses importé, rattaché à Dist 2");
void ep;

// Jugement des portes 5, analyse avec déroulé et profil
await page.goto(`${URL}/recrutements/${idRec}/candidats`);
await page.getByRole("link", { name: "Dist 1" }).first().click();
await page.waitForURL(/\/epreuve$/);
const jug = page.getByRole("radio", { name: "Juste (2)" });
const nj = await jug.count();
for (let k = 0; k < nj; k++) await jug.nth(k).click();
await page.screenshot({ path: join(DOSSIER, "25-juger-p5.png"), fullPage: true });
const idDist1 = page.url().match(/candidats\/(cand_[a-f0-9]+)/)[1];
await page.goto(`${URL}/recrutements/${idRec}/candidats/${idDist1}/analyse`);
await page.getByText("au niveau requis").first().waitFor();
const an = await page.locator("main").innerText();
ok(an.includes("Démarche pendant l'épreuve (déroulé)"), "déroulé affiché dans l'analyse, sans temps");
ok(!/\d+ (min|s|secondes|minutes)\b/.test(an.split("Démarche pendant")[1] ?? ""), "pas de durée dans le déroulé");
ok(an.includes("Profil de travail") && an.includes("Plutôt oui"), "profil de travail : phrases « Au travail… » affichées à côté");
await page.screenshot({ path: join(DOSSIER, "26-analyse-distance.png"), fullPage: true });

// Besoins → déroulé non proposé pour Dist 2 (on signale un besoin puis on recrée un lien)
await page.goto(`${URL}/recrutements/${idRec}/candidats`);
await page.getByRole("link", { name: "Dist 2" }).first().click();
await page.waitForURL(/\/candidats\/cand_/);
const idDist2 = page.url().match(/candidats\/(cand_[a-f0-9]+)/)[1];
await page.goto(`${URL}/recrutements/${idRec}/candidats/${idDist2}/besoins`);
await page.getByRole("checkbox", { name: "Une pause" }).check();
await page.waitForTimeout(300);
const cand3 = await recruteur.newPage();
// Dist 3 : besoin signalé avant le lien → le paquet ne propose pas le déroulé.
await cand3.goto(`${URL}/recrutements/${idRec}/candidats`);
await cand3.getByLabel("Prénom ou code").fill("Dist 3");
await cand3.getByRole("radio", { name: "À distance" }).click();
await cand3.getByRole("button", { name: "Ajouter", exact: true }).click();
await cand3.waitForURL(/\/epreuve$/);
const idDist3 = cand3.url().match(/candidats\/(cand_[a-f0-9]+)/)[1];
await cand3.goto(`${URL}/recrutements/${idRec}/candidats/${idDist3}/besoins`);
await cand3.getByRole("checkbox", { name: "Une salle calme" }).check();
await cand3.waitForTimeout(300);
await cand3.goto(`${URL}/recrutements/${idRec}/candidats/${idDist3}/epreuve`);
await cand3.getByRole("button", { name: "Créer le lien personnel" }).click();
await cand3.getByText("Lien créé.").waitFor();
const lien3 = (await cand3.locator("p.font-mono").innerText()).trim();
const pc3 = await candidat.newPage();
await pc3.goto(lien3);
await pc3.getByRole("button", { name: "Commencer" }).waitFor();
ok(!(await pc3.locator("main").innerText()).includes("Le déroulé de l'épreuve"), "déroulé jamais proposé quand un besoin est signalé");

// Archive de fin : sans déroulé ni besoins ; impression : feuille print présente
await page.goto(`${URL}/recrutements/${idRec}/fin`);
const [dlA] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Télécharger l'archive/ }).click()]);
const cheminA = join(DOSSIER, "archive.json");
await dlA.saveAs(cheminA);
const archive = JSON.parse(readFileSync(cheminA, "utf8"));
ok(
  archive.schema === "ci5p-archive/1" &&
    archive.candidats.length >= 2 &&
    archive.candidats.every((c) => !("besoins" in c) && (!c.reponses || (!("deroule" in c.reponses) && !("besoins" in c.reponses))) && "evaluations" in c && "decision" in c),
  "archive : réponses, grilles et motifs, sans déroulé ni besoins des candidats",
);
await page.goto(`${URL}/recrutements/${idRec}/candidats/${idDist1}/entretien`);
await page.emulateMedia({ media: "print" });
const railVisible = await page.locator("nav.rail").isVisible();
ok(!railVisible, "impression : le rail de navigation est masqué");
await page.screenshot({ path: join(DOSSIER, "27-impression-entretien.png"), fullPage: true });
await page.emulateMedia({ media: "screen" });

writeFileSync(join(DOSSIER, "lien.txt"), lien);
await browser.close();
console.log("\nTerminé (phase 2).");
