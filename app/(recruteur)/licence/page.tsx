import { chargerTexte } from "@/lib/contenu/charger";
import { REGLAGES_PUBLICS } from "@/lib/reglages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Licence" };

export default function PageLicence() {
  const licence = chargerTexte("LICENCE.txt");
  return (
    <div className="space-y-6 max-w-[48rem]">
      <h1 className="text-4xl">Licence d&apos;utilisation</h1>
      <p className="text-texte-2">
        Titulaire : {REGLAGES_PUBLICS.NOM_JURIDIQUE}. Contact :{" "}
        <a href={REGLAGES_PUBLICS.SITE_CONTACT} className="underline" rel="noreferrer">
          page contact du site
        </a>
        .
      </p>
      <pre className="carte whitespace-pre-wrap font-ui text-[0.95rem] leading-relaxed">{licence}</pre>
    </div>
  );
}
