"use client";

import { useRef, useState } from "react";
import { useStaffAuth } from "./useStaffAuth";
import { optimizedImage } from "@/lib/images";

const MAX_SIZE_MB = 10;

/**
 * Envoi d'une photo produit vers Cloudinary, signé par le backend : seul un
 * membre du staff connecté peut envoyer, et le secret Cloudinary reste sur
 * le serveur. On peut aussi coller l'adresse d'une image.
 */
export default function ImageUploader({ value, onChange }) {
  const { API, authFetch } = useStaffAuth();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Ce fichier n'est pas une image.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`Image trop lourde (maximum ${MAX_SIZE_MB} Mo).`);
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      // 1. Signature d'envoi demandée au backend
      const signRes = await authFetch(`${API}/staff/cloudinary-signature/`, { method: "POST" });
      const sign = await signRes.json().catch(() => ({}));
      if (!signRes.ok) throw new Error(sign.detail || "L'envoi de photos n'est pas disponible pour le moment.");

      // 2. Envoi direct de la photo à Cloudinary avec cette signature
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sign.api_key);
      fd.append("timestamp", String(sign.timestamp));
      fd.append("folder", sign.folder);
      fd.append("signature", sign.signature);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloud_name}/image/upload`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.secure_url) {
        throw new Error("La photo n'a pas pu être envoyée. Réessayez.");
      }
      onChange(data.secure_url);
    } catch (e) {
      setUploadError(String(e.message || e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {value ? (
        <div className="relative h-40 overflow-hidden rounded-xl bg-white/5">
          <img src={optimizedImage(value, 400)} alt="Aperçu de la photo" className="h-full w-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">Envoi en cours…</div>
          )}
        </div>
      ) : (
        <div className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-sm text-white/60">
          {uploading ? "Envoi en cours…" : "Pas encore de photo"}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="min-h-11 cursor-pointer rounded-xl border border-white/15 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {value ? "Changer la photo" : "Choisir une photo"}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="min-h-11 cursor-pointer rounded-xl px-4 text-sm font-semibold text-red-300"
          >
            Retirer
          </button>
        )}
      </div>

      {uploadError && <p role="alert" className="text-sm text-red-300">{uploadError}</p>}

      <label className="block">
        <span className="sr-only">Ou coller l&apos;adresse d&apos;une image</span>
        <input
          type="url"
          placeholder="Ou coller l'adresse d'une image"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40"
        />
      </label>
    </div>
  );
}
