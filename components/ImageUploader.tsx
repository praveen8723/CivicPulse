"use client";
import { Camera, ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
export function ImageUploader({
  value,
  onChange,
  label = "Add a photo",
  sample = false,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  label?: string;
  sample?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function read(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width * scale;
      canvas.height = bitmap.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw Error();
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      onChange(canvas.toDataURL("image/jpeg", 0.72));
    } catch {
      setError("This image could not be opened. Try another photo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="image-uploader">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          void read(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="image-preview">
          <img src={value} alt="Photo attached to this civic report" />
          <button
            type="button"
            className="icon-button"
            aria-label="Remove photo"
            onClick={() => onChange(undefined)}
          >
            <X size={18} />
          </button>
          <span>
            <Camera size={14} />
            Photo attached
          </span>
        </div>
      ) : (
        <button
          type="button"
          className="upload-zone"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void read(e.dataTransfer.files[0]);
          }}
          disabled={busy}
        >
          <span className="upload-icon">
            <ImagePlus size={26} />
          </span>
          <strong>{busy ? "Preparing your photo…" : label}</strong>
          <span>
            Drop an image here or <b>browse files</b>
          </span>
          <small>JPG, PNG, WebP · up to 10 MB</small>
        </button>
      )}
      {sample && (
        <button
          type="button"
          className="sample-photo-link"
          onClick={() => onChange("/demo-pothole.png")}
        >
          Use illustrative pothole photo
        </button>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
