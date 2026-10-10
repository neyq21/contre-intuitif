import type { ReactNode } from "react";

/**
 * Rend un texte du kit : `**mots**` deviennent des mots clés surlignés
 * (le kit met en vert ce qui est demandé), les retours à la ligne sont gardés.
 * Pas de HTML brut : tout passe par des nœuds React.
 */
export function Texte({ children, surligner = true, className }: { children: string; surligner?: boolean; className?: string }) {
  const lignes = children.split("\n");
  const noeuds: ReactNode[] = [];
  lignes.forEach((ligne, i) => {
    if (i > 0) noeuds.push(<br key={`br${i}`} />);
    const morceaux = ligne.split(/(\*\*[^*]+\*\*)/g);
    morceaux.forEach((m, j) => {
      if (m.startsWith("**") && m.endsWith("**")) {
        const mot = m.slice(2, -2);
        noeuds.push(
          surligner ? (
            <mark key={`${i}-${j}`} className="mot-cle">
              {mot}
            </mark>
          ) : (
            <strong key={`${i}-${j}`}>{mot}</strong>
          ),
        );
      } else if (m) {
        noeuds.push(m);
      }
    });
  });
  return <span className={className}>{noeuds}</span>;
}

/** Retire les marqueurs `**` (pour les attributs, l'impression ou les fichiers). */
export function texteSimple(t: string): string {
  return t.replace(/\*\*([^*]+)\*\*/g, "$1");
}

/** Remplace les renvois « [12] » par un lien vers la source du guide. */
export function TexteAvecSources({ children }: { children: string }) {
  const morceaux = children.split(/(\[\d+(?:\]\[\d+)*\]|\[\d+(?:,\s*\d+)*\])/g);
  return (
    <>
      {morceaux.map((m, i) => {
        const nums = m.match(/^\[([\d\]\[,\s]+)\]$/);
        if (!nums) return <Texte key={i}>{m}</Texte>;
        const ids = nums[1].split(/[\]\[,\s]+/).filter(Boolean);
        return (
          <sup key={i} className="ml-0.5">
            {ids.map((n, k) => (
              <a key={n} href={`/guide/sources#source-${n}`} className="underline text-texte-2">
                {k > 0 ? "," : ""}[{n}]
              </a>
            ))}
          </sup>
        );
      })}
    </>
  );
}
