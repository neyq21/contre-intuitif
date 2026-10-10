import { exigerAdmin } from "@/lib/admin/session";
import { videoDisponible } from "@/lib/contenu/charger";
import { lireReglage, ouvrirBase } from "@/lib/stockage/sqlite";
import { transcriptionAction } from "../actions";
import { DepotVideo } from "@/composants/admin/DepotVideo";

export const dynamic = "force-dynamic";

export default async function PageVideo() {
  await exigerAdmin();
  const transcription = lireReglage(ouvrirBase(), "video_transcription") ?? "";
  const presente = videoDisponible();
  return (
    <div className="space-y-6 max-w-[48rem]">
      <h1 className="text-3xl">Vidéo « Le kit en 2 min 35 »</h1>
      <p className="aide">
        Déposez le fichier MP4 (H.264) : il est servi en statique depuis <code>public/Presentation-kit-5-portes.mp4</code>. Sans fichier, l&apos;accueil n&apos;affiche pas le bouton vidéo et rien n&apos;est inventé.
      </p>
      <p className="carte">
        État : {presente ? "vidéo présente, bouton affiché à l'accueil." : "aucune vidéo déposée, bouton masqué."}
        {presente ? (
          <a href="/video" className="underline ml-2">
            Voir la page
          </a>
        ) : null}
      </p>
      <DepotVideo />
      <form action={transcriptionAction} className="carte space-y-2">
        <label className="block">
          <span className="etiquette">Transcription (affichée sous la vidéo)</span>
          <textarea name="transcription" className="champ" rows={12} defaultValue={transcription} />
        </label>
        <button type="submit" className="bouton bouton-principal">
          Enregistrer la transcription
        </button>
      </form>
    </div>
  );
}
