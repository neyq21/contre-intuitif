import Link from "next/link";

export const metadata = { title: "Hors ligne" };

export default function PageHorsLigne() {
  return (
    <div className="space-y-4 max-w-[36rem]">
      <h1 className="text-4xl">Vous êtes hors ligne</h1>
      <p className="text-texte-2">Vos recrutements et le dernier catalogue publié sont sur cet ordinateur : ils restent accessibles. Cette page-ci n&apos;a pas encore été visitée en ligne, elle n&apos;est pas en cache.</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/recrutements" className="bouton bouton-principal">
          Mes recrutements
        </Link>
        <Link href="/metiers" className="bouton">
          Les métiers
        </Link>
      </div>
    </div>
  );
}
