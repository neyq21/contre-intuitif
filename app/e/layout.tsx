/** Épreuve candidat : page nue, sans navigation, sans compte. */
export default function LayoutEpreuve({ children }: { children: React.ReactNode }) {
  return (
    <main id="contenu" className="flex-1 px-4 py-6 tel:px-8 tel:py-10">
      {children}
    </main>
  );
}
