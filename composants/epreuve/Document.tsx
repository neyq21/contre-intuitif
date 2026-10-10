import type { DocumentSituation } from "@/lib/contenu/types";
import { Texte } from "@/composants/Texte";

/** Document joint à une situation : liste, message ou tableau. */
export function Document({ document }: { document: DocumentSituation | null | undefined }) {
  if (!document) return null;
  return (
    <aside className="carte bg-surface-2 space-y-2" aria-label={document.titre}>
      <h4 className="font-ui font-semibold text-sm text-texte-2">{document.titre}</h4>
      {document.type === "liste" ? (
        <ul className="list-disc pl-5 space-y-1">
          {document.items.map((it, i) => (
            <li key={i}>
              <Texte>{it}</Texte>
            </li>
          ))}
        </ul>
      ) : null}
      {document.type === "message" ? (
        <div className="space-y-1">
          <p className="text-sm text-texte-2">De : {document.de}</p>
          <p>
            <Texte>{document.texte}</Texte>
          </p>
        </div>
      ) : null}
      {document.type === "tableau" ? (
        <div className="overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                {document.colonnes.map((c, i) => (
                  <th key={i} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {document.lignes.map((l, i) => (
                <tr key={i}>
                  {l.map((cell, j) => (
                    <td key={j}>
                      <Texte>{cell}</Texte>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </aside>
  );
}
