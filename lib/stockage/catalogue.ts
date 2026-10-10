/**
 * Construction du catalogue public (ce que le serveur rend au recruteur).
 * Ne contient que des métiers publiés, la base et les domaines. Jamais de candidat.
 */
import type { Catalogue, MetierResume, Pack } from "@/lib/contenu/types";
import { videoDisponible } from "@/lib/contenu/charger";
import { lireBase, lireDomaines, lirePacksPublies, lireReglage, listerMetiers, versionCatalogue, type BaseSqlite } from "./sqlite";

export function resumerPack(pack: Pack, plusRecrute: boolean): MetierResume {
  return {
    id: pack.id,
    version: pack.version,
    nom: pack.nom,
    secteur: pack.secteur,
    alias: pack.alias,
    resume: pack.resume,
    plus_recrute: plusRecrute,
    banque: pack.competences.some((c) => c.banque !== undefined),
    _pv: pack._pv,
  };
}

export function construireCatalogue(db: BaseSqlite): Catalogue {
  const base = lireBase(db);
  const domaines = lireDomaines(db);
  const packs = lirePacksPublies(db);
  const lignes = new Map(listerMetiers(db, true).map((m) => [m.id, m]));
  const { version, publie_le } = versionCatalogue(db);
  return {
    schema: "ci5p-catalogue/1",
    version,
    publie_le,
    base,
    domaines,
    metiers: packs.map((p) => resumerPack(p, lignes.get(p.id)?.plus_recrute ?? false)),
    packs,
    video: { disponible: videoDisponible(), transcription: lireReglage(db, "video_transcription") ?? "" },
  };
}
