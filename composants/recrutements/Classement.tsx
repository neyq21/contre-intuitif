"use client";

import Link from "next/link";
import { Chargement, Message, PiluleNiveau } from "@/composants/ui";
import { classerCandidats } from "@/lib/methode/analyse";
import { useRecrutement } from "./useRecrutement";

const DECISIONS = { retenu: "Retenu", non_retenu: "Non retenu", vivier: "Vivier", en_attente: "En attente" } as const;

export function Classement({ id }: { id: string }) {
  const { pret, recrutement: r, candidats, base } = useRecrutement(id);
  if (!pret) return <Chargement />;
  if (!r || !base) return <Chargement texte="Catalogue en cours de chargement…" />;
  if (!r.epreuve) return <Message>Le classement apparaît dès que l&apos;épreuve est figée et qu&apos;une personne a répondu.</Message>;
  const { lignes, analyses } = classerCandidats(base, r, candidats);
  const codes = r.epreuve.competences.map((c) => c.code);
  const dims = r.epreuve.profil_travail.essentiels.map((d) => base.profil_travail.dimensions.find((x) => x.id === d)).filter((d): d is NonNullable<typeof d> => !!d);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl">Comparaison et classement</h2>
        <p className="aide">
          Du plus haut niveau prouvé au plus bas : nombre de compétences au niveau requis, puis somme des niveaux. Le profil de travail est à côté, jamais dedans. Le classement aide à décider, il ne décide pas : la décision et ses motifs restent écrits par des personnes.
        </p>
      </div>
      {!lignes.length ? <p className="aide">Aucune personne pour l&apos;instant.</p> : null}

      {/* Ordinateur : tableau. Téléphone : pile de cartes. */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="tableau">
          <thead>
            <tr>
              <th scope="col">Rang</th>
              <th scope="col">Personne</th>
              {codes.map((c) => (
                <th key={c} scope="col">
                  {c} <span className="font-normal text-texte-3">(requis {r.competences.find((x) => x.code === c)?.niveau_requis})</span>
                </th>
              ))}
              <th scope="col">Au requis</th>
              <th scope="col">Profil de travail</th>
              <th scope="col">Décision</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => {
              const c = candidats.find((x) => x.id === l.id);
              const a = analyses.get(l.id);
              return (
                <tr key={l.id}>
                  <td className="font-semibold">{l.rang}</td>
                  <td>
                    <Link href={`/recrutements/${id}/candidats/${l.id}/analyse`} className="underline">
                      {l.nom}
                    </Link>
                  </td>
                  {codes.map((code) => (
                    <td key={code}>
                      <PiluleNiveau niveau={l.niveaux[code]} requis={r.competences.find((x) => x.code === code)?.niveau_requis} />
                    </td>
                  ))}
                  <td>
                    {l.auRequis}/{codes.length}
                    {l.mesurees < codes.length ? <span className="block text-xs text-texte-3">{codes.length - l.mesurees} non mesurée{codes.length - l.mesurees > 1 ? "s" : ""}</span> : null}
                  </td>
                  <td className="text-sm">
                    {a?.profil_travail.map((p) => (
                      <span key={p.dimension} className="block">
                        {p.nom} : {p.faits_plus.length} fait{p.faits_plus.length > 1 ? "s" : ""} +{p.faits_moins.length ? `, ${p.faits_moins.length} à vérifier` : ""}
                      </span>
                    ))}
                  </td>
                  <td>{c?.decision ? DECISIONS[c.decision.statut] : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="lg:hidden space-y-3">
        {lignes.map((l) => {
          const c = candidats.find((x) => x.id === l.id);
          const a = analyses.get(l.id);
          return (
            <li key={l.id} className="carte space-y-2">
              <div className="flex items-center justify-between">
                <Link href={`/recrutements/${id}/candidats/${l.id}/analyse`} className="text-xl font-titre underline">
                  {l.nom}
                </Link>
                <span className="pilule">Rang {l.rang}</span>
              </div>
              <ul className="flex flex-wrap gap-1">
                {codes.map((code) => (
                  <li key={code} className="text-sm">
                    {code} : <PiluleNiveau niveau={l.niveaux[code]} requis={r.competences.find((x) => x.code === code)?.niveau_requis} />
                  </li>
                ))}
              </ul>
              <p className="text-sm">
                {l.auRequis}/{codes.length} au niveau requis · {c?.decision ? DECISIONS[c.decision.statut] : "sans décision"}
              </p>
              {a?.profil_travail.length ? (
                <p className="text-sm text-texte-2">
                  {a.profil_travail.map((p) => `${p.nom} : ${p.faits_plus.length} fait${p.faits_plus.length > 1 ? "s" : ""} +`).join(" · ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {dims.length ? (
        <p className="aide">
          Profil de travail : {dims.map((d) => d.nom).join(", ")}. Les faits viennent des repères montrés dans les situations ; les phrases « Au travail… » sont dans l&apos;analyse de chaque personne. Ni l&apos;un ni l&apos;autre n&apos;entre dans le rang.
        </p>
      ) : null}
    </div>
  );
}
