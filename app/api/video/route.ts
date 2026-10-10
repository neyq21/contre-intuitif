import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { cheminVideo, videoDisponible } from "@/lib/contenu/charger";

export const dynamic = "force-dynamic";

/** Sert la vidéo depuis le dossier persistant (DOSSIER_VIDEO), avec les plages (Range) pour le défilement. */
export async function GET(request: Request) {
  if (!videoDisponible()) return new Response("Vidéo absente", { status: 404 });
  const chemin = cheminVideo();
  const taille = statSync(chemin).size;
  const plage = request.headers.get("range");
  let debut = 0;
  let fin = taille - 1;
  if (plage) {
    const m = plage.match(/bytes=(\d*)-(\d*)/);
    if (m) {
      if (m[1]) debut = Number(m[1]);
      if (m[2]) fin = Math.min(Number(m[2]), taille - 1);
    }
    if (debut > fin || debut >= taille) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${taille}` } });
  }
  const flux = Readable.toWeb(createReadStream(chemin, { start: debut, end: fin })) as ReadableStream;
  return new Response(flux, {
    status: plage ? 206 : 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(fin - debut + 1),
      "Accept-Ranges": "bytes",
      ...(plage ? { "Content-Range": `bytes ${debut}-${fin}/${taille}` } : {}),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
