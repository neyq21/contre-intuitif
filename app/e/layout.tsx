/** Épreuve candidat : page nue, sans navigation, sans compte. */
export default function LayoutEpreuve({ children }: { children: React.ReactNode }) {
  return (
    <main id="contenu" className="flex-1 px-4 py-6 tel:px-8 tel:py-10">
      {children}
      <p className="mx-auto mt-10 max-w-[760px] text-xs text-texte-3">
        Cette épreuve n&apos;utilise aucune intelligence artificielle, ne mesure pas le temps et n&apos;enregistre ni image ni voix. Ce n&apos;est ni un outil de diagnostic, ni un avis juridique. Vos réponses restent dans votre navigateur jusqu&apos;à ce que vous les rendiez.
      </p>
    </main>
  );
}
