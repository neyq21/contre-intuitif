"use client";

import { useActionState } from "react";
import { connecter } from "@/app/admin/actions";

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(connecter, null);
  return (
    <form action={action} className="carte space-y-3">
      <label className="block">
        <span className="etiquette">E-mail</span>
        <input name="email" type="email" className="champ" required autoComplete="username" defaultValue={etat?.email ?? ""} />
      </label>
      <label className="block">
        <span className="etiquette">Mot de passe</span>
        <input name="mot_de_passe" type="password" className="champ" required autoComplete="current-password" />
      </label>
      {etat?.erreur ? (
        <p role="alert" className="encart encart-alerte">
          {etat.erreur}
        </p>
      ) : null}
      <button type="submit" className="bouton bouton-principal" disabled={enCours}>
        Se connecter
      </button>
    </form>
  );
}
