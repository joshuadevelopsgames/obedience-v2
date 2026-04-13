"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  currentAvatarUrl: string | null;
  displayName: string | null;
  /** "sm" = 16, "md" = 24, "lg" = 32 (tailwind h/w units) */
  size?: "sm" | "md" | "lg";
  onUpload?: (url: string) => void;
  /** Extra classes for the outer wrapper */
  className?: string;
}

const sizeMap = {
  sm: { outer: "w-16 h-16", text: "text-xl", icon: 16 },
  md: { outer: "w-24 h-24", text: "text-3xl", icon: 20 },
  lg: { outer: "w-32 h-32", text: "text-4xl", icon: 24 },
};

export function AvatarUploader({ userId, currentAvatarUrl, displayName, size = "md", onUpload, className = "" }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const { outer, text, icon } = sizeMap[size];
  const initial = ((displayName || "?")[0] ?? "?").toUpperCase();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Must be an image file"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache bust so the browser re-fetches the new image
      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: finalUrl })
        .eq("id", userId);
      if (updateError) throw updateError;

      setAvatarUrl(finalUrl);
      onUpload?.(finalUrl);
      toast.success("Profile photo updated");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div
      className={`relative group cursor-pointer flex-shrink-0 ${className}`}
      onClick={() => !uploading && fileRef.current?.click()}
      title="Click to change photo"
    >
      {/* Avatar display */}
      <div className={`${outer} rounded-2xl overflow-hidden border-2 border-primary/30 bg-surface-container flex items-center justify-center`}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Profile photo" className="w-full h-full object-cover" />
        ) : (
          <span className={`${text} font-headline font-bold text-primary`}>{initial}</span>
        )}
      </div>

      {/* Hover / upload overlay */}
      <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
        {uploading ? (
          <Loader2 size={icon} className="text-white animate-spin" />
        ) : (
          <>
            <Camera size={icon} className="text-white" />
            <span className="text-[9px] text-white font-headline font-bold tracking-widest uppercase">Change</span>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleUpload}
        disabled={uploading}
      />
    </div>
  );
}
