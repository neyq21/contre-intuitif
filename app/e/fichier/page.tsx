import { EpreuveDepuisFichier } from "@/composants/epreuve/EpreuveEnLigne";

export const metadata = { title: "Ouvrir un fichier d'épreuve", robots: { index: false, follow: false } };

export default function Page() {
  return <EpreuveDepuisFichier />;
}
