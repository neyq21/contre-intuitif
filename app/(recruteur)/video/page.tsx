import Link from "next/link";
import { videoDisponible } from "@/lib/contenu/charger";
import { lireReglage, ouvrirBase } from "@/lib/stockage/sqlite";

export const dynamic = "force-dynamic";
export const metadata = { title: "Le kit en 2 min 35" };

export default function PageVideo() {
  const presente = videoDisponible();
  const transcription = lireReglage(ouvrirBase(), "video_transcription") ?? "";
  return (
    <div className="space-y-6 max-w-[52rem]">
      <h1 className="text-4xl">Le kit en 2 min 35</h1>
      {presente ? (
        <video controls preload="metadata" className="w-full rounded-m bg-nuit" src="/Presentation-kit-5-portes.mp4">
          Votre navigateur ne lit pas cette vidéo : ouvrez le fichier Presentation-kit-5-portes.mp4 directement.
        </video>
      ) : (
        <p className="carte">
          La vidéo n&apos;est pas disponible sur ce serveur.{" "}
          <Link href="/" className="underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      )}
      <p className="aide">La voix est une voix de synthèse ; les écrans sont ceux du kit, avec des données de démonstration. Si la vidéo ne se lance pas, ouvrez le fichier directement.</p>
      {transcription ? (
        <details className="carte" open>
          <summary className="cursor-pointer font-semibold">Transcription</summary>
          <pre className="whitespace-pre-wrap font-ui mt-2">{transcription}</pre>
        </details>
      ) : null}
    </div>
  );
}
