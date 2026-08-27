"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ClothingCategories, ClothingSeasons, type ClothingCategory, type ClothingSeason } from "@fashion-platform/shared";
import { Dropzone, DROPZONE_ACCEPTED_TYPES, DROPZONE_MAX_SIZE_MB } from "@/components/wardrobe/Dropzone";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { TagInput } from "@/components/ui/TagInput";
import { Button } from "@/components/ui/Button";
import { clothingApi } from "@/lib/clothing-api";

export default function UploadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [category, setCategory] = useState<ClothingCategory>("top");
  const [color, setColor] = useState("");
  const [style, setStyle] = useState("");
  const [season, setSeason] = useState<ClothingSeason>("all_season");
  const [tags, setTags] = useState<string[]>([]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Revoke the object URL when the file changes/unmounts to avoid leaking memory.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileSelected(candidate: File) {
    setFileError(null);

    if (!DROPZONE_ACCEPTED_TYPES.includes(candidate.type)) {
      setFileError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (candidate.size > DROPZONE_MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`That image is over ${DROPZONE_MAX_SIZE_MB}MB. Try a smaller file.`);
      return;
    }

    setFile(candidate);
    setPreviewUrl(URL.createObjectURL(candidate));
  }

  function handleClearFile() {
    setFile(null);
    setPreviewUrl(null);
    setFileError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!file) {
      setFileError("Add a photo before saving.");
      return;
    }
    if (!color.trim()) {
      setSubmitError("Color is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploaded = await clothingApi.uploadImage(file);
      await clothingApi.createItem({
        imageUrl: uploaded.url,
        imageKey: uploaded.key,
        category,
        color: color.trim(),
        style: style.trim() || undefined,
        season,
        tags,
      });
      router.push("/wardrobe");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Couldn't save this item. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-widest text-brass-600">New piece</p>
      <h1 className="mt-1 font-display text-3xl text-ink">Add to your wardrobe</h1>
      <p className="mt-2 max-w-lg text-sm text-ink/60">
        A clear, well-lit photo helps your future stylist recommendations most — but any photo works to
        get started.
      </p>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit}
        className="mt-8 grid gap-8 sm:grid-cols-2"
      >
        <Dropzone
          file={file}
          previewUrl={previewUrl}
          onFileSelected={handleFileSelected}
          onClear={handleClearFile}
          error={fileError}
        />

        <div className="flex flex-col gap-4">
          <Select
            label="Category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ClothingCategory)}
            options={ClothingCategories.map((c) => ({ value: c, label: c }))}
          />

          <Input
            label="Color"
            name="color"
            placeholder="e.g. Charcoal, Ivory, Sage"
            required
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />

          <Input
            label="Style"
            name="style"
            placeholder="e.g. Minimalist, Streetwear (optional)"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          />

          <Select
            label="Season"
            name="season"
            value={season}
            onChange={(e) => setSeason(e.target.value as ClothingSeason)}
            options={ClothingSeasons.map((s) => ({ value: s, label: s.replace("_", " ") }))}
          />

          <TagInput tags={tags} onChange={setTags} />

          {submitError && (
            <p className="text-sm text-clay" role="alert">
              {submitError}
            </p>
          )}

          <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
            Save to wardrobe
          </Button>
        </div>
      </motion.form>
    </div>
  );
}
