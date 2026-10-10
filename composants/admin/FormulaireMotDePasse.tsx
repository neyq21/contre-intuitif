"use client";

import { useActionState } from "react";
import { changerMotDePasseAction } from "@/app/admin/actions";

export function FormulaireMotDePasse() {
  const [etat, action, enCours] = useActionState(changerMotDePasseAction, null);
  return (
    <form action={action} className="carte space-y-3">
      <h2 className="text-xl">Changer le mot de passe</h2>
      <label className="block">
        <span className="etiquette">Mot de passe actuel</span>
        <input name="actuel" type="password" className="champ" required autoComplete="current-password" />
      </label>
      <label className="block">
        <span className="etiquette">Nouveau (12 caractères au moins)</span>
        <input name="nouveau" type="password" className="champ" required minLength={12} autoComplete="new-password" />
      </label>
      <label className="block">
        <span className="etiquette">Confirmation</span>
        <input name="confirmation" type="password" className="champ" required minLength={12} autoComplete="new-password" />
      </label>
      {etat?.message ? (
        <p role="alert" className="encart encart-alerte">
          {etat.message}
        </p>
      ) : null}
      <button type="submit" className="bouton bouton-principal" disabled={enCours}>
        Changer
      </button>
      <p className="aide">Toutes les sessions sont fermées après le changement.</p>
    </form>
  );
}
