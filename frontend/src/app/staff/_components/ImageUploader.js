"use client";

import { useRef, useState } from "react";

const CLOUDINARY_CLOUD_NAME    = "dqeereccn";
const CLOUDINARY_UPLOAD_PRESET = "sushi-upload";

export default function ImageUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Fichier non supporté. Choisissez une image.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: fd }
      );
      if (!res.ok) throw new Error("Erreur lors de l'envoi vers Cloudinary.");
      const data = await res.json();

      const imageUrl = data.secure_url;
      if (!imageUrl) throw new Error("URL image non reçue de Cloudinary.");

      onChange(imageUrl);
    } catch (e) {
      setUploadError(String(e.message || e));
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        className={`relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition ${
          dragging   ? "border-zinc-400 bg-zinc-100" :
          uploading  ? "border-zinc-200 bg-zinc-50 cursor-wait" :
                       "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />

        {value ? (
          <div className="relative h-40">
            <img src={value} alt="Aperçu" className="h-full w-full object-cover" />
            {!uploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 opacity-0 transition hover:opacity-100">
                <p className="text-xs font-semibold text-white">Changer l&apos;image</p>
                <p className="text-[10px] text-white/70">Clic ou glisser</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <span className="text-2xl">🖼️</span>
            <p className="text-xs font-medium text-zinc-500">Glisser une image ici</p>
            <p className="text-[10px] text-zinc-400">ou cliquer pour parcourir</p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700" />
            <p className="text-xs text-zinc-500">Upload en cours…</p>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="mt-1.5 text-xs text-red-500">{uploadError}</p>
      )}

      {!value && !uploading && (
        <input
          type="text"
          placeholder="Ou coller une URL d'image…"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs outline-none transition focus:border-zinc-400 focus:bg-white"
        />
      )}
    </div>
  );
}
