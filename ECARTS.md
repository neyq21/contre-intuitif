# ÉCARTS avec `LISEZ-MOI.txt` et le prompt

Ce fichier ne liste que les vrais écarts. Il est mis à jour à chaque phase.

## Phase 0

- **Empreinte `_pv` des packs.** L'algorithme du kit HTML qui produit `_pv` n'est pas documenté dans le dossier fourni. Les packs sont seedés avec leur `_pv` d'origine, tel quel. Quand un pack est modifié (admin, import), l'empreinte est recalculée avec la règle de l'application : 10 premiers caractères hexadécimaux du SHA-256 du JSON canonique (clés triées, sans `_pv`). Un pack du kit non modifié garde donc son empreinte d'origine ; un pack modifié ici aura une empreinte au format de l'application.
- **Vidéo.** `Presentation-kit-5-portes.mp4` n'est pas dans le dossier fourni. Le bouton « Le kit en 2 min 35 » n'apparaît que si le fichier est déposé dans `public/`. Aucune vidéo n'est inventée.
- **Sauvegarde réelle du kit HTML.** `exemples/sauvegarde-reelle.json` n'a pas été fourni. Les formats `ci5p-sauvegarde/2`, `ci5p-reponses/2` et `ci5p-archive/1` sont donc implémentés d'après le prompt et le LISEZ-MOI, avec un importateur tolérant (voir phase 1). À vérifier avec une vraie sauvegarde dès qu'elle est disponible.
