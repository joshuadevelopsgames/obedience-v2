"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ProofUploadProps {
  taskId: string;
  proofType: "photo" | "video" | "text" | "location" | "checkin";
  userId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function ProofUpload({ taskId, proofType, userId, onComplete, onCancel }: ProofUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (proofType === "text" && !text.trim()) { toast.error("Please provide your text proof."); return; }
    if ((proofType === "photo" || proofType === "video") && !file) { toast.error(`Please select a ${proofType} to upload.`); return; }

    setSubmitting(true);
    let contentUrl = null;

    try {
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${taskId}-${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("proofs").upload(filePath, file);
        if (uploadError) throw uploadError;
        contentUrl = filePath;
      }

      const { error: insertError } = await supabase.from("proofs").insert({
        task_id: taskId,
        submitted_by: userId,
        proof_type: proofType,
        text_content: proofType === "text" || text ? text : null,
        content_url: contentUrl,
      });
      if (insertError) throw insertError;

      const { error: updateError } = await supabase.from("tasks").update({ status: "proof_submitted" }).eq("id", taskId);
      if (updateError) throw updateError;

      toast.success("Proof submitted!");
      onComplete();
    } catch (err: any) {
      console.error("Proof upload error:", err);
      toast.error("Failed to submit proof. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {proofType === "photo" || proofType === "video" ? (
        <div className="space-y-3">
          <input
            type="file"
            accept={proofType === "photo" ? "image/*" : "video/*"}
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          {!file ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 border border-dashed border-outline-variant/30 hover:border-primary/40 bg-surface-container hover:bg-primary/5 rounded-xl px-4 py-8 w-full text-sm text-muted hover:text-foreground transition-all"
            >
              <Camera size={18} />
              Upload {proofType === "photo" ? "Photo" : "Video"}
            </button>
          ) : (
            <div className="flex items-center justify-between bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5">
              <span className="text-sm text-foreground truncate max-w-[200px] font-headline">{file.name}</span>
              <button
                onClick={() => setFile(null)}
                className="p-1 rounded text-muted hover:text-[#ff3366] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {file && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-primary/40 resize-none transition-colors"
              rows={2}
              placeholder="Add an optional note…"
            />
          )}
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-primary/40 resize-none transition-colors"
          rows={3}
          placeholder="Describe how you completed this task…"
        />
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || (proofType === "text" && !text.trim()) || ((proofType === "photo" || proofType === "video") && !file)}
          className="btn-gradient flex-1 flex items-center justify-center gap-1.5 py-2 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase disabled:opacity-50"
        >
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          Submit
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 border border-outline-variant/20 py-2 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase text-muted hover:text-foreground disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
