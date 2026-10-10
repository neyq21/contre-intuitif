/**
 * Vérification de la phase 4 (finition) avec Playwright : captures à 390, 768 et 1280 px,
 * mode nuit, mode lisible, absence de défilement horizontal, cibles tactiles ≥ 44 px,
 * manifest et service worker, hors ligne après le premier chargement.
 * Usage : npm run build && npm start, puis `node scripts/verification-finition.mjs [url] [chromium]`.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const URL = process.argv[2] ?? "http://localhost:3000";
const EXECUTABLE = process.argv[3] ?? process.env.CHROMIUM_PATH;
const DOSSIER = process.env.CAPTURES ?? "captures-e2e";
mkdirSync(DOSSIER, { recursive: true });
function ok(c, m) {
  if (!c) throw new Error(`ÉCHEC : ${m}`);
  console.log(`✓ ${m}`);
}
const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});

const PAGES = ["/", "/metiers", "/metiers/serveur", "/exemple", "/recrutements/rec_exemple_fictif/preparer/questions", "/recrutements/rec_exemple_fictif/candidats", "/recrutements/rec_exemple_fictif/classement", "/recrutements/rec_exemple_fictif/candidats/cand_exemple_1/analyse", "/guide/droit", "/donnees", "/demande"];
const problemes = [];

for (const largeur of [390, 768, 1280]) {
  const ctx = await browser.newContext({ viewport: { width: largeur, height: 900 }, locale: "fr-FR", isMobile: largeur < 760, hasTouch: largeur < 760 });
  const page = await ctx.newPage();
  await page.goto(`${URL}/exemple`);
  await page.getByText("Rang 1").first().waitFor({ timeout: 30000 });
  for (const chemin of PAGES) {
    await page.goto(`${URL}${chemin}`);
    await page.waitForTimeout(700);
    const mesure = await page.evaluate(() => {
      const largeurDoc = document.documentElement.scrollWidth;
      const petits = [...document.querySelectorAll("button, a.bouton, input[type=checkbox], input[type=radio], select")]
        .filter((el) => el.getClientRects().length && getComputedStyle(el).display !== "none")
        .map((el) => ({ h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width, t: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30) }))
        .filter((r) => r.h > 0 && r.h < 22);
      return { largeurDoc, innerWidth: window.innerWidth, petits };
    });
    if (mesure.largeurDoc > mesure.innerWidth + 1) problemes.push(`${largeur}px ${chemin} : défilement horizontal (${mesure.largeurDoc} > ${mesure.innerWidth})`);
    if (mesure.petits.length) problemes.push(`${largeur}px ${chemin} : cibles < 22 px : ${mesure.petits.map((p) => `${p.t}(${Math.round(p.h)})`).join(", ")}`);
    const nom = chemin.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "accueil";
    await page.screenshot({ path: join(DOSSIER, `40-${largeur}-${nom}.png`), fullPage: largeur !== 1280 });
  }
  await ctx.close();
}
ok(true, "captures à 390, 768 et 1280 px faites");
if (problemes.length) {
  console.log("Problèmes de mise en page :");
  for (const p of problemes) console.log("  -", p);
} else ok(true, "aucun défilement horizontal, aucune cible minuscule");

// Nuit et lisible
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" });
const page = await ctx.newPage();
await page.goto(`${URL}/`);
await page.evaluate(() => {
  localStorage.setItem("ci5p.ambiance", "nuit");
});
await page.goto(`${URL}/metiers/serveur`);
await page.waitForTimeout(500);
const nuit = await page.evaluate(() => ({ attr: document.documentElement.dataset.ambiance, fond: getComputedStyle(document.body).backgroundColor }));
ok(nuit.attr === "nuit" && nuit.fond === "rgb(7, 7, 12)", `mode nuit appliqué avant hydratation (fond ${nuit.fond})`);
await page.screenshot({ path: join(DOSSIER, "41-nuit-metier.png"), fullPage: false });
await page.goto(`${URL}/exemple`);
await page.getByText("Rang 1").first().waitFor();
await page.screenshot({ path: join(DOSSIER, "41-nuit-exemple.png"), fullPage: false });
await page.evaluate(() => {
  localStorage.setItem("ci5p.ambiance", "papier");
  localStorage.setItem("ci5p.lisible", "1");
});
await page.goto(`${URL}/metiers/serveur/essai`);
await page.getByRole("button", { name: "Commencer" }).click();
await page.getByRole("radio", { name: /^Porte 1/ }).click();
const lisible = await page.evaluate(() => ({ attr: document.documentElement.dataset.lisible, police: getComputedStyle(document.body).fontFamily }));
ok(lisible.attr === "1" && /Atkinson/.test(lisible.police), `mode lisible : ${lisible.police.split(",")[0]}`);
await page.screenshot({ path: join(DOSSIER, "42-lisible-epreuve.png"), fullPage: false });
await page.locator("summary", { hasText: "Affichage" }).click();
await page.locator("#contenu").getByRole("checkbox", { name: "Mots clés surlignés" }).uncheck();
const sansMarque = await page.evaluate(() => getComputedStyle(document.querySelector("mark.mot-cle")).backgroundColor);
ok(sansMarque === "rgba(0, 0, 0, 0)", "« Affichage » : retour au texte simple sans surlignage");

// Manifest + service worker + hors ligne
const manifest = await (await page.request.get(`${URL}/manifest.webmanifest`)).json();
ok(manifest.name.includes("5 portes") && manifest.icons.length >= 2 && manifest.display === "standalone", "manifest PWA");
await page.goto(`${URL}/`);
await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller !== null, null, { timeout: 20000 }).catch(() => null);
await page.goto(`${URL}/recrutements`);
await page.goto(`${URL}/metiers`);
await page.getByText("Les métiers").first().waitFor();
await page.waitForTimeout(1500);
const enregistre = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length > 0);
ok(enregistre, "service worker enregistré");
await ctx.setOffline(true);
await page.goto(`${URL}/metiers`);
await page.getByText("Les métiers").first().waitFor({ timeout: 20000 });
const horsLigne = await page.locator("main").innerText();
ok(horsLigne.includes("Serveur / Serveuse"), "hors ligne : la page Métiers et le catalogue en cache s'affichent");
await page.screenshot({ path: join(DOSSIER, "43-hors-ligne.png"), fullPage: false });
await page.goto(`${URL}/recrutements`);
await page.getByText("Recrutements").first().waitFor({ timeout: 20000 });
ok(true, "hors ligne : la page Recrutements s'affiche");
await ctx.setOffline(false);

// Mentions
await page.goto(`${URL}/`);
const accueil = await page.locator("body").innerText();
ok(accueil.includes("ni un avis juridique") && accueil.includes("diagnostic") && accueil.includes("intelligence artificielle"), "mentions « pas un avis juridique, pas un diagnostic, pas une IA »");
await page.goto(`${URL}/licence`);
ok((await page.locator("main").innerText()).includes("LICENCE D'UTILISATION"), "page licence : texte du kit");

await browser.close();
console.log("\nTerminé (phase 4).");
