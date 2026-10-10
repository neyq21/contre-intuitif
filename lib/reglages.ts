/**
 * RÉGLAGES (déjà tranchés dans le prompt). Les variables d'environnement
 * permettent de les surcharger sans toucher au code.
 * Le mot de passe initial ne sert qu'au premier démarrage : il est haché dans
 * la base et peut être changé depuis l'admin.
 */
export const REGLAGES = {
  EMAIL_ADMIN: process.env.EMAIL_ADMIN ?? "enselme.anthony@outlook.fr",
  MOT_DE_PASSE_INITIAL: process.env.MOT_DE_PASSE_INITIAL ?? "Neyqanthony21-",
  URL_PUBLIQUE: process.env.URL_PUBLIQUE ?? "http://localhost:3000",
  EMAIL_DEMANDES_METIER: process.env.EMAIL_DEMANDES_METIER ?? "enselme-anthony@outlook.fr",
  NOM_JURIDIQUE: process.env.NOM_JURIDIQUE ?? "Contre-Intuitif",
  SITE_CONTACT: process.env.SITE_CONTACT ?? "https://0tqs6b-rg.myshopify.com/password",
  /** Durée de vie d'une épreuve en ligne (blob chiffré) en jours. */
  EXPIRATION_EPREUVE_JOURS: 90,
  /** Délai de création d'un métier, en heures ouvrées (lundi–vendredi). */
  DELAI_DEMANDE_HEURES_OUVREES: 72,
} as const;

/** Réglages non secrets exposés au client. */
export const REGLAGES_PUBLICS = {
  NOM_JURIDIQUE: REGLAGES.NOM_JURIDIQUE,
  SITE_CONTACT: REGLAGES.SITE_CONTACT,
  EMAIL_DEMANDES_METIER: REGLAGES.EMAIL_DEMANDES_METIER,
  URL_PUBLIQUE: REGLAGES.URL_PUBLIQUE,
} as const;
