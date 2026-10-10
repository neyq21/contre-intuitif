"use client";

/**
 * Éditeur d'un métier : tous les champs du pack (alias, 4 compétences, situations,
 * 5 portes, banque, entretien) en formulaire structuré ; mode JSON avancé replié ;
 * aperçu « comme le candidat » et « comme le recruteur » sans quitter l'admin.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Base, Pack } from "@/lib/contenu/types";
import { validerPack } from "@/lib/contenu/schema";
import { Epreuve } from "@/composants/epreuve/Epreuve";
import { Texte } from "@/composants/Texte";
import { figerEpreuve, paquetCandidat } from "@/lib/methode/epreuve";
import { nouveauRecrutement } from "@/lib/stockage/recrutements";
import { EditeurStructure, type Valeur } from "./EditeurStructure";
import { Document } from "@/composants/epreuve/Document";

type Mode = "editer" | "json" | "apercu_candidat" | "apercu_recruteur";

export function EditeurMetier({ initial, base, nouveau = false, statut, demandeId }: { initial: Pack; base: Base; nouveau?: boolean; statut: "publie" | "brouillon"; demandeId?: string }) {
  const router = useRouter();
  const [pack, setPack] = useState<Pack>(initial);
  const [mode, setMode] = useState<Mode>("editer");
  const [json, setJson] = useState("");
  const [message, setMessage] = useState<{ type: "info" | "alerte"; texte: string } | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const validation = useMemo(() => validerPack(pack), [pack]);
  const modifie = JSON.stringify(pack) !== JSON.stringify(initial);

  async function enregistrer() {
    if (!validation.ok) {
      setMessage({ type: "alerte", texte: `Le métier n'est pas valide :\n${validation.erreurs.join("\n")}` });
      return;
    }
    setEnregistrement(true);
    try {
      const rep = await fetch(nouveau ? "/api/admin/metiers" : `/api/admin/metiers/${encodeURIComponent(initial.id)}`, {
        method: nouveau ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack, demande_id: demandeId ?? null }),
      });
      const res = (await rep.json()) as { ok?: boolean; pack?: Pack; erreur?: string; erreurs?: string[] };
      if (!rep.ok || !res.pack) throw new Error(res.erreur ?? res.erreurs?.join("\n") ?? "Enregistrement impossible");
      setPack(res.pack);
      setMessage({ type: "info", texte: `Enregistré (version ${res.pack.version}, empreinte ${res.pack._pv}).${statut === "publie" ? " Le catalogue a été republié : le recruteur verra « catalogue mis à jour », ses recrutements figés gardent leurs questions." : ""}` });
      if (nouveau) router.push(`/admin/catalogue/${res.pack.id}`);
    } catch (e) {
      setMessage({ type: "alerte", texte: e instanceof Error ? e.message : "Enregistrement impossible" });
    } finally {
      setEnregistrement(false);
    }
  }

  function appliquerJson() {
    try {
      const v = JSON.parse(json) as unknown;
      const r = validerPack(v);
      if (!r.ok) return setMessage({ type: "alerte", texte: `JSON invalide :\n${r.erreurs.join("\n")}` });
      setPack(r.valeur);
      setMode("editer");
      setMessage({ type: "info", texte: "JSON appliqué (non enregistré)." });
    } catch {
      setMessage({ type: "alerte", texte: "Ce texte n'est pas un JSON lisible." });
    }
  }

  const apercu = useMemo(() => {
    if (!validation.ok) return null;
    try {
      const r = nouveauRecrutement({ pack, base, id: "apercu", poste: pack.nom });
      r.profil_travail = { essentiels: base.profil_travail.defauts[pack.id] ?? [], phrases: false };
      const figee = figerEpreuve(pack, base, r);
      return { figee, paquet: paquetCandidat(figee, base, "apercu", null) };
    } catch {
      return null;
    }
  }, [pack, base, validation.ok]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 sticky top-0 z-10 bg-fond py-2 border-b border-bord">
        <div role="tablist" className="flex flex-wrap gap-1">
          {(
            [
              ["editer", "Éditer"],
              ["apercu_candidat", "Aperçu : comme le candidat"],
              ["apercu_recruteur", "Aperçu : comme le recruteur"],
              ["json", "JSON avancé"],
            ] as [Mode, string][]
          ).map(([m, l]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} className={`bouton min-h-9 text-sm ${mode === m ? "bouton-principal" : ""}`} onClick={() => {
              if (m === "json") setJson(JSON.stringify(pack, null, 2));
              setMode(m);
            }}>
              {l}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!validation.ok ? <span className="pilule pilule-niveau-1">{validation.erreurs.length} erreur{validation.erreurs.length > 1 ? "s" : ""}</span> : <span className="pilule pilule-niveau-3">valide</span>}
          {modifie ? <span className="pilule">modifié</span> : null}
          <button type="button" className="bouton bouton-encre min-h-9" disabled={enregistrement || (!modifie && !nouveau)} onClick={enregistrer}>
            {enregistrement ? "Enregistrement…" : nouveau ? "Créer le métier (brouillon)" : "Enregistrer"}
          </button>
        </div>
      </div>
      {message ? (
        <p role={message.type === "alerte" ? "alert" : "status"} className={`encart whitespace-pre-wrap ${message.type === "alerte" ? "encart-alerte" : ""}`}>
          {message.texte}
        </p>
      ) : null}
      {!validation.ok ? (
        <details className="encart encart-alerte text-sm">
          <summary className="cursor-pointer">Erreurs de validation</summary>
          <ul className="list-disc pl-5 mt-1">
            {validation.erreurs.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {mode === "editer" ? (
        <div className="space-y-3">
          <p className="aide">
            Les textes gardent les marqueurs <code>**mot**</code> pour les mots clés surlignés. Les repères pointent vers les identifiants de « Textes et barèmes → Repères ». Si le contenu change, la version et l&apos;empreinte sont recalculées à l&apos;enregistrement.
          </p>
          <EditeurStructure valeur={pack as unknown as Valeur} onChange={(v) => setPack(v as unknown as Pack)} />
        </div>
      ) : null}

      {mode === "json" ? (
        <div className="space-y-2">
          <p className="aide">Mode avancé : collez un pack complet (ci5p-pack/3). Il est validé avant d&apos;être appliqué.</p>
          <textarea className="champ font-mono text-xs" rows={30} value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} />
          <button type="button" className="bouton" onClick={appliquerJson}>
            Appliquer le JSON
          </button>
        </div>
      ) : null}

      {mode === "apercu_candidat" ? (
        apercu ? (
          <div className="rounded-m border border-bord bg-fond p-4">
            <p className="aide mb-3">Aperçu : rien n&apos;est enregistré, les réponses ne vont nulle part.</p>
            <Epreuve key={JSON.stringify(pack).length} paquet={apercu.paquet} onTerminer={() => setMessage({ type: "info", texte: "Fin de l'aperçu : rien n'a été enregistré." })} libelleFin="Terminer l'aperçu" />
          </div>
        ) : (
          <p className="encart encart-alerte">Corrigez les erreurs de validation pour voir l&apos;aperçu.</p>
        )
      ) : null}

      {mode === "apercu_recruteur" ? (
        apercu ? (
          <article className="space-y-6 max-w-[52rem]">
            <h1 className="text-4xl">{pack.nom}</h1>
            <p className="text-xl text-texte-2">{pack.resume}</p>
            <p>
              <strong>Le cadre :</strong> {pack.contexte} {pack.cadre}
            </p>
            <p className="text-sm text-texte-2">Alias : {pack.alias.join(" · ") || "—"}</p>
            {apercu.figee.competences.map((c, i) => (
              <section key={c.code} className="carte space-y-3">
                <h2 className="text-2xl">
                  {i + 1}. {c.code} · {c.titre} <span className="pilule">niveau requis {c.niveau_requis}</span>
                </h2>
                <p className="text-texte-2">{c.pourquoi}</p>
                <div className="rounded-s bg-surface-2 p-3 space-y-1">
                  <p className="font-semibold">{c.situation.titre}</p>
                  <p>
                    <Texte>{c.situation.texte}</Texte>
                  </p>
                  <Document document={c.situation.document} />
                </div>
                <details>
                  <summary className="cursor-pointer underline text-sm">Porte 1 : questions et corrigés</summary>
                  <ol className="mt-2 space-y-2 text-sm">
                    {c.portes.p1?.questions.map((q) => (
                      <li key={q.id}>
                        <Texte>{q.texte}</Texte>
                        <ul className="pl-4">
                          {q.options.map((o) => (
                            <li key={o.id}>
                              {o.id}. <Texte>{o.texte}</Texte> — {o.points} pt{o.repere ? ` · ${o.repere}` : ""}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                </details>
                <details>
                  <summary className="cursor-pointer underline text-sm">Porte 2 : réponses prévues</summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {c.portes.p2?.debuts.map((d) => (
                      <li key={d.id}>
                        <Texte>{d.debut}</Texte> — justes : {d.justes.map((j) => j.texte).join(" · ")}
                      </li>
                    ))}
                  </ul>
                </details>
                <details>
                  <summary className="cursor-pointer underline text-sm">Porte 3</summary>
                  <p className="mt-2 text-sm">
                    <Texte>{c.portes.p3?.reponse ?? ""}</Texte> {c.portes.p3?.explication ? `— ${c.portes.p3.explication}` : ""}
                  </p>
                </details>
                <details>
                  <summary className="cursor-pointer underline text-sm">Porte 4 : {c.portes.p4?.type}</summary>
                  <p className="mt-2 text-sm">
                    {c.portes.p4?.titre} — <Texte>{c.portes.p4?.consigne ?? ""}</Texte>
                  </p>
                  {c.portes.p4?.reel ? <p className="text-sm text-texte-2">Variante réelle : {c.portes.p4.reel.consigne}</p> : null}
                </details>
                <details>
                  <summary className="cursor-pointer underline text-sm">Porte 5 : réponses prévues</summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {c.portes.p5?.questions.map((q) => (
                      <li key={q.id}>
                        <Texte>{q.texte}</Texte> — justes : {q.justes.map((j) => j.texte).join(" · ")}
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            ))}
            <section className="carte space-y-2">
              <h2 className="text-2xl">Entretien</h2>
              <ol className="space-y-1 text-sm">
                {apercu.figee.entretien.questions.map((q, i) => (
                  <li key={q.id}>
                    {i + 1}. <Texte>{q.texte}</Texte> <span className="pilule text-xs">{q.competence}</span> — attendus : {q.attendus.join(" · ")}
                  </li>
                ))}
              </ol>
            </section>
          </article>
        ) : (
          <p className="encart encart-alerte">Corrigez les erreurs de validation pour voir l&apos;aperçu.</p>
        )
      ) : null}
    </div>
  );
}
