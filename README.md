# La méthode des 5 portes · application

Application web de la méthode des 5 portes (Contre-Intuitif, kit v5), construite d'après `docs/PROMPT-CLAUDE-CODE.md` et le cahier des charges `contenu/LISEZ-MOI.txt`.

- **Recruteur** : pas de compte. Tout le recrutement reste dans le navigateur (IndexedDB `ci5p`, magasin `donnees`). Rien n'est envoyé au serveur.
- **Candidat** : pas de compte. Lien chiffré ou fichier d'épreuve ; réponses rendues par code `CI5Z-…` ou fichier.
- **Admin** : un compte, `/admin`. Catalogue, textes et barèmes, demandes de métier, licences, journal, vidéo. Jamais de candidat.

Aucune intelligence artificielle, aucun chronomètre, aucun traceur.

## Lancer

```bash
npm install
cp .env.example .env.local   # facultatif : les valeurs par défaut sont celles du prompt
npm run dev                  # http://localhost:3000
```

La base SQLite `data/admin.sqlite` est créée et seedée depuis `contenu/` au premier lancement. Le compte admin initial vient de `lib/reglages.ts` (ou des variables d'environnement) : changez le mot de passe dès la première connexion (`/admin/compte`).

Vidéo : déposez `Presentation-kit-5-portes.mp4` dans `public/` (ou via `/admin/video`). Sans fichier, le bouton n'apparaît pas.

## Vérifier

```bash
npm test          # Vitest : notation, tirage, formats, besoin, détecteur, délais, contenu, seed
npm run lint
npm run build
```

Vérifications en navigateur (Playwright, à installer à part : `npm i -D playwright`, puis `npm run build && npm start`) :

```bash
node scripts/verification-e2e.mjs        # définition de fini 1 à 4 (recruteur), ordinateur + 390 px
node scripts/verification-distance.mjs   # phase 2 : lien chiffré, fichier, code, déroulé, archive…
node scripts/verification-admin.mjs      # définition de fini 5 à 7 (admin)
node scripts/verification-finition.mjs   # 390 / 768 / 1280 px, nuit, lisible, PWA, hors ligne
```

Les scripts prennent l'URL puis le chemin de Chromium en arguments. `verification-admin.mjs` suppose une base fraîche (supprimez `data/admin.sqlite` avant).

## À vérifier à la main, phase par phase

- **Phase 0** : accueil avec les textes de `base.json`, ambiances papier / nuit, mode lisible, `data/admin.sqlite` créée.
- **Phase 1** : « Voir un exemple rempli » ; Métiers → Serveur → « Essayer comme un candidat » ; créer un recrutement, choisir les questions, figer ; passer l'épreuve sur cet écran ; analyse, entretien, décision, classement ; sauvegarde, effacement, restauration.
- **Phase 2** : lien personnel (ouvert dans un autre navigateur), fichier d'épreuve sur `/e/fichier`, retour par code et par fichier, questions du recruteur et détecteur, « Décrire mon besoin », profil de travail, déroulé (refusable, jamais si besoin signalé), archive de fin, impression des fiches.
- **Phase 3** : connexion admin, dépublier un métier (disparaît du catalogue recruteur, recrutement figé intact), éditer un métier publié (version +1), demande de métier reçue puis livrée, code licence Entreprise accepté dans « Données ».
- **Phase 4** : 390 / 768 / 1280 px, mode nuit, mode lisible, installation PWA, hors ligne après un premier chargement, page licence, mentions légales.

## Arborescence

```
app/(recruteur)/   accueil, métiers, recrutements, guide, données, exemple, demande, licence
app/admin/         login + studio de contenu
app/e/[token]/     épreuve candidat sans compte ; app/e/fichier
app/passer/        épreuve sur l'ordinateur du recruteur
app/api/           catalogue public, demandes, épreuves chiffrées, licences, admin
lib/methode/       notation, tirage, épreuve, analyse, besoin, détecteur, e-mails, délais
lib/stockage/      IndexedDB recruteur, SQLite admin, modèle, recrutements
lib/fichiers/      formats ci5p-*, code CI5Z, chiffrement AES-GCM
contenu/           JSON du kit (source du seed), LICENCE, LISEZ-MOI
```

Les écarts avec `LISEZ-MOI.txt` sont dans `ECARTS.md`.

## Mettre en ligne (Fly.io)

Le dépôt contient `Dockerfile` et `fly.toml` : la base SQLite et la vidéo vivent sur le volume `data` (monté dans `/data`), donc survivent aux redéploiements.

Depuis « Launch from GitHub » sur fly.io : choisir le dépôt, la branche, la région `cdg`, port interne `3000`, machine `shared-cpu-1x` / 1 Go, **pas** de PostgreSQL, et ajouter les variables :

| Clé | Valeur |
|---|---|
| `URL_PUBLIQUE` | `https://<nom-de-l-app>.fly.dev` (ou votre domaine) |
| `EMAIL_ADMIN` | votre e-mail admin |
| `MOT_DE_PASSE_INITIAL` | un mot de passe long (à changer ensuite dans Admin → Compte) |
| `EMAIL_DEMANDES_METIER` | e-mail qui reçoit les demandes |
| `NOM_JURIDIQUE` | nom sur la licence |
| `SITE_CONTACT` | adresse de la page contact |

Puis « Déployer ». Pour un domaine personnalisé : `fly certs add kit.votre-domaine.fr` et un enregistrement DNS CNAME vers `<nom-de-l-app>.fly.dev`.
