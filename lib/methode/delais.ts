/**
 * Délai de création d'un métier : 72 h ouvrées (3 jours ouvrés, lundi–vendredi).
 * Les jours fériés français sont ignorés en v1.
 */
export function estJourOuvre(d: Date): boolean {
  const j = d.getUTCDay();
  return j >= 1 && j <= 5;
}

/** Ajoute des heures ouvrées (24 h par jour ouvré) à une date. */
export function ajouterHeuresOuvrees(depuis: Date, heures: number): Date {
  const d = new Date(depuis.getTime());
  // Si la réception tombe un week-end, le délai court à partir du lundi 0 h UTC.
  while (!estJourOuvre(d)) {
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(0, 0, 0, 0);
  }
  let restant = heures;
  while (restant > 0) {
    const finJournee = new Date(d.getTime());
    finJournee.setUTCHours(24, 0, 0, 0);
    const dispo = (finJournee.getTime() - d.getTime()) / 3600000;
    if (restant <= dispo) {
      d.setTime(d.getTime() + restant * 3600000);
      restant = 0;
    } else {
      restant -= dispo;
      d.setTime(finJournee.getTime());
      while (!estJourOuvre(d)) d.setUTCDate(d.getUTCDate() + 1);
    }
  }
  return d;
}

export function echeanceDemande(recuLe: Date, heuresOuvrees = 72): Date {
  return ajouterHeuresOuvrees(recuLe, heuresOuvrees);
}
