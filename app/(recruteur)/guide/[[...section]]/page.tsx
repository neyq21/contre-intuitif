import Link from "next/link";
import { notFound } from "next/navigation";
import { Texte, TexteAvecSources } from "@/composants/Texte";
import { ouvrirBase, lireBase, lirePacksPublies } from "@/lib/stockage/sqlite";
import { motsClesMetier, SYNONYMES } from "@/lib/methode/besoin";
import { REGLE_ANALYSES } from "@/lib/methode/regles-texte";

export const dynamic = "force-dynamic";
export const metadata = { title: "Méthode et droit" };

const SECTIONS = [
  { id: "methode", libelle: "La méthode" },
  { id: "portes", libelle: "Les règles des portes" },
  { id: "droit", libelle: "Le droit : check-list" },
  { id: "ne-pas-noter", libelle: "Ne pas noter" },
  { id: "analyses", libelle: "Comment les analyses sont calculées" },
  { id: "questions", libelle: "Choisir les questions" },
  { id: "deroule", libelle: "Le déroulé de l'épreuve" },
  { id: "profils", libelle: "Bien accueillir" },
  { id: "pilote", libelle: "Le pilote de 8 semaines" },
  { id: "faq", libelle: "Questions fréquentes" },
  { id: "limites", libelle: "Les limites" },
  { id: "sources", libelle: "Les 49 sources" },
] as const;

export default async function PageGuide({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  const id = section?.[0] ?? "methode";
  if (!SECTIONS.some((s) => s.id === id)) notFound();
  const db = ouvrirBase();
  const base = lireBase(db);
  const courante = SECTIONS.find((s) => s.id === id)!;

  return (
    <div className="tel:grid tel:grid-cols-[240px_1fr] tel:gap-8">
      <nav aria-label="Méthode et droit" className="no-print mb-6 tel:mb-0">
        <h1 className="text-2xl mb-3">Méthode et droit</h1>
        <ul className="flex tel:flex-col gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <Link href={`/guide/${s.id}`} aria-current={s.id === id ? "page" : undefined} className={`block rounded-pilule px-3 py-2 whitespace-nowrap ${s.id === id ? "bg-accent-fond text-accent-fond-texte" : "hover:bg-surface-2"}`}>
                {s.libelle}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="prose-ci max-w-[48rem] space-y-6 min-w-0">
        <h2 className="text-4xl">{courante.libelle}</h2>

        {id === "methode" ? (
          <>
            <p className="text-lg text-texte-2">{base.meta.sous_titre}.</p>
            <ol className="space-y-4">
              {base.guide.methode1.map(([titre, texte, sources], i) => (
                <li key={i} className="carte space-y-1">
                  <h3 className="text-2xl">{titre}</h3>
                  <p>
                    <TexteAvecSources>{texte + " " + sources.map((s) => `[${s}]`).join("")}</TexteAvecSources>
                  </p>
                </li>
              ))}
            </ol>
            <h3 className="text-2xl">Les cinq portes</h3>
            <p>
              <TexteAvecSources>{base.guide.methode2}</TexteAvecSources>
            </p>
            <ul className="grid gap-3 tel:grid-cols-2">
              {base.portes.map((p) => (
                <li key={p.id} className="carte space-y-1">
                  <span className="pilule">Porte {p.n}</span>
                  <h4 className="text-xl">{p.nom}</h4>
                  <p className="text-sm">{p.recruteur}</p>
                  <p className="text-xs text-texte-3">Durée indicative : {p.duree}. Jamais un chronomètre.</p>
                </li>
              ))}
            </ul>
            <h3 className="text-2xl">Un exemple, les cinq portes sur une même situation</h3>
            <div className="carte space-y-2">
              <p>
                <strong>Situation :</strong> {base.exemple.situation}
              </p>
              <p>
                <strong>Porte 1.</strong> {base.exemple.p1.texte} {base.exemple.p1.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join(" ")}
              </p>
              <p>
                <strong>Porte 2.</strong> {base.exemple.p2.debut}
              </p>
              <p>
                <strong>Porte 3.</strong> {base.exemple.p3.reponse} {base.exemple.p3.consigne}
              </p>
              <p>
                <strong>Porte 4.</strong> {base.exemple.p4.consigne} {base.exemple.p4.elements.join(" · ")}
              </p>
              <p>
                <strong>Porte 5.</strong> {base.exemple.p5.texte}
              </p>
            </div>
            <h3 className="text-2xl">Les huit compétences transverses</h3>
            <ul className="space-y-3">
              {base.competences.map((c) => (
                <li key={c.code} className="carte space-y-1">
                  <h4 className="text-xl">
                    {c.code} · {c.nom}
                  </h4>
                  <p>{c.definition}</p>
                  <dl className="text-sm space-y-1">
                    {(["1", "2", "3", "4"] as const).map((n) => (
                      <div key={n}>
                        <dt className={`pilule pilule-niveau-${n} mr-2`}>
                          {n} · {base.niveaux[n]}
                        </dt>
                        <dd className="inline">{c.ancres[n]}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="aide">Attention : {c.attention}</p>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {id === "portes" ? (
          <>
            <ul className="space-y-2">
              {base.guide.regles_portes.map((r, i) => (
                <li key={i} className="carte">
                  <Texte>{r}</Texte>
                </li>
              ))}
            </ul>
            <h3 className="text-2xl">Les questions à éviter, et quoi dire à la place</h3>
            <ul className="space-y-2">
              {base.a_eviter.map((a) => (
                <li key={a.question} className="carte space-y-1 text-sm">
                  <p className="font-semibold">{a.question}</p>
                  <p>
                    <TexteAvecSources>{a.pourquoi}</TexteAvecSources>
                  </p>
                  <p className="text-texte-2">À la place : {a.a_la_place}</p>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {id === "droit" ? (
          <>
            <p className="aide">Ce kit n&apos;est pas un avis juridique. Faites valider la notice d&apos;information et les durées de conservation par votre DPO. Sources vérifiées {base.meta.sources_verifiees}.</p>
            {base.checklist.map((section) => (
              <section key={section.titre} className="space-y-2">
                <h3 className="text-2xl">{section.titre}</h3>
                <ul className="space-y-2">
                  {section.items.map((it, i) => (
                    <li key={i} className="carte space-y-1 text-sm">
                      <label className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1 no-print" aria-label="Fait" />
                        <span>
                          <span className="block font-semibold">{it.texte}</span>
                          <span className="block text-texte-2">{it.statut}</span>
                          <span className="block">{it.comment}</span>
                          <span className="block text-texte-3">
                            Sources :{" "}
                            {it.sources.map((s, k) => (
                              <Link key={s} href={`/guide/sources#source-${s}`} className="underline">
                                {k > 0 ? ", " : ""}[{s}]
                              </Link>
                            ))}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <h3 className="text-2xl">Textes utiles</h3>
            {base.bonus.map((b) => (
              <div key={b.titre} className="carte space-y-1">
                <h4 className="font-ui font-semibold">{b.titre}</h4>
                <pre className="whitespace-pre-wrap font-ui text-sm">{b.texte}</pre>
              </div>
            ))}
          </>
        ) : null}

        {id === "ne-pas-noter" ? (
          <ul className="space-y-2">
            {base.ne_pas_noter.map((n) => (
              <li key={n.titre} className="carte">
                <strong>{n.titre}.</strong>{" "}
                <span className="text-texte-2">
                  <TexteAvecSources>{n.raison}</TexteAvecSources>
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {id === "analyses" ? (
          <>
            <p className="aide">Les calculs suivent des règles fixes, écrites à l&apos;avance. Aucune intelligence artificielle, aucune moyenne, aucun commentaire généré.</p>
            {(
              [
                ["Porte 1 · Choix multiples", base.baremes.p1.texte],
                ["Porte 2 · Phrases à compléter", base.baremes.p2.texte],
                ["Porte 3 · Retrouvez la question", base.baremes.p3.texte],
                ["Porte 4 · Défi pratique", base.baremes.p4.texte],
                ["Porte 4 · Variante en situation réelle", base.baremes.reel.texte],
                ["Porte 5 · Oral ou écrit", base.baremes.p5.texte],
                ["Entretien structuré", base.baremes.entretien.texte],
              ] as const
            ).map(([titre, texte]) => (
              <div key={titre} className="carte space-y-1">
                <h3 className="text-xl">{titre}</h3>
                <p>{texte}</p>
              </div>
            ))}
            {REGLE_ANALYSES.map((bloc) => (
              <div key={bloc.titre} className="carte space-y-1">
                <h3 className="text-xl">{bloc.titre}</h3>
                {bloc.paragraphes.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ))}
            <h3 className="text-2xl">Les niveaux</h3>
            <ul className="flex flex-wrap gap-2">
              {(["1", "2", "3", "4"] as const).map((n) => (
                <li key={n} className={`pilule pilule-niveau-${n}`}>
                  {n} · {base.niveaux[n]}
                </li>
              ))}
            </ul>
            <h3 className="text-2xl">Les repères</h3>
            <p className="aide">Chaque réponse prévue pointe vers un repère : ce que la personne a montré (+) ou un point à vérifier (−). Les repères nourrissent l&apos;analyse, le profil de travail et le brouillon de retour.</p>
            <ul className="grid gap-1 tel:grid-cols-2 text-sm">
              {base.reperes.map((r) => (
                <li key={r.id}>
                  <span className="pilule mr-1">{r.comp}</span>
                  {r.sens === "+" ? "+ " : "− "}
                  {r.label}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {id === "questions" ? <SectionQuestions base={base} /> : null}

        {id === "deroule" ? (
          <>
            <div className="carte space-y-2">
              <p>
                En option, le déroulé de l&apos;épreuve garde, pour chaque personne, sa démarche : portes regardées et essayées, réponses changées, retours, relectures. <strong>Le temps n&apos;est jamais mesuré</strong> : ni chronomètre, ni durée. <strong>Jamais dans la note.</strong> Il sert à préparer des questions sur sa méthode de travail.
              </p>
              <p>La personne en est prévenue (e-mail 2, notice, écran d&apos;accueil de l&apos;épreuve) et peut le refuser en un clic. Il n&apos;est jamais proposé à une personne qui a signalé un besoin d&apos;aménagement, ni avec le lien d&apos;annonce. Il n&apos;est pas dans l&apos;archive de fin de recrutement.</p>
              <p>
                À partir de 50 salariés, informez le CSE. Vérifiez avec votre DPO si une analyse d&apos;impact (AIPD) est nécessaire. Voir la check-list{" "}
                <Link href="/guide/droit" className="underline">
                  Le droit
                </Link>
                .
              </p>
            </div>
            <div className="carte">
              <h3 className="text-xl">La question du chronomètre</h3>
              <p>
                <TexteAvecSources>{base.guide.faq.find(([q]) => q.includes("chronométrer"))?.[1] ?? ""}</TexteAvecSources>
              </p>
            </div>
          </>
        ) : null}

        {id === "profils" ? (
          <>
            <p className="aide">Des aides d&apos;accueil, jamais une case à cocher sur la personne, jamais un score. On ne devine jamais un profil à partir de la porte choisie.</p>
            <ul className="space-y-3">
              {base.profils.map((p) => (
                <li key={p.id} className="carte space-y-1" style={{ borderLeft: `6px solid ${p.couleur}` }}>
                  <h3 className="text-xl">{p.nom}</h3>
                  <p className="text-sm text-texte-2">{p.inclut}</p>
                  <p className="text-sm">
                    <TexteAvecSources>{p.chiffre}</TexteAvecSources>
                  </p>
                  <p>
                    <strong>Obstacle :</strong> <TexteAvecSources>{p.obstacle}</TexteAvecSources>
                  </p>
                  <p>
                    <strong>Ce qui aide :</strong> <TexteAvecSources>{p.aide}</TexteAvecSources>
                  </p>
                </li>
              ))}
            </ul>
            <h3 className="text-2xl">Les besoins qu&apos;on peut proposer</h3>
            <ul className="flex flex-wrap gap-2">
              {base.besoins.map((b) => (
                <li key={b} className="pilule">
                  {b}
                </li>
              ))}
            </ul>
            <h3 className="text-2xl">{base.profil_travail.titre}</h3>
            <p className="aide">Huit savoir-être, formulés comme dans une offre de France Travail. Jusqu&apos;à {base.profil_travail.max_essentiels} par poste.</p>
            <ul className="grid gap-2 tel:grid-cols-2">
              {base.profil_travail.dimensions.map((d) => (
                <li key={d.id} className="carte text-sm space-y-1">
                  <strong>{d.nom}</strong>
                  <p>{d.definition}</p>
                  <p className="text-texte-2">Question d&apos;entretien : {d.question}</p>
                  <p className="text-texte-2">Pour l&apos;accueil : {d.aide}</p>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {id === "pilote" ? (
          <ol className="space-y-2">
            {base.guide.pilote.map(([semaine, titre, texte]) => (
              <li key={semaine} className="carte">
                <span className="pilule mr-2">{semaine}</span>
                <strong>{titre}.</strong>{" "}
                <TexteAvecSources>{texte}</TexteAvecSources>
              </li>
            ))}
          </ol>
        ) : null}

        {id === "faq" ? (
          <ul className="space-y-2">
            {base.guide.faq.map(([q, rep]) => (
              <li key={q}>
                <details className="carte">
                  <summary className="cursor-pointer font-semibold">{q}</summary>
                  <p className="mt-2">
                    <TexteAvecSources>{rep}</TexteAvecSources>
                  </p>
                </details>
              </li>
            ))}
          </ul>
        ) : null}

        {id === "limites" ? (
          <>
            <ul className="space-y-2">
              {base.guide.limites.map((l, i) => (
                <li key={i} className="carte">
                  <TexteAvecSources>{l}</TexteAvecSources>
                </li>
              ))}
            </ul>
            <p className="aide">Ce kit n&apos;est ni un avis juridique, ni un outil de diagnostic, ni une intelligence artificielle. La décision de recrutement reste la vôtre.</p>
          </>
        ) : null}

        {id === "sources" ? (
          <>
            <p className="aide">Sources vérifiées {base.meta.sources_verifiees}. Les textes évoluent : vérifiez les liens avant usage. Les sources citées appartiennent à leurs auteurs.</p>
            {[...new Set(base.sources.map((s) => s.cat))].map((cat) => (
              <section key={cat} className="space-y-2">
                <h3 className="text-2xl">{cat}</h3>
                <ol className="space-y-2">
                  {base.sources
                    .filter((s) => s.cat === cat)
                    .map((s) => (
                      <li key={s.n} id={`source-${s.n}`} className="carte text-sm scroll-mt-4">
                        <span className="pilule mr-2">[{s.n}]</span>
                        {s.texte}{" "}
                        <a href={s.url} className="underline break-all" rel="noreferrer noopener" target="_blank">
                          {s.url}
                        </a>
                      </li>
                    ))}
                </ol>
              </section>
            ))}
          </>
        ) : null}
      </article>
    </div>
  );
}

function SectionQuestions({ base }: { base: ReturnType<typeof lireBase> }) {
  const packs = lirePacksPublies(ouvrirBase());
  return (
    <>
      <div className="carte space-y-2">
        <p>
          <TexteAvecSources>{base.guide.faq.find(([q]) => q.includes("choisir les questions"))?.[1] ?? ""}</TexteAvecSources>
        </p>
        <p>
          <TexteAvecSources>{base.guide.faq.find(([q]) => q.includes("propres questions"))?.[1] ?? ""}</TexteAvecSources>
        </p>
      </div>
      <h3 className="text-2xl">« Décrire mon besoin » : les mots-clés, toujours les mêmes</h3>
      <p className="aide">
        <TexteAvecSources>{base.guide.faq.find(([q]) => q.includes("sans IA"))?.[1] ?? ""}</TexteAvecSources>
      </p>
      <h4 className="text-xl">Réglages reconnus</h4>
      <ul className="carte text-sm space-y-1">
        <li>
          <strong>Niveau requis 2 :</strong> débutant, débutante, sans expérience, première expérience, junior, apprenti, alternance.
        </li>
        <li>
          <strong>Niveau requis 3 au moins :</strong> confirmé, expérimenté, senior, autonome tout de suite.
        </li>
        <li>
          <strong>Épreuve courte :</strong> épreuve courte, court, rapide, vite, peu de temps.
        </li>
        <li>
          <strong>Épreuve longue :</strong> épreuve complète, épreuve longue, approfondi, complet.
        </li>
        <li>
          <strong>Sans phrases à compléter :</strong> sans écrit, pas d&apos;écrit, peu d&apos;écrit, oral, à l&apos;oral.
        </li>
        <li>
          <strong>Recrutement inclusif :</strong> inclusif, neurodivergent, neuroatypique, aménagement, handicap (rappel du fonctionnement du kit).
        </li>
        <li>
          <strong>Savoir-être mis en avant :</strong> fiable, ponctuel, sérieux, rigoureux ; coup de feu, rush, pression, stress ; équipe, collectif ; clients, accueil, sens du service.
        </li>
      </ul>
      <h4 className="text-xl">Métiers reconnus (nom, alias du métier, synonymes)</h4>
      <ul className="grid gap-2 tel:grid-cols-2 text-sm">
        {packs.map((p) => (
          <li key={p.id} className="carte">
            <strong>{p.nom}</strong>
            <p className="text-texte-2">{motsClesMetier(p).join(" · ")}</p>
          </li>
        ))}
      </ul>
      <p className="aide">{Object.keys(SYNONYMES).length} tables de synonymes dans le code, alimentées par les alias des métiers.</p>
    </>
  );
}
