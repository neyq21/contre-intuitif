/**
 * Détecteur de questions interdites ou à éviter, par liste de motifs (pas une IA).
 * Signale : santé, handicap, RQTH, diagnostic, traitement, famille, grossesse, âge,
 * origine, nationalité, religion, opinions, syndicat, vie privée.
 * La seule question permise sur l'aménagement est « De quoi avez-vous besoin pour que
 * l'entretien se passe bien ? ».
 */

export interface Signalement {
  theme: string;
  mots: string[];
  raison: string;
  a_la_place: string;
}

interface Motif {
  theme: string;
  motifs: RegExp[];
  raison: string;
  a_la_place: string;
}

const MOTIFS: Motif[] = [
  {
    theme: "Santé",
    motifs: [/\bsante\b/i, /\bmalad/i, /\bmedical/i, /\bmedecin\b/i, /\barrets? maladie/i, /\bhospitali/i, /\bpsy(chiatr|cholog)/i, /\bdepression/i, /\bburn[- ]?out/i, /\ballergi/i],
    raison: "Interdit : santé (L1132-1), aucun lien avec le poste (L1221-6), donnée de santé (RGPD art. 9).",
    a_la_place: "« De quoi avez-vous besoin pour que l'entretien se passe bien ? »",
  },
  {
    theme: "Handicap, RQTH",
    motifs: [/\bhandicap/i, /\brqth\b/i, /\binvalid/i, /\btravailleur handicap/i, /\breconnaissance\b.*\bhandicap/i],
    raison: "On ne l'exige pas. La personne peut la signaler si elle le souhaite, et seulement si elle le souhaite.",
    a_la_place: "Indiquez que des aménagements sont possibles pour tous, sans justification.",
  },
  {
    theme: "Diagnostic, profil",
    motifs: [/\bdiagnos/i, /\bautis/i, /\basperger/i, /\btdah\b/i, /\bhpi\b/i, /\bhaut potentiel/i, /\bdys(lex|praxi|orthograph|calcul|phasi)/i, /\bhypersensib/i, /\bneuro(divergen|atypi)/i, /\btrouble/i],
    raison: "Interdit : santé et handicap (L1132-1), aucun lien avec le poste (L1221-6).",
    a_la_place: "Demandez de quoi la personne a besoin, jamais pourquoi.",
  },
  {
    theme: "Traitement",
    motifs: [/\btraitement/i, /\bmedicament/i, /\bordonnance/i, /\btherapie/i, /\bsuivi medical/i],
    raison: "Donnée de santé (RGPD art. 9) : interdit.",
    a_la_place: "Ne posez pas la question.",
  },
  {
    theme: "Famille, situation personnelle",
    motifs: [/\bmariee?s?\b/i, /\bpacs/i, /\bcelibataire/i, /\bconjoint/i, /\bepou(x|se)\b/i, /\benfants?\b/i, /\bgarde d'enfant/i, /\bsituation familiale/i, /\bfamill/i, /\bdivorc/i, /\bveu(f|ve)\b/i],
    raison: "Sans lien avec le poste (L1221-6) ; situation de famille : critère de discrimination (L1132-1).",
    a_la_place: "Décrivez les horaires du poste et demandez si la personne peut les tenir.",
  },
  {
    theme: "Grossesse, maternité",
    motifs: [/\bgrossesse/i, /\benceinte/i, /\bmaternit/i, /\bpaternit/i, /\bbebe\b/i, /\bproj(et|ets) d'enfant/i, /\bavoir des enfants/i],
    raison: "Interdit (L1132-1, L1225-1) : l'employeur ne peut pas rechercher d'information sur l'état de grossesse.",
    a_la_place: "Ne posez pas la question.",
  },
  {
    theme: "Âge",
    motifs: [/\bage\b/i, /\bquel age/i, /\bnee? en\b/i, /\bdate de naissance/i, /\bannee de naissance/i, /\bretraite/i, /\btrop (jeune|vieux|vieille|ag)/i],
    raison: "Âge : critère de discrimination (L1132-1). Bonne pratique anti-discrimination : ne demandez ni photo ni âge.",
    a_la_place: "Demandez l'expérience utile au poste, pas l'âge.",
  },
  {
    theme: "Origine, nationalité",
    motifs: [/\borigine/i, /\bnationalit/i, /\bpays d'origine/i, /\bd'ou (venez|viens)/i, /\bethni/i, /\bcouleur de peau/i, /\baccent\b/i, /\bfrancais de souche/i, /\bimmigr/i],
    raison: "Origine, nationalité, apparence : critères de discrimination (L1132-1).",
    a_la_place: "Vérifiez seulement le droit de travailler en France, après la décision, dans le cadre légal.",
  },
  {
    theme: "Religion",
    motifs: [/\breligi/i, /\bcroyan/i, /\bpratiquant/i, /\bpriere/i, /\bramadan/i, /\bcareme/i, /\bvoile\b/i, /\bkippa/i, /\bconfession/i],
    raison: "Convictions religieuses : critère de discrimination (L1132-1).",
    a_la_place: "Décrivez les contraintes réelles du poste (horaires, tenue de sécurité), les mêmes pour tous.",
  },
  {
    theme: "Opinions politiques",
    motifs: [/\bpoliti/i, /\bvot(e|ez|é)\b/i, /\belection/i, /\bparti\b/i, /\bopinion/i, /\bengagee? (politi|militan)/i, /\bmilitan/i],
    raison: "Opinions politiques : critère de discrimination (L1132-1).",
    a_la_place: "Ne posez pas la question.",
  },
  {
    theme: "Syndicat",
    motifs: [/\bsyndi/i, /\bgreve/i, /\bdelegue/i, /\bcse\b/i],
    raison: "Activités syndicales : critère de discrimination (L1132-1, L2141-5).",
    a_la_place: "Ne posez pas la question.",
  },
  {
    theme: "Vie privée",
    motifs: [/\bvie priv/i, /\borientation sexuelle/i, /\bhomosex/i, /\bpetite? ami/i, /\ben couple/i, /\blogement/i, /\bou (habitez|habites)/i, /\bloisir/i, /\bweek-?end/i, /\bcasier/i, /\bdettes?\b/i, /\bcredit\b/i, /\bsalaire precedent/i, /\breseaux sociaux/i, /\bfacebook/i, /\binstagram/i],
    raison: "Sans lien direct et nécessaire avec le poste (L1221-6) ; données minimisées (guide CNIL).",
    a_la_place: "Restez sur des situations du poste.",
  },
  {
    theme: "Apparence, non-verbal",
    motifs: [/\bphoto\b/i, /\bpoids\b/i, /\btaille\b/i, /\bapparence/i, /\btatou/i, /\bpiercing/i, /\bregard\b/i, /\bpoignee de main/i],
    raison: "Apparence physique : critère de discrimination (L1132-1). Le non-verbal ne dit rien du travail.",
    a_la_place: "Rien ne se note sur l'apparence : voir « Ne pas noter ».",
  },
];

export const QUESTION_BESOIN = "De quoi avez-vous besoin pour que l'entretien se passe bien ?";

/** Analyse un texte et renvoie les thèmes signalés, avec les mots qui les ont déclenchés. */
function sansAccents(t: string): string {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function detecter(texte: string): Signalement[] {
  // Les motifs sont écrits sans accents : on compare sur le texte sans accents.
  const t = sansAccents(texte);
  if (!t.trim()) return [];
  if (sansAccents(t.trim().toLowerCase()) === sansAccents(QUESTION_BESOIN.toLowerCase())) return [];
  const resultats: Signalement[] = [];
  for (const m of MOTIFS) {
    const mots: string[] = [];
    for (const re of m.motifs) {
      const trouve = t.match(re);
      if (trouve) mots.push(trouve[0].trim());
    }
    if (mots.length) resultats.push({ theme: m.theme, mots: [...new Set(mots)], raison: m.raison, a_la_place: m.a_la_place });
  }
  return resultats;
}

export const THEMES = MOTIFS.map((m) => m.theme);
