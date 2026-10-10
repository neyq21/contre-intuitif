/**
 * Chiffrement du paquet d'épreuve dans le navigateur (AES-GCM 256).
 * La clé reste dans le fragment d'URL (#k=…), jamais dans la query string,
 * jamais envoyée au serveur. Le blob = base64url(iv ‖ chiffré).
 */
import type { PaquetCandidat } from "@/lib/stockage/modele";

function versBase64Url(octets: Uint8Array): string {
  let s = "";
  for (const b of octets) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function depuisBase64Url(texte: string): Uint8Array {
  const b64 = texte.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (texte.length % 4)) % 4);
  const s = atob(b64);
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o;
}

async function comprimer(texte: string): Promise<Uint8Array> {
  const flux = new Blob([new TextEncoder().encode(texte)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}
async function decomprimer(octets: Uint8Array): Promise<string> {
  const flux = new Blob([octets as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new TextDecoder().decode(await new Response(flux).arrayBuffer());
}

export async function chiffrerPaquet(paquet: PaquetCandidat): Promise<{ blob: string; cle: string }> {
  const subtle = globalThis.crypto.subtle;
  const cle = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const clair = await comprimer(JSON.stringify(paquet));
  const chiffre = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, cle, clair as BufferSource));
  const blob = new Uint8Array(iv.length + chiffre.length);
  blob.set(iv, 0);
  blob.set(chiffre, iv.length);
  const brute = new Uint8Array(await subtle.exportKey("raw", cle));
  return { blob: versBase64Url(blob), cle: versBase64Url(brute) };
}

export async function dechiffrerPaquet(blob: string, cle: string): Promise<PaquetCandidat> {
  const subtle = globalThis.crypto.subtle;
  const octets = depuisBase64Url(blob);
  const iv = octets.slice(0, 12);
  const chiffre = octets.slice(12);
  const k = await subtle.importKey("raw", depuisBase64Url(cle) as BufferSource, { name: "AES-GCM" }, false, ["decrypt"]);
  const clair = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv }, k, chiffre as BufferSource));
  return JSON.parse(await decomprimer(clair)) as PaquetCandidat;
}

/** Lit la clé dans le fragment d'URL (#k=…). */
export function cleDepuisFragment(hash: string): string | null {
  const m = hash.match(/(?:^#|&)k=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
