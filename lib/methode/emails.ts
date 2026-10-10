/**
 * E-mails prêts à copier : les modèles de la base, jamais réécrits, avec les
 * crochets remplis quand l'application connaît la valeur. Le reste des crochets
 * reste à compléter par le recruteur.
 */
import type { Base, Email } from "@/lib/contenu/types";
import type { Recrutement } from "@/lib/stockage/modele";
import { texteSimple } from "@/composants/Texte";
import { reservoirEntretien } from "./tirage";
import type { Pack } from "@/lib/contenu/types";

export interface EmailPret extends Email {
  corps_rempli: string;
  objet_rempli: string;
}

export function questionsEntretienTexte(r: Recrutement, pack: Pack | null): string[] {
  const reservoir = pack ? reservoirEntretien(pack) : (r.epreuve?.entretien.questions ?? []);
  const kit = r.selection.entretien.map((id) => reservoir.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q);
  const propres = Object.values(r.questions_recruteur.entretien).flat();
  return [...kit.map((q) => texteSimple(q.texte)), ...propres.map((q) => q.texte)];
}

export function preparerEmails(base: Base, r: Recrutement, pack: Pack | null, options: { candidat?: string; lien?: string } = {}): EmailPret[] {
  const competences = r.competences.map((c) => pack?.competences.find((x) => x.code === c.code)?.titre ?? r.epreuve?.competences.find((x) => x.code === c.code)?.titre ?? c.code);
  const questions = questionsEntretienTexte(r, pack);
  const nPhrases = base.profil_travail.items.filter((i) => r.profil_travail.essentiels.includes(i.dim)).length;
  const exemple = base.profil_travail.items.find((i) => r.profil_travail.essentiels.includes(i.dim))?.texte ?? "";

  return base.emails.map((e) => {
    let corps = e.corps;
    let objet = e.objet;
    const remplacer = (t: string) =>
      t
        .replaceAll("[poste]", r.poste)
        .replaceAll("[compétences]", competences.join(", "))
        .replaceAll("[Prénom]", options.candidat ?? "[Prénom]");
    corps = remplacer(corps);
    objet = remplacer(objet);
    // E-mail 1 : la liste des questions, à la place des crochets numérotés.
    if (e.n === 1 && questions.length) {
      const lignes = corps.split("\n");
      const debut = lignes.findIndex((l) => /^\d+\. \[Question \d+\]$/.test(l));
      if (debut >= 0) {
        let fin = debut;
        while (fin < lignes.length && /^\d+\. \[Question \d+\]$/.test(lignes[fin])) fin += 1;
        lignes.splice(debut, fin - debut, ...questions.map((q, i) => `${i + 1}. ${q}`));
        corps = lignes.join("\n");
      }
    }
    // E-mail 2 : le profil de travail et le déroulé sont annoncés automatiquement quand l'option est cochée.
    if (e.n === 2) {
      const ajouts: string[] = [];
      if (r.profil_travail.phrases && nPhrases) ajouts.push(base.profil_travail.annonce.replace("{n}", String(nPhrases)).replace("{exemple}", exemple));
      if (r.deroule)
        ajouts.push(
          "Si vous l'acceptez, l'épreuve garde aussi votre démarche (portes regardées et essayées, réponses changées, retours, relectures), jamais le temps. Cela n'entre pas dans la note : cela sert à préparer des questions sur votre façon de travailler. Vous pourrez refuser en un clic au début de l'épreuve.",
        );
      if (options.lien) ajouts.push(`Votre lien personnel : ${options.lien}`);
      if (ajouts.length) {
        const i = corps.indexOf("\n\nEt toujours");
        corps = i >= 0 ? corps.slice(0, i) + "\n\n" + ajouts.join("\n\n") + corps.slice(i) : corps + "\n\n" + ajouts.join("\n\n");
      }
    }
    return { ...e, corps_rempli: corps, objet_rempli: objet };
  });
}
