# À remplir avant de lancer Claude Code

Le reste est déjà dans ce dossier. Tu n'as pas à réécrire la méthode, les questions ni les barèmes.

## 1. Fichiers à ajouter toi-même (optionnels)

| Fichier | Où le poser | Obligatoire ? |
|---|---|---|
| `Presentation-kit-5-portes.mp4` | à la racine de ce dossier | Non. Sans lui, l'accueil n'a pas la vidéo. Le texte du kit reste. |
| Logo ou charte si tu en as une autre que le kit | `marque/` | Non. Les couleurs du kit v5 sont déjà dans le prompt. |
| Un export réel « Sauvegarder dans un fichier » du kit HTML | `exemples/sauvegarde-reelle.json` | Non, mais très utile : Claude pourra vérifier que l'import d'une vraie sauvegarde marche. |

Ne mets pas le HTML de 3,7 Mo si les JSON sont là. Il est surtout des polices incorporées. Garde-le à part, au cas où : `reference/Kit-5-portes-Contre-Intuitif.html`.

## 2. Les 6 lignes à compléter dans le prompt

Ouvre `PROMPT-CLAUDE-CODE.md`, bloc « RÉGLAGES », et remplace uniquement ceci :

1. `EMAIL_ADMIN` — enselme.anthony@outlook.fr
2. `MOT_DE_PASSE_INITIAL` — Neyqanthony21-
3. `URL_PUBLIQUE` — http://localhost:3000
4. `EMAIL_DEMANDES_METIER` — enselme-anthony@outlook.fr
5. `NOM_JURIDIQUE` — le nom qui figure sur la licence (Contre-Intuitif si tu n'as pas de raison sociale sous la main).
6. `SITE_CONTACT` — https://0tqs6b-rg.myshopify.com/password

Ne change pas les autres décisions. Elles évitent à Claude de réinventer le produit.

## 3. Ce que tu ne dois pas faire

- Ne réécris pas les 33 métiers. Ils sont dans `contenu/packs/`.
- Ne demande pas à Claude d'« améliorer » les notes, le droit, ou les textes du guide.
- Ne lui donne pas tes sauvegardes de vrais candidats. Seulement une sauvegarde de démo si tu en as une.
- N'ajoute pas d'intelligence artificielle. Le kit en est volontairement dépourvu (reconnaissance du besoin = mots-clés).

## 4. Comment le lancer

1. Crée un dossier vide, par exemple `cinq-portes/`.
2. Copie tout ce dossier dedans (`PROMPT-CLAUDE-CODE.md`, `contenu/`, `LISEZ-MOI.txt`, `LICENCE.txt`, et la vidéo si tu l'as).
3. Ouvre ce dossier dans Claude Code.
4. Colle uniquement la première phrase du prompt :

   `Lis PROMPT-CLAUDE-CODE.md et exécute-le phase par phase. Ne pose pas de question déjà tranchée dans RÉGLAGES.`

5. Laisse-le finir la phase 0 et la phase 1 avant de demander la suite. Vérifie toi-même le parcours « Voir un exemple rempli » à la fin de la phase 1.

## 5. Ordre de vérification, pour toi

Après la phase 1, tu dois pouvoir, sans compte recruteur :

- ouvrir l'accueil, les 12 domaines, un métier (Serveur), « Essayer comme un candidat » ;
- créer un recrutement, choisir les questions, figer l'épreuve ;
- passer l'épreuve, voir l'analyse, le classement, écrire une décision.

Après la phase 3 seulement : te connecter en admin et modifier un métier sans toucher au code.

Si une phase casse une règle de `LISEZ-MOI.txt`, tu renvoies Claude à cette règle. Tu ne réécris pas le prompt.
