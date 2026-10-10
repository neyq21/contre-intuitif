"use client";

/** « Données et réglages » : sauvegarde, restauration, import de métier, licence, effacement. */
import { useState } from "react";
import { useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { Bouton, Chargement, Message, formaterDateHeure, lireFichier, telecharger } from "@/composants/ui";
import { exporterSauvegarde, importerPack, importerSauvegarde, lireJson, nomFichier } from "@/lib/fichiers/formats";
import { Ambiance } from "@/composants/Ambiance";

export function Donnees() {
  const { etat, pret, catalogue, etatCatalogue, modifier, remplacerEtat, effacerTout, rafraichirCatalogue } = useDonnees();
  const [message, setMessage] = useState<{ type: "info" | "alerte" | "succes"; texte: string } | null>(null);
  const [confirmeEffacer, setConfirmeEffacer] = useState(false);
  const [codeLicence, setCodeLicence] = useState("");
  const [enCours, setEnCours] = useState(false);

  if (!pret || !etat) return <Chargement />;
  const nbRec = etat.recrutements.length;
  const nbCand = etat.candidats.length;

  function sauvegarder() {
    if (!etat) return;
    telecharger(nomFichier("sauvegarde-5-portes"), exporterSauvegarde(etat));
    setMessage({ type: "succes", texte: "Sauvegarde téléchargée. Rangez ce fichier dans un dossier à accès restreint : il contient les réponses des candidats." });
  }

  async function restaurer(f: File | undefined) {
    if (!f) return;
    const json = lireJson(await lireFichier(f));
    if (!json.ok) return setMessage({ type: "alerte", texte: json.erreur });
    const r = importerSauvegarde(json.valeur);
    if (!r.ok) return setMessage({ type: "alerte", texte: r.erreur });
    await remplacerEtat(r.valeur);
    setMessage({
      type: "succes",
      texte: `Sauvegarde restaurée : ${r.valeur.recrutements.length} recrutement${r.valeur.recrutements.length > 1 ? "s" : ""}, ${r.valeur.candidats.length} candidat${r.valeur.candidats.length > 1 ? "s" : ""}.${r.avertissements.length ? " " + r.avertissements.join(" ") : ""}`,
    });
  }

  async function importerMetier(f: File | undefined) {
    if (!f) return;
    const json = lireJson(await lireFichier(f));
    if (!json.ok) return setMessage({ type: "alerte", texte: json.erreur });
    const r = importerPack(json.valeur);
    if (!r.ok) return setMessage({ type: "alerte", texte: r.erreur });
    await modifier((e) => {
      e.metiers_importes = [...e.metiers_importes.filter((p) => p.id !== r.valeur.id), r.valeur];
    });
    setMessage({ type: "succes", texte: `Métier « ${r.valeur.nom} » importé (version ${r.valeur.version}).${r.avertissements.length ? " " + r.avertissements.join(" ") : ""}` });
  }

  async function enregistrerLicence(e: React.FormEvent) {
    e.preventDefault();
    const code = codeLicence.trim().toUpperCase();
    if (!code) return;
    setEnCours(true);
    try {
      const rep = await fetch(`/api/licences/${encodeURIComponent(code)}`, { cache: "no-store" });
      if (rep.status === 404) {
        setMessage({ type: "alerte", texte: "Ce code de licence n'est pas reconnu ou a été révoqué." });
        return;
      }
      if (!rep.ok) throw new Error(String(rep.status));
      const l = (await rep.json()) as { code: string; type: string; nom: string };
      await modifier((et) => void (et.reglages.licence = { code: l.code, type: l.type, nom: l.nom, enregistree_le: new Date().toISOString() }));
      setCodeLicence("");
      setMessage({ type: "succes", texte: "Licence enregistrée sur cet ordinateur. Rien n'a été téléversé : ce code ne sert pas de compte." });
    } catch {
      setMessage({ type: "alerte", texte: "Serveur injoignable : réessayez plus tard. Vos données locales ne sont pas concernées." });
    } finally {
      setEnCours(false);
    }
  }

  async function effacer() {
    await effacerTout();
    setConfirmeEffacer(false);
    setMessage({ type: "info", texte: "Toutes les données locales ont été effacées." });
  }

  return (
    <div className="space-y-8 max-w-[48rem]">
      <header className="space-y-2">
        <h1 className="text-4xl">Données et réglages</h1>
        <p className="text-texte-2">
          Tout est enregistré dans ce navigateur, sur cet ordinateur : {nbRec} recrutement{nbRec > 1 ? "s" : ""}, {nbCand} candidat{nbCand > 1 ? "s" : ""}, {etat.metiers_importes.length} métier{etat.metiers_importes.length > 1 ? "s" : ""} importé{etat.metiers_importes.length > 1 ? "s" : ""}. Rien n&apos;est envoyé à Contre-Intuitif.
        </p>
      </header>
      {message ? <Message type={message.type}>{message.texte}</Message> : null}

      {etat.reglages.licence ? (
        <div className="encart">
          Licence {etat.reglages.licence.type === "entreprise" ? "Entreprise" : "Solo"} enregistrée sur cet ordinateur ({etat.reglages.licence.nom}, code {etat.reglages.licence.code}).
        </div>
      ) : null}

      <section className="carte space-y-3">
        <h2 className="text-2xl">Sauvegarder dans un fichier</h2>
        <p className="aide">Effacer les données de navigation peut effacer les données du kit : sauvegardez avant. Pour changer d&apos;ordinateur ou de navigateur : sauvegardez, puis « Restaurer une sauvegarde » sur l&apos;autre poste.</p>
        <Bouton variante="principal" onClick={sauvegarder}>
          Sauvegarder dans un fichier
        </Bouton>
        <p className="text-sm text-texte-2">Dernière modification : {formaterDateHeure(etat.modifie_le)}</p>
      </section>

      <section className="carte space-y-3">
        <h2 className="text-2xl">Restaurer une sauvegarde</h2>
        <p className="aide">Remplace les données de cet ordinateur par celles du fichier (format ci5p-sauvegarde/2, y compris celles exportées par l&apos;ancien kit HTML).</p>
        <label className="block">
          <span className="visuellement-cache">Fichier de sauvegarde</span>
          <input type="file" accept="application/json,.json" className="champ" onChange={(e) => restaurer(e.target.files?.[0])} />
        </label>
      </section>

      <section className="carte space-y-3">
        <h2 className="text-2xl">Importer un métier</h2>
        <p className="aide">Un fichier .json au format ci5p-pack/3, par exemple le métier créé pour vous après une demande. Il s&apos;ajoute au catalogue de cet ordinateur.</p>
        <label className="block">
          <span className="visuellement-cache">Fichier de métier</span>
          <input type="file" accept="application/json,.json" className="champ" onChange={(e) => importerMetier(e.target.files?.[0])} />
        </label>
        {etat.metiers_importes.length ? (
          <ul className="text-sm space-y-1">
            {etat.metiers_importes.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="flex-1">
                  {p.nom} · version {p.version}
                </span>
                <Bouton variante="discret" className="min-h-9 text-sm" onClick={() => modifier((e) => void (e.metiers_importes = e.metiers_importes.filter((x) => x.id !== p.id)))}>
                  Retirer
                </Bouton>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="carte space-y-3">
        <h2 className="text-2xl">Catalogue</h2>
        <p className="text-sm">
          {etatCatalogue.texte}
          {catalogue ? ` ${catalogue.metiers.length} métiers publiés, dernière publication le ${formaterDateHeure(catalogue.publie_le)}.` : ""}
        </p>
        <Bouton onClick={rafraichirCatalogue}>Vérifier les mises à jour</Bouton>
        <p className="aide">Le dernier catalogue publié est gardé en cache : l&apos;application fonctionne hors ligne après le premier chargement. Les recrutements déjà figés gardent leurs questions.</p>
      </section>

      <section className="carte space-y-3">
        <h2 className="text-2xl">Licence</h2>
        <p className="aide">Collez le code reçu avec votre licence. Il affiche un bandeau sur cet ordinateur ; il ne téléverse pas vos données et ne sert pas de compte.</p>
        <form onSubmit={enregistrerLicence} className="flex flex-wrap gap-2">
          <label className="flex-1 min-w-[12rem]">
            <span className="visuellement-cache">Code de licence</span>
            <input className="champ" value={codeLicence} onChange={(e) => setCodeLicence(e.target.value)} placeholder="Code de licence" />
          </label>
          <Bouton type="submit" disabled={!codeLicence.trim() || enCours}>
            Enregistrer
          </Bouton>
          {etat.reglages.licence ? (
            <Bouton variante="discret" onClick={() => modifier((e) => void (e.reglages.licence = null))}>
              Retirer la licence
            </Bouton>
          ) : null}
        </form>
      </section>

      <section className="carte space-y-3">
        <h2 className="text-2xl">Vous, qui recrutez</h2>
        <div className="grid gap-3 tel:grid-cols-2">
          <label className="block">
            <span className="etiquette">Votre prénom (pour signer les notes)</span>
            <input className="champ" defaultValue={etat.reglages.nom_recruteur} onBlur={(e) => modifier((et) => void (et.reglages.nom_recruteur = e.target.value))} />
          </label>
          <label className="block">
            <span className="etiquette">Entreprise (pour les e-mails)</span>
            <input className="champ" defaultValue={etat.reglages.entreprise} onBlur={(e) => modifier((et) => void (et.reglages.entreprise = e.target.value))} />
          </label>
          <label className="block tel:col-span-2">
            <span className="etiquette">E-mail où les candidats à distance renvoient leur code (facultatif, mis dans le lien et le fichier d&apos;épreuve)</span>
            <input className="champ" type="email" defaultValue={etat.reglages.email_retour ?? ""} onBlur={(e) => modifier((et) => void (et.reglages.email_retour = e.target.value.trim()))} />
          </label>
        </div>
      </section>

      <section className="carte space-y-3">
        <h2 className="text-2xl">Affichage</h2>
        <Ambiance />
      </section>

      <section className="carte space-y-3 border-rouge">
        <h2 className="text-2xl">Tout effacer sur cet ordinateur</h2>
        <p className="aide">Supprime les recrutements, les candidats, les métiers importés et le cache du catalogue. Sauvegardez d&apos;abord.</p>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1" checked={confirmeEffacer} onChange={(e) => setConfirmeEffacer(e.target.checked)} />
          <span>Je confirme : j&apos;ai sauvegardé ce que je voulais garder.</span>
        </label>
        <Bouton variante="alerte" disabled={!confirmeEffacer} onClick={effacer}>
          Effacer toutes les données locales
        </Bouton>
      </section>
    </div>
  );
}
