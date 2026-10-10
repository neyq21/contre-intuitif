"use client";

import { Texte } from "@/composants/Texte";
import { Message } from "@/composants/ui";
import type { Base, CodeCompetence, Pack } from "@/lib/contenu/types";
import { LIMITES, reservoirP1, reservoirP2, reservoirP3, reservoirP4, reservoirP5 } from "@/lib/methode/tirage";
import type { Recrutement } from "@/lib/stockage/modele";
import { QuestionsRecruteurEditeur } from "./QuestionsRecruteur";

type Enregistrer = (fn: (r: Recrutement) => Recrutement | void) => Promise<void>;

export function PreparerQuestions({ r, pack, base, figee, enregistrer }: { r: Recrutement; pack: Pack | null; base: Base; figee: boolean; enregistrer: Enregistrer }) {
  if (!pack) return <Message type="alerte">Métier indisponible : les questions ne peuvent pas être affichées.</Message>;
  const portes = base.portes;
  const nomPorte = (id: string) => portes.find((p) => p.id === id);

  function basculer(code: CodeCompetence, porte: "p1" | "p2" | "p5", qid: string, coche: boolean, ordre: string[]) {
    void enregistrer((x) => {
      const s = x.selection.competences[code];
      if (!s) return;
      const l = LIMITES[porte];
      let ids = coche ? [...s[porte], qid] : s[porte].filter((k) => k !== qid);
      if (ids.length > l.max || ids.length < l.min) return;
      ids = ordre.filter((id) => ids.includes(id));
      return { ...x, selection: { ...x.selection, competences: { ...x.selection.competences, [code]: { ...s, [porte]: ids } } } };
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl">Les questions</h2>
        <p className="aide">
          Pour chaque compétence et chaque porte, les questions posées. Les angles indiquent ce que chaque question mesure. Porte 1 : de 3 à 10 ; portes 2 et 5 : de 2 à 6 ; portes 3 et 4 : une version. Toutes les personnes ont les mêmes questions.
        </p>
      </div>
      {r.competences.map((comp) => {
        const c = pack.competences.find((x) => x.code === comp.code);
        const s = r.selection.competences[comp.code];
        if (!c || !s) return null;
        const angles = c.banque?.angles ?? {};
        return (
          <section key={comp.code} className="space-y-4" aria-labelledby={`q-${comp.code}`}>
            <h3 id={`q-${comp.code}`} className="text-2xl flex flex-wrap items-center gap-2">
              <span className="pilule">{comp.code}</span> {c.titre}
            </h3>
            <p className="text-sm text-texte-2">Situation : {c.situation.titre}</p>

            {r.portes.includes("p1") ? (
              <fieldset className="carte space-y-2">
                <legend className="font-ui font-semibold px-1">
                  Porte 1 · {nomPorte("p1")?.nom} — {s.p1.length} question{s.p1.length > 1 ? "s" : ""}
                </legend>
                <ul className="space-y-1">
                  {reservoirP1(c).map((q, i) => {
                    const coche = s.p1.includes(q.id);
                    return (
                      <li key={q.id}>
                        <label className="flex items-start gap-3 min-h-11 py-1">
                          <input type="checkbox" className="mt-1" checked={coche} disabled={figee} onChange={(e) => basculer(comp.code, "p1", q.id, e.target.checked, reservoirP1(c).map((x) => x.id))} />
                          <span>
                            <span className="block text-sm text-texte-2">{q.angle ?? angles[`p1.${q.id}`] ?? `Question ${i + 1}`}{i >= c.portes.p1.questions.length ? " · banque" : ""}</span>
                            <Texte>{q.texte}</Texte>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            ) : null}

            {r.portes.includes("p2") ? (
              <fieldset className="carte space-y-3">
                <legend className="font-ui font-semibold px-1">
                  Porte 2 · {nomPorte("p2")?.nom} — {s.p2.length} phrase{s.p2.length > 1 ? "s" : ""}
                </legend>
                <ul className="space-y-1">
                  {reservoirP2(c).map((d, i) => (
                    <li key={d.id}>
                      <label className="flex items-start gap-3 min-h-11 py-1">
                        <input type="checkbox" className="mt-1" checked={s.p2.includes(d.id)} disabled={figee} onChange={(e) => basculer(comp.code, "p2", d.id, e.target.checked, reservoirP2(c).map((x) => x.id))} />
                        <span>
                          <span className="block text-sm text-texte-2">{d.angle ?? angles[`p2.${d.id}`] ?? `Phrase ${i + 1}`}{i >= c.portes.p2.debuts.length ? " · banque" : ""}</span>
                          <Texte>{d.debut}</Texte>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <QuestionsRecruteurEditeur
                  libelle="Vos propres débuts de phrase"
                  placeholder="Par exemple : Quand un client demande un plat qui n'est plus disponible, je…"
                  max={LIMITES.questions_recruteur_par_porte}
                  desactive={figee}
                  questions={r.questions_recruteur.p2[comp.code] ?? []}
                  onChange={(qs) => enregistrer((x) => ({ ...x, questions_recruteur: { ...x.questions_recruteur, p2: { ...x.questions_recruteur.p2, [comp.code]: qs } } }))}
                />
              </fieldset>
            ) : null}

            {r.portes.includes("p3") ? (
              <fieldset className="carte space-y-2">
                <legend className="font-ui font-semibold px-1">Porte 3 · {nomPorte("p3")?.nom} — une version</legend>
                <ul className="space-y-1">
                  {reservoirP3(c).map((v, i) => (
                    <li key={v.id}>
                      <label className="flex items-start gap-3 min-h-11 py-1">
                        <input type="radio" name={`p3-${comp.code}`} className="mt-1" checked={s.p3 === v.id} disabled={figee} onChange={() => enregistrer((x) => ({ ...x, selection: { ...x.selection, competences: { ...x.selection.competences, [comp.code]: { ...s, p3: v.id } } } }))} />
                        <span>
                          <span className="block text-sm text-texte-2">{v.angle ?? angles[`p3.${v.id}`] ?? `Version ${i + 1}`}{i > 0 ? " · banque" : ""}</span>
                          <Texte>{v.reponse}</Texte>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ) : null}

            {r.portes.includes("p4") ? (
              <fieldset className="carte space-y-2">
                <legend className="font-ui font-semibold px-1">Porte 4 · {nomPorte("p4")?.nom} — une version</legend>
                <ul className="space-y-1">
                  {reservoirP4(c).map((v, i) => (
                    <li key={v.id}>
                      <label className="flex items-start gap-3 min-h-11 py-1">
                        <input type="radio" name={`p4-${comp.code}`} className="mt-1" checked={s.p4 === v.id} disabled={figee} onChange={() => enregistrer((x) => ({ ...x, selection: { ...x.selection, competences: { ...x.selection.competences, [comp.code]: { ...s, p4: v.id } } } }))} />
                        <span>
                          <span className="block text-sm text-texte-2">
                            {v.angle ?? angles[`p4.${v.id}`] ?? `Version ${i + 1}`} · {v.type}
                            {i > 0 ? " · banque" : ""}
                            {v.reel ? " · variante réelle disponible" : ""}
                          </span>
                          {v.titre}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ) : null}

            {r.portes.includes("p5") ? (
              <fieldset className="carte space-y-3">
                <legend className="font-ui font-semibold px-1">
                  Porte 5 · {nomPorte("p5")?.nom} — {s.p5.length} question{s.p5.length > 1 ? "s" : ""}
                </legend>
                <ul className="space-y-1">
                  {reservoirP5(c).map((q, i) => (
                    <li key={q.id}>
                      <label className="flex items-start gap-3 min-h-11 py-1">
                        <input type="checkbox" className="mt-1" checked={s.p5.includes(q.id)} disabled={figee} onChange={(e) => basculer(comp.code, "p5", q.id, e.target.checked, reservoirP5(c).map((x) => x.id))} />
                        <span>
                          <span className="block text-sm text-texte-2">{q.angle ?? angles[`p5.${q.id}`] ?? `Question ${i + 1}`}{i >= c.portes.p5.questions.length ? " · banque" : ""}</span>
                          <Texte>{q.texte}</Texte>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <QuestionsRecruteurEditeur
                  libelle="Vos propres questions"
                  placeholder="Une idée à la fois, sur une situation du poste."
                  max={LIMITES.questions_recruteur_par_porte}
                  desactive={figee}
                  questions={r.questions_recruteur.p5[comp.code] ?? []}
                  onChange={(qs) => enregistrer((x) => ({ ...x, questions_recruteur: { ...x.questions_recruteur, p5: { ...x.questions_recruteur.p5, [comp.code]: qs } } }))}
                />
              </fieldset>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
