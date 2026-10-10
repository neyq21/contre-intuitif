# Prompt Claude Code — La méthode des 5 portes, v5 → application

Lis ce fichier en entier avant d'écrire du code. Puis exécute les phases dans l'ordre. Ne pose pas de question dont la réponse est déjà dans RÉGLAGES ou dans les INTERDITS. Si un fichier cité manque, dis lequel et continue avec le reste.

---

## RÉGLAGES (déjà tranchés)

```
EMAIL_ADMIN            = enselme.anthony@outlook.fr
MOT_DE_PASSE_INITIAL   = Neyqanthony21-
URL_PUBLIQUE           = http://localhost:3000
EMAIL_DEMANDES_METIER  = enselme-anthony@outlook.fr
NOM_JURIDIQUE          = Contre-Intuitif
SITE_CONTACT           = https://0tqs6b-rg.myshopify.com/password
LANGUE                 = français uniquement
POLICES                = Geist (UI), Instrument Serif (titres), Atkinson Hyperlegible (mode lisible)
```

Décisions de produit, ne pas les rediscuter :

1. Une seule application web, utilisable au clavier et à la souris sur ordinateur, et qui se réorganise correctement sur téléphone (largeur < 760 px). Pas d'Electron, pas d'application native. Une PWA installable est suffisante en phase 4.
2. Deux espaces, pas deux produits.
   - **Recruteur** : pas de compte. Tout le recrutement (candidats, réponses, notes, décisions, déroulé) reste dans le navigateur (IndexedDB). Rien de tout cela n'est envoyé au serveur.
   - **Admin** : un compte (toi). Tu gères le catalogue, les textes, les demandes de métier et les licences. Tu ne vois jamais les réponses ni l'identité des candidats.
3. **Candidat** : pas de compte. Il ouvre un lien ou un fichier d'épreuve. Ses réponses restent dans son navigateur jusqu'à ce qu'il te les rende (code `CI5Z-…` ou fichier). Le serveur ne les stocke pas.
4. Le hors-ligne du recruteur doit marcher après le premier chargement du catalogue : le dernier catalogue publié est mis en cache.
5. Aucune intelligence artificielle. Aucun appel à un modèle de langage. La phrase « Décrire mon besoin » fonctionne par mots-clés et synonymes, et chaque réglage affiche les mots qui l'ont déclenché.
6. Ne pas « moderniser » la méthode. Le calcul des niveaux, les textes juridiques, les e-mails et les questions se recopient. On peut seulement les éditer plus tard dans l'admin.
7. Compatible avec les fichiers du kit v5 : `ci5p-pack/3` (et `/2` si le champ existe), `ci5p-sauvegarde/2`, `ci5p-reponses/2`, `ci5p-archive/1`. Une sauvegarde exportée par l'ancien HTML doit se restaurer.

Identité visuelle, déjà dans le kit, à reprendre telle quelle :

```
nuit #07070C   craie #F5F3EF   lime #D4FF3A   rouge #FF5A3C
papier #FAF7EF  encre #14141C   mousse #3F4E00
niveaux : 1 #8A2412 / fond #FFE3DC · 2 #7A4A00 / #FFEDCC · 3 #3A4800 / #E6F6AE · 4 #2F3FA8 / #E4E8FF
rayons 10 / 16 / 26 px · pilule 999 px
deux ambiances : papier (clair, défaut) et nuit (sombre), plus un mode « lisible » Atkinson
```

Slogan : « Changez le test. Pas la personne. »
Sous-titre : « Recruter les talents neurodivergents en changeant le test, pas la personne. »

---

## FICHIERS DANS CE DOSSIER

- `LISEZ-MOI.txt` — comportement attendu du recruteur. C'est le cahier des charges fonctionnel. En cas de doute, il gagne sur ta mémoire.
- `LICENCE.txt` — à afficher dans l'application, ne pas la réécrire.
- `contenu/base.json` — tout ce qui n'est pas un métier : portes, niveaux, compétences transverses, barèmes, profil de travail, e-mails, guide, 49 sources, checklist, besoins, « ne pas noter », secteurs, catalogue.
- `contenu/packs/<id>.json` — 33 métiers au schéma `ci5p-pack/3`.
- `contenu/index.json` — liste des ids.
- `Presentation-kit-5-portes.mp4` — seulement s'il est présent. Sinon, masquer le bouton vidéo sans inventer une vidéo.

Ne reparse pas un HTML minifié. Ces JSON sont la source de contenu.

---

## STACK (imposée)

- Next.js (App Router) + TypeScript + Tailwind. Pas de TanStack Start.
- Données admin : SQLite locale (`better-sqlite3` ou `drizzle` + `libsql`) dans `data/admin.sqlite`, créée au premier lancement, seedée depuis `contenu/`.
- Données recruteur : IndexedDB dans le navigateur, une base `ci5p`, magasin `donnees`. Prévoir l'import de l'ancienne clé `localStorage["ci5p.v2.donnees"]` si on te la fournit plus tard ; le format de fichier de sauvegarde suffit pour la v1.
- Auth admin : un seul utilisateur, e-mail + mot de passe hashé (argon2 ou bcrypt), cookie de session httpOnly. Pas de service d'auth externe.
- Pas de Supabase, pas de Firebase, pas de Prisma-sur-Postgres, tant que `URL_PUBLIQUE` est localhost. L'hébergement public sera une phase ultérieure, hors de ce prompt.
- Tests : Vitest. Au minimum les fonctions de notation, le tirage des questions, et l'import/export des 4 formats de fichiers.
- UI : composants React serveur là où il n'y a pas d'état, composants client pour l'épreuve, le classement et l'admin. Accessible : focus visible, cibles tactiles ≥ 44 px, contrastes du kit, tout le parcours au clavier.

Arborescence cible :

```
app/
  (recruteur)/          accueil, métiers, recrutements, guide, données
  admin/                login + studio de contenu
  e/[token]/            épreuve candidat sans compte
  api/                  catalogue public, demandes de métier, session admin
lib/
  methode/              notation, tirage, mots-clés, détecteur de questions interdites
  stockage/             IndexedDB recruteur, sqlite admin
  fichiers/             import export des formats ci5p-*
contenu/                les JSON fournis, lus au seed, plus versionnés
```

---

## MODÈLE DE CONTENU (ne pas l'aplatir)

Un métier (`contenu/packs/*.json`) :

- `schema` `ci5p-pack/3`, `id`, `version`, `nom`, `secteur`, `alias[]`, `resume`, `contexte`, `cadre`, `competences[4]`, `entretien[8]`, `_pv` (empreinte, à recalculer si le contenu change, ne pas l'inventer à la main).
- Chaque compétence : `code` (C1–C8), `titre`, `pourquoi`, `niveau_requis` (1–4), `situation` `{titre, texte, document}`, `portes` `{p1,p2,p3,p4,p5}`, `integration[]`, `banque` optionnelle.
- Porte 1, dans la compétence : `questions[]` de `{id, texte, options[{id, texte, points, repere}]}`. `points` vaut 0, 1 ou 2.
- Porte 2 : `debuts[]` de `{id, debut, justes[{texte, repere}], partielles?, eviter?}` plus `bonus[]`.
- Porte 3 : `reponse`, `question.options`, `indices.options`, `suite.options`, `explication`.
- Porte 4 : `type` = `ordonner` | `classer` | `reperer`, plus `titre`, `consigne`, `elements`, `regles` ou grilles selon le type, `repere_reussite`, `repere_echec`, `reel` `{consigne, criteres, bonus}` pour la variante en situation réelle.
- Porte 5 : `questions[]` comme la porte 2 (texte libre, plusieurs réponses justes) plus `bonus[]`.
- `banque` : questions supplémentaires, mêmes formes, plus `angles` et `entretien[]`. Huit métiers ont une banque (10 questions de p1, 6 de p2, 5 versions de p3, 5 de p4, 6 de p5, 5 d'entretien, **par compétence**, soit sur le métier entier environ 20 / 12 / 16 / 16 / 12 / 12 car 4 compétences × la moitié est déjà dans `portes` ; vérifie les comptes réels dans les JSON, ne les invente pas). Les 25 autres métiers n'ont pas de `banque` : l'épreuve utilise `portes` et `entretien` seulement, et le bouton « Autre tirage » est inactif ou le dit clairement.
- Entretien de base : `{id, competence, texte, suite[], attendus[], relance, alternative}`.

`contenu/base.json` contient notamment :

- `portes[5]` : id p1–p5, nom, texte candidat, texte recruteur, durée indicative. La durée n'est jamais un chronomètre.
- `niveaux` : 1 Insuffisant, 2 Partiel, 3 Attendu, 4 Remarquable.
- `competences` transverses C1–C8, `reperes[]` `{id, comp, sens, label, retour}` — les `repere` des options pointent vers ces ids.
- `baremes` : textes et seuils. Les implémenter exactement, avec des tests.
- `profil_travail` : 8 dimensions, 20 items « Au travail… », échelle de 5 + « Je ne sais pas », `max_essentiels` = 3, `defauts` par id de métier.
- `profils` : autisme, TDAH, dys, HPI, hypersensible. Ce sont des aides d'accueil, jamais une case à cocher sur le candidat, jamais un score.
- `emails[8]`, `checklist`, `besoins[14]`, `ne_pas_noter[14]`, `a_eviter`, `guide`, `sources[49]`, `secteurs[12]`, `domaines_a_venir`, `catalogue`.

Huit métiers « les plus recrutés » (BMO 2026), dans `catalogue.plus_recrutes` : employe-restauration, serveur, ouvrier-agricole, agent-entretien, aide-domicile, aide-soignant, employe-libre-service, cuisinier. Ce sont aussi les huit qui ont une banque.

Promesse catalogue, à afficher sans la durcir ni l'adoucir : métier créé sous 72 h ouvrées après réception d'une demande complète. Objectif 100 métiers, par lots de 20, sans date promise.

---

## RÈGLES DE NOTATION (tests obligatoires)

Écris `lib/methode/notation.ts` et des tests qui collent aux textes de `base.baremes`. Résumé à ne pas contredire :

- **P1.** Meilleure réponse 2, acceptable 1, sinon 0. Le total est ramené sur 10. Seuils : ≥ 9 niveau 4 ; ≥ 7 niveau 3 ; ≥ 5 niveau 2 ; sinon 1. Vaut pour 3 à 10 questions.
- **P2 et P5.** Juste 2, partielle 1, à éviter ou vide 0. Avec 3 phrases : 5–6 → niveau 3, et 4 si un bonus est présent ; 3–4 → 2 ; 0–2 → 1. Avec 2 à 6 phrases : niveau 3 à partir des cinq sixièmes des points, niveau 2 à partir de la moitié. Même règle pour une question écrite par le recruteur, qui n'a pas de réponse prévue : la personne qui évalue choisit juste / partielle / à éviter.
- **P3.** Question de départ sur 2, indices (1 par indice juste, −1 par indice faux, minimum 0), suite sur 2. Total 7 → 4 ; 5–6 → 3 ; 3–4 → 2 ; 0–2 → 1.
- **P4.** Score corrigé du hasard, de 0 à 1. ≥ 0,85 → 4 ; ≥ 0,6 → 3 ; ≥ 0,3 → 2 ; sinon 1. Ordonner = part des règles d'ordre respectées. Classer = part des éléments bien classés. Repérer = erreurs trouvées moins fausses alertes. Plusieurs ordres justes sont acceptés. Variante réelle : 4 critères → 3, ou 4 avec le bonus ; 2–3 → 2 ; 0–1 → 1.
- **Entretien.** Niveau 1 à 4 choisi par l'évaluateur avec les ancres. Les attendus cochés sont des repères (tous → 3 ; au moins la moitié → 2), pas un calcul qui remplace le jugement.
- Le niveau affiché d'une compétence combine les portes passées selon la règle déjà écrite dans `guide` (« Comment les analyses sont calculées »). Lis `base.guide` et implémente cette règle, ne la remplace pas par une moyenne naïve. Si le guide et le code historique divergent, suis le guide et signale l'écart dans `ECARTS.md`.
- Le profil de travail, les phrases « Au travail… », la porte choisie, le déroulé et le temps ne entrent jamais dans le niveau ni dans le classement.
- Le temps n'est jamais mesuré : pas de chronomètre, pas de durée enregistrée, pas de « temps restant ».

---

## RÈGLES DE TIRAGE

Pour un recrutement, le recruteur choisit :

- les compétences mesurées (celles du métier, 4 au plus) ;
- les portes proposées : au moins 3, dont une sans rédaction libre (p1, p3 ou p4) ;
- le nombre de questions : p1 de 3 à 10 (défaut 5) ; p2 et p5 de 2 à 6 (défaut 3) ; p3 et p4 : une version ;
- « Autre tirage » : un autre sous-ensemble, déterministe à partir d'une graine stockée sur le recrutement ;
- toutes les personnes d'un même recrutement ont exactement les mêmes questions ;
- dès qu'un candidat a commencé l'épreuve, les questions sont figées. Pour en changer : dupliquer le recrutement (sans les candidats).

Questions du recruteur : jusqu'à 2 par porte aux portes 2 et 5, jusqu'à 3 par compétence à l'entretien. Avant de les enregistrer, passe-les dans un détecteur (liste de motifs, pas une IA) qui signale santé, handicap, RQTH, diagnostic, traitement, famille, grossesse, âge, origine, nationalité, religion, opinions, syndicat, vie privée. La seule question permise sur l'aménagement est : « De quoi avez-vous besoin pour que l'entretien se passe bien ? », avec la liste `besoins`. Aucune question ne demande un diagnostic.

« Décrire mon besoin » : une phrase. Le métier est reconnu par `alias` et des synonymes explicites (table dans le code, alimentée par les alias des packs). Exemples qui doivent marcher, issus du kit : « Un serveur débutant pour le coup de feu, épreuve courte » ; « Une aide-soignante en EHPAD, recrutement inclusif, sans écrit si possible » ; « Un agent d'entretien fiable pour des bureaux le soir, épreuve courte ». Affiche chaque réglage avec les mots qui l'ont déclenché. Si rien n'est reconnu, ne devine pas : propose la liste des métiers.

---

## ESPACE RECRUTEUR (parité avec le kit v5)

Routes, à reprendre dans cet esprit (URLs propres, pas des hash) :

- `/` accueil
- `/metiers` et `/metiers/[id]` et `/metiers/domaine/[id]`
- `/recrutements` et `/recrutements/[id]`
- `/recrutements/[id]/preparer/[etape]` avec les 6 étapes : poste, epreuve, questions, entretien, envois, verifier
- `/recrutements/[id]/candidats`
- `/recrutements/[id]/candidats/[cid]/epreuve|entretien|analyse|decision|besoins`
- `/guide/...` : méthode, règles des portes, droit (checklist), ne pas noter, analyses, déroulé, sources, pilote 8 semaines, FAQ, limites
- `/donnees` réglages, sauvegarde, restauration, import de métier
- `/demande` formulaire « Demander un métier »

Accueil : trois étapes (le métier, l'épreuve, la décision), bouton pour essayer chacune, « Voir un exemple rempli » (recrutement fictif, trois candidats, classement et profil de travail — recrée un exemple cohérent et étiqueté FICTIF, ne prends pas de vraies personnes), « Le kit en 2 min 35 » si la vidéo est dans `public/`.

Métiers : 12 domaines comme des dossiers, les 8 plus recrutés en avant, « Décrire mon besoin » toujours visible sur le côté (tiroir en bas de l'écran sur mobile). Fiche métier imprimable.

Préparer, pas à pas, comme le LISEZ-MOI : le poste, l'épreuve, les questions, l'entretien, les envois (e-mails prêts à copier, questions envoyées à l'avance), vérifier. Profil de travail : jusqu'à 3 savoir-être essentiels, montrés à côté des faits observés, jamais dans le classement. Phrases « Au travail… » facultatives, non notées, refusables.

Candidats : un prénom ou un code suffit.

- « Sur cet écran » : l'épreuve se passe sur l'ordinateur du recruteur.
- « À distance » : lien personnel (l'e-mail est prérempli) ou fichier d'épreuve sans corrigé ni barème. Le retour est un code `CI5Z-…` ou un fichier, importé dans le même écran. Un lien ouvert à tous peut aller dans une annonce.
- Lien privé du recrutement : retrouve les candidats et où ils en sont, sur cet ordinateur seulement (il ouvre les données locales ; il ne doit pas devenir une URL qui expose les candidats sur le serveur).

Pour chaque candidat : Épreuve, Entretien, Analyse, Décision.

- Analyse : niveau par compétence, ce qui a été montré (repères), points à vérifier, relances, conseils d'accueil, brouillon de retour. Comparaison et classement du plus haut niveau prouvé au plus bas, profil de travail à côté. Le classement n'écrit pas la décision.
- Décision : statut parmi retenu / non retenu / vivier / en attente, motifs écrits par une personne. Plusieurs évaluateurs possibles ; l'analyse les rapproche sans écraser les notes de chacun.
- Mots clés des questions surlignés (le kit met en vert ce qui est demandé). Le candidat peut revenir au texte simple via « Affichage ».
- Déroulé optionnel : portes regardées, essayées, réponses changées, retours, relectures. Pas de temps. Le candidat est prévenu et peut refuser en un clic. Jamais proposé, ou désactivé, si un besoin d'aménagement est signalé. Le déroulé sert à préparer des questions de méthode, jamais la note.
- Fin de recrutement : archive (réponses, grilles, motifs, sans déroulé ni besoins) puis suppression locale.
- Sauvegarde fichier et restauration. Avertir que vider le navigateur efface les données locales.
- Impression / PDF des fiches, analyses, fiche d'entretien.
- Équité entre les portes : le suivi décrit dans le guide, pas un nouveau graphique inventé.

L'épreuve candidat (sur place ou `/e/[token]`) : il choisit sa porte pour chaque situation. Les cinq portes sont celles du kit (Choix multiples, Phrases à compléter, Retrouvez la question, Défi pratique, Oral ou écrit). Réponse orale : il parle, le recruteur note, l'application ne enregistre pas l'audio. À la fin, écran de confirmation, code `CI5Z-…`, fichier de réponses. Le code doit suffire à réimporter : s'il est trop gros pour être copié à la main, fournis le fichier en même temps et un code court qui ne contient qu'un contrôle, et documente le choix dans `ECARTS.md`. Ne tronque pas les réponses en silence.

Textes : vouvoiement, français, chiffres et espaces insécables comme dans les JSON. Ne réécris pas les e-mails.

---

## ESPACE ADMIN (`/admin`)

Connexion avec `EMAIL_ADMIN`. Pas d'inscription publique. Pas de liste de candidats, nulle part, même vide.

Tableau de bord :

- nombre de métiers publiés / brouillons ;
- demandes de métier et leur délai (72 h ouvrées, les jours fériés français peuvent être ignorés en v1 : lundi–vendredi) ;
- licences actives ;
- dernière publication du catalogue.

Catalogue :

- domaines : nom, ordre, métiers « bientôt » ;
- métier : tous les champs du pack, y compris alias, 4 compétences, situations, 5 portes, banque, entretien ;
- éditeur structuré, pas un textarea de JSON brut (un mode JSON avancé, replié, est permis pour coller un pack) ;
- aperçu « comme le candidat » et « comme le recruteur » sans quitter l'admin ;
- publier / dépublier / dupliquer ;
- import et export d'un fichier `ci5p-pack/3` ;
- les 8 « plus recrutés » se cochent, ils ne sont pas codés en dur dans l'interface ;
- modifier un métier déjà en cache chez un recruteur : la version augmente, le recruteur voit « catalogue mis à jour » au prochain chargement. Un recrutement dont l'épreuve a commencé garde les questions figées qu'il a déjà copiées en local.

Barèmes, repères, e-mails, guide, sources, checklist, besoins, « ne pas noter », profil de travail (dimensions, items, défauts par métier) : éditables, avec une phrase d'avertissement quand la modification change des notes futures. Les recrutements déjà figés ne sont pas recalculés tout seuls.

Demandes de métier :

- le formulaire recruteur envoie au serveur uniquement les champs du formulaire (intitulé, contexte, tâches, contraintes, coordonnées). Jamais un recrutement ;
- statuts : reçue, incomplète, en cours, livrée, refusée ;
- date de réception, échéance 72 h ouvrées, surlignage si dépassée ;
- bouton « créer le métier à partir de cette demande » qui ouvre un pack vide prérempli avec l'intitulé ;
- quand le métier est publié, marquer la demande livrée. L'envoi de l'e-mail réel peut attendre : en v1, bouton « copier le message au demandeur ».

Licences, v1 simple :

- créer un code, type Solo ou Entreprise, nom, e-mail, SIREN optionnel, date de fin optionnelle, actif ou révoqué ;
- le recruteur peut coller le code dans « Données et réglages ». Ça débloque un bandeau « licence enregistrée sur cet ordinateur ». Ça ne téléverse pas ses données. Ça ne sert pas de compte ;
- l'admin voit la liste des codes, pas l'usage réel (tu n'as pas cette donnée, ne l'invente pas).

Journal : qui (l'admin) a publié, dépublié, importé, ou changé un barème, avec la date. Pas de traceur d'audience, pas de cookie autre que la session admin.

Vidéo : déposer un mp4, servi en statique. Transcription : zone de texte. Si tu n'as pas le fichier, ne bloque pas le reste.

Page « Méthode et droit » côté recruteur lit la base, elle n'est pas dupliquée en dur dans les composants.

---

## ÉPREUVE EN LIGNE

`/e/[token]` reçoit un jeton opaque créé sur la machine du recruteur. Contrainte : le serveur ne doit pas recevoir les corrigés.

Façon de faire, imposée :

- au moment de « créer le lien », l'application recruteur construit un paquet **sans** `points`, `justes`, `barème`, `repere`, `explication` ;
- ce paquet est chiffré dans le navigateur (AES-GCM) avec une clé qui reste dans le fragment d'URL (`#k=…`), jamais envoyée au serveur ;
- le serveur ne stocke que le blob chiffré et une date d'expiration (90 jours), et le rend à qui a le lien ;
- le navigateur du candidat déchiffre, fait passer l'épreuve, produit le code et le fichier. Aucune réponse n'est postée ;
- si le serveur est injoignable, le fichier d'épreuve (déjà dans le kit) reste le repli, comme le dit la licence.

Ne logue pas le blob déchiffré. Ne mets pas la clé dans la query string.

---

## MOBILE ET ORDINATEUR

Ordinateur : rail de navigation à gauche (248 px dans le kit), contenu large, le besoin en une phrase dans un panneau latéral.

Téléphone :

- rail remplacé par une barre basse de 5 entrées maximum : Accueil, Métiers, Recrutements, Guide, Données ;
- l'épreuve tient en une colonne, options en boutons toute la largeur, pas de drag-and-drop obligatoire : pour « ordonner », boutons monter / descendre en plus du glisser ;
- pas de tableau large : le classement devient une pile de cartes ;
- rien d'essentiel caché seulement au survol ;
- l'admin sur téléphone reste utilisable pour lire une demande et publier, pas forcément pour éditer une banque de 20 questions (l'éditeur riche peut défiler, il ne doit pas casser).

Impression : une feuille CSS `print` pour la fiche d'entretien, l'analyse et la fiche métier. Pas besoin d'une librairie PDF si `window.print()` donne un PDF propre.

---

## PHASES

Chaque phase se termine par `npm test` et `npm run build` verts, et par une liste de ce qui se vérifie à la main. Ne commence pas la phase suivante si la précédente ne build pas.

**Phase 0 — coquille.** Projet, polices, tokens, deux ambiances, seed SQLite depuis `contenu/`, page d'accueil statique avec les vrais textes (`meta` de `base.json`). Pas de fausse donnée.

**Phase 1 — recruteur local, parité.** Catalogue lu depuis le seed (copie en IndexedDB). Métiers, création de recrutement, tirage, épreuve sur cet écran, notation, analyse, entretien, décision, classement, exemple fictif, sauvegarde et restauration. Tests de notation et de tirage. C'est le cœur : ne le bâcle pas pour aller à l'admin.

**Phase 2 — distance.** Fichier d'épreuve, lien chiffré, import du retour, questions du recruteur, détecteur, « décrire mon besoin », profil de travail, déroulé, archive de fin, impression.

**Phase 3 — admin.** Login, CRUD du catalogue, aperçu, publication, demandes de métier, licences, journal, édition des textes et des barèmes.

**Phase 4 — finition.** Responsive vérifié à 390, 768 et 1280 px, mode lisible, mode nuit, PWA (manifest + cache du catalogue et de l'app recruteur), page licence, mentions « pas un avis juridique, pas un diagnostic, pas une IA ».

Ne ajoute pas de phase « compte recruteur dans le cloud ». Si tu la proposes, c'est une note en bas de `ECARTS.md`, pas du code.

---

## INTERDITS

- Inventer un 34e métier, une 6e porte, un score de personnalité, un chronomètre, un diagnostic, une question de santé.
- Envoyer réponses, déroulé, besoins d'aménagement ou motifs de décision à une API.
- Remplacer les seuils par une moyenne, une courbe, ou un commentaire généré.
- Traduire, tutoyer, ou alléger les textes juridiques.
- Ajouter un analytics, un pixel, un chat, une newsletter.
- Copier les polices base64 du vieux HTML. Utilise `next/font` ou Fontsource.
- Laisser un `any` sur les objets métier et les réponses. Typage depuis les JSON.
- Écraser une épreuve déjà commencée quand l'admin publie une nouvelle version du métier.

---

## DÉFINITION DE FINI

Un recruteur qui n'a jamais vu l'admin peut, sur ordinateur puis sur un téléphone de 390 px :

1. regarder l'exemple fictif ;
2. choisir Serveur, lancer un tirage court, passer l'épreuve, obtenir un niveau par compétence cohérent avec les barèmes ;
3. importer un second candidat via fichier, voir le classement, écrire une décision motivée ;
4. sauvegarder, vider IndexedDB, restaurer, retrouver les deux candidats.

Toi, en admin, tu peux :

5. te connecter, passer un métier en brouillon, voir qu'il disparaît du catalogue recruteur au prochain chargement, sans toucher au recrutement déjà figé ;
6. recevoir une demande de métier de test et la marquer livrée ;
7. créer un code licence Entreprise et le voir accepté dans les réglages recruteur.

`npm test` et `npm run build` passent. `ECARTS.md` liste uniquement les vrais écarts avec `LISEZ-MOI.txt`, ou dit « aucun ».
