"use client";

import { Chargement, Message } from "@/composants/ui";
import { suivi } from "@/lib/methode/analyse";
import { useRecrutement } from "./useRecrutement";

/** Suivi de l'équité entre les portes, tel que décrit dans le guide (pilote, semaine 7). */
export function Suivi({ id }: { id: string }) {
  const { pret, recrutement: r, candidats, base } = useRecrutement(id);
  if (!pret) return <Chargement />;
  if (!r || !base) return <Chargement texte="Catalogue en cours de chargement…" />;
  if (!r.epreuve) return <Message>Le suivi apparaît dès que l&apos;épreuve est figée.</Message>;
  const s = suivi(base, r, candidats);
  const portes = base.portes;
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl">Suivi : l&apos;équité entre les portes</h2>
        <p className="aide">Choix des portes, niveau moyen par porte, accord entre évaluateurs, demandes d&apos;aménagement. Les portes doivent être d&apos;égale difficulté : si une porte donne toujours des niveaux plus bas, relisez-la avec un titulaire du poste.</p>
      </div>
      <section className="carte space-y-2">
        <h3 className="text-xl">Choix des portes et niveau moyen</h3>
        <table className="tableau">
          <thead>
            <tr>
              <th scope="col">Porte</th>
              <th scope="col">Fois choisie</th>
              <th scope="col">Niveau moyen (épreuve)</th>
            </tr>
          </thead>
          <tbody>
            {portes.map((p) => (
              <tr key={p.id}>
                <td>
                  Porte {p.n} · {p.nom}
                  {!r.portes.includes(p.id) ? <span className="text-texte-3"> (non proposée)</span> : null}
                </td>
                <td>{s.choix_portes[p.id]}</td>
                <td>{s.niveau_moyen_par_porte[p.id].moyenne ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="carte space-y-2">
        <h3 className="text-xl">Accord entre évaluateurs</h3>
        {!s.accord_evaluateurs.length ? (
          <p className="aide">Pas encore deux évaluations d&apos;une même compétence. Chaque personne note seule, puis on compare : deux points d&apos;écart ou plus se discutent avec les faits notés.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {s.accord_evaluateurs.map((a, i) => (
              <li key={i} className={a.ecart >= 2 ? "text-alerte-texte" : ""}>
                {a.candidat} · {a.competence} : {a.niveaux.map((n) => `${n.evaluateur} ${n.niveau}`).join(", ")} — écart {a.ecart}
                {a.ecart >= 2 ? " : à discuter avec les faits notés" : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="carte space-y-1">
        <h3 className="text-xl">Demandes d&apos;aménagement</h3>
        <p>
          {s.besoins_signales} personne{s.besoins_signales > 1 ? "s" : ""} sur {s.candidats} {s.besoins_signales > 1 ? "ont" : "a"} signalé un besoin. Les besoins sont notés sans leur raison, à part des grilles.
        </p>
      </section>
    </div>
  );
}
