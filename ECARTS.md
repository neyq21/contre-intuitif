# ÉCARTS avec `LISEZ-MOI.txt` et le prompt

Ce fichier ne liste que les vrais écarts. Il est mis à jour à chaque phase.

## Phase 0

- **Empreinte `_pv` des packs.** L'algorithme du kit HTML qui produit `_pv` n'est pas documenté dans le dossier fourni. Les packs sont seedés avec leur `_pv` d'origine, tel quel. Quand un pack est modifié (admin, import), l'empreinte est recalculée avec la règle de l'application : 10 premiers caractères hexadécimaux du SHA-256 du JSON canonique (clés triées, sans `_pv`). Un pack du kit non modifié garde donc son empreinte d'origine ; un pack modifié ici aura une empreinte au format de l'application.
- **Vidéo.** `Presentation-kit-5-portes.mp4` n'est pas dans le dossier fourni. Le bouton « Le kit en 2 min 35 » n'apparaît que si le fichier est déposé dans `public/`. Aucune vidéo n'est inventée.
- **Sauvegarde réelle du kit HTML.** `exemples/sauvegarde-reelle.json` n'a pas été fourni. Les formats `ci5p-sauvegarde/2`, `ci5p-reponses/2` et `ci5p-archive/1` sont donc implémentés d'après le prompt et le LISEZ-MOI, avec un importateur tolérant (voir phase 1). À vérifier avec une vraie sauvegarde dès qu'elle est disponible.

## Phase 1

- **« Comment les analyses sont calculées ».** Le `base.guide` fourni ne contient pas cette rubrique (ni la règle de combinaison des portes et de l'entretien). Les barèmes sont appliqués tels quels (`lib/methode/notation.ts`, testés). La règle de combinaison est écrite dans `lib/methode/regles-texte.ts` et affichée dans « Méthode et droit → Comment les analyses sont calculées » : médiane basse entre plusieurs évaluateurs d'une même mesure ; plus bas des deux niveaux quand l'épreuve et l'entretien existent (écart signalé à partir de 2 niveaux) ; classement par nombre de compétences au niveau requis puis somme des niveaux. La correction du hasard de la porte 4 (ordonner : (part − 0,5)/0,5 ; classer : part corrigée de la part attendue au hasard ; repérer : trouvées − fausses alertes) y est aussi explicitée. Si le kit HTML applique une autre règle, c'est ici qu'il faut la rapprocher.
- **Code `CI5Z-…`.** Le code contient les réponses complètes, compressées (deflate) et encodées en base64url : il suffit toujours à réimporter, et il n'est jamais tronqué. Avec des réponses rédigées, il dépasse souvent 1 500 caractères : l'écran de fin le dit et propose le fichier de réponses en même temps (mêmes réponses). Aucun « code court de contrôle » n'a été nécessaire.
- **Fichier d'épreuve.** Le fichier d'épreuve est un JSON (`ci5p-epreuve-candidat/1`, sans aucune clé de corrigé, vérifié par test) que la personne ouvre sur la page `/e/fichier` de l'application. Ce n'est pas un HTML autonome comme dans le kit v5 : le repli « fichier » suppose que la page `/e/fichier` soit joignable (ou installée en PWA, phase 4). À signaler dans la licence si ce point doit rester strictement identique au kit.
- **« Autre tirage » sans banque.** Les 25 métiers sans banque gardent les questions du kit ; le bouton est inactif et l'écran le dit.
- **Mode « Essayer comme un candidat ».** Pour les portes 2 et 5, c'est la personne qui s'auto-évalue avec les réponses prévues (juste / partielle / à éviter), puisqu'aucun évaluateur n'existe en mode essai.
- **Exemple fictif.** Recréé par l'application (métier Serveur, trois personnes, deux évaluateurs), étiqueté FICTIF partout, supprimable comme un recrutement normal.

## Phase 2

- **Lien d'annonce.** Le lien ouvert à tous ne préremplit aucun prénom : la personne indique elle-même un prénom ou un code au début de l'épreuve, et ses réponses reviennent avec ce nom. Le déroulé n'est jamais proposé avec ce lien (règle du kit).
- **E-mail de retour.** Le kit v5 parle d'un envoi « en un clic » des réponses. Ici, l'écran de fin propose « Copier le code », le fichier, et un bouton « Envoyer par e-mail » (mailto) seulement si le recruteur a renseigné son e-mail de retour dans « Données et réglages ». Aucun envoi ne passe par le serveur.
- **Aucun écart fonctionnel** par rapport au LISEZ-MOI sur : fichier d'épreuve sans corrigé, lien chiffré (clé dans le fragment, blob opaque 90 jours), import par code ou fichier, questions du recruteur avec détecteur, « Décrire mon besoin » (3 exemples du kit testés), profil de travail, déroulé (refusable, jamais si besoin signalé, jamais dans la note), archive sans déroulé ni besoins, impression. Vérifié par `scripts/verification-distance.mjs`.

## Phase 3

- **Éditeur structuré.** Le studio de contenu génère ses formulaires à partir de la forme des JSON (chaînes, nombres, listes réordonnables, objets repliables), avec des libellés en français pour chaque champ connu. Ce n'est pas un textarea de JSON brut ; le mode « JSON avancé » existe, replié, pour coller un pack entier. L'éditeur riche défile sur téléphone, il ne casse pas ; publier, dépublier, lire une demande y restent faciles.
- **Version d'un métier modifié.** Quand le contenu d'un métier change dans l'admin, sa version passe de « 2026.10 » à « 2026.10.1 », « 2026.10.2 »… et son empreinte `_pv` est recalculée (règle de l'application, voir phase 0). Le catalogue est republié ; un recrutement déjà figé garde ses questions copiées en local (vérifié par `scripts/verification-admin.mjs`).
- **Jours fériés.** Les 72 h ouvrées comptent du lundi au vendredi ; les jours fériés français sont ignorés en v1, comme le permet le prompt.
- **Envoi de l'e-mail au demandeur.** Pas d'envoi réel en v1 : bouton « Copier le message au demandeur » (prévu par le prompt).
- **Mot de passe initial.** Celui des RÉGLAGES sert seulement au premier démarrage (il est haché dans la base). Changez-le depuis « Compte » après la première connexion : il figure dans le dépôt (`lib/reglages.ts`, `.env.example`) comme le prompt l'a demandé.
