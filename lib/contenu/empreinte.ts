/**
 * Empreinte `_pv` d'un pack : 10 premiers caractères hexadécimaux du SHA-256
 * du JSON canonique (clés triées, sans `_pv`).
 * Fonctionne sur le serveur (node:crypto) et dans le navigateur (WebCrypto).
 */
import type { Pack } from "./types";

export function jsonCanonique(valeur: unknown): string {
  if (valeur === null || typeof valeur !== "object") return JSON.stringify(valeur);
  if (Array.isArray(valeur)) return `[${valeur.map(jsonCanonique).join(",")}]`;
  const obj = valeur as Record<string, unknown>;
  const cles = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${cles.map((k) => `${JSON.stringify(k)}:${jsonCanonique(obj[k])}`).join(",")}}`;
}

function sansPv(pack: Pack): Omit<Pack, "_pv"> {
  const { _pv: _ignore, ...reste } = pack;
  void _ignore;
  return reste;
}

async function sha256Hex(texte: string): Promise<string> {
  const data = new TextEncoder().encode(texte);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const h = await subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(h))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(data).digest("hex");
}

export async function calculerEmpreinte(pack: Pack): Promise<string> {
  return (await sha256Hex(jsonCanonique(sansPv(pack)))).slice(0, 10);
}

export async function avecEmpreinte(pack: Pack): Promise<Pack> {
  return { ...pack, _pv: await calculerEmpreinte(pack) };
}

/** Empreinte synchrone côté serveur (seed, API). */
export function calculerEmpreinteSync(pack: Pack): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return createHash("sha256").update(jsonCanonique(sansPv(pack))).digest("hex").slice(0, 10);
}
