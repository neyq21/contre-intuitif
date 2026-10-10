/**
 * Textes de la page « Comment les analyses sont calculées » pour les règles que
 * l'application applique au-delà des barèmes de la base (combinaison des
 * mesures, classement, correction du hasard). Voir ECARTS.md : le guide du kit
 * fourni ne contient pas ces paragraphes, ils sont écrits ici, en clair.
 */
export const REGLE_ANALYSES: { titre: string; paragraphes: string[] }[] = [
  {
    titre: "Porte 4 : la correction du hasard, en pratique",
    paragraphes: [
      "Ordonner : la part des règles d'ordre respectées est ramenée de 0 à 1 en retirant ce qu'un ordre au hasard obtiendrait (une règle sur deux) : score = (part − 0,5) / 0,5, jamais en dessous de 0. Plusieurs ordres justes sont acceptés, puisque seules les règles comptent.",
      "Classer : la part des éléments bien classés est corrigée de la part attendue au hasard (nombre de catégories acceptées sur nombre de catégories, en moyenne) : score = (part − attendue) / (1 − attendue), jamais en dessous de 0. Plusieurs catégories justes sont acceptées pour un même élément.",
      "Repérer : erreurs trouvées moins fausses alertes, rapporté au nombre d'erreurs à trouver, jamais en dessous de 0.",
    ],
  },
  {
    titre: "Le niveau prouvé d'une compétence",
    paragraphes: [
      "Une compétence est mesurée par une porte de l'épreuve (corrigée automatiquement pour les portes 1, 3 et 4, jugée par une personne pour les portes 2 et 5, ou observée en situation réelle), et par l'entretien structuré.",
      "Quand plusieurs personnes évaluent la même mesure, le niveau retenu est la médiane basse de leurs niveaux : chaque note reste visible, aucune n'est écrasée, et un écart de deux niveaux ou plus est signalé dans le suivi.",
      "Quand l'épreuve et l'entretien existent tous les deux, le niveau prouvé est le plus bas des deux : une compétence est prouvée quand toutes les mesures la confirment. L'écart est signalé dans l'analyse quand il atteint deux niveaux, pour être discuté avec les faits notés.",
      "Le profil de travail, les phrases « Au travail… », la porte choisie, le déroulé et le temps n'entrent jamais dans le niveau.",
    ],
  },
  {
    titre: "Le classement des candidats",
    paragraphes: [
      "Du plus haut niveau prouvé au plus bas : d'abord le nombre de compétences au niveau requis, puis la somme des niveaux prouvés, puis l'ordre alphabétique. Les ex æquo ont le même rang.",
      "Le classement aide à décider, il ne décide pas : la décision et ses motifs restent écrits par des personnes.",
    ],
  },
];
