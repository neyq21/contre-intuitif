import Link from "next/link";

/** Mentions obligatoires : ni avis juridique, ni diagnostic, ni intelligence artificielle. */
export function Mentions({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`text-texte-3 ${compact ? "text-xs" : "text-sm"}`}>
      Ce kit n&apos;est ni un avis juridique, ni un outil de diagnostic, ni une intelligence artificielle : les calculs suivent des règles fixes, expliquées dans{" "}
      <Link href="/guide/analyses" className="underline">
        « Comment les analyses sont calculées »
      </Link>
      . Les décisions de recrutement restent celles de l&apos;employeur.{" "}
      <Link href="/licence" className="underline">
        Licence
      </Link>
      .
    </p>
  );
}
