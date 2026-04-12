"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, X, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

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
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (proofType === "text" && !text.trim()) {
      toast.error("Please provide your text proof.");
      return;
    }
    if ((proofType === "photo" || proofType === "video") && !file) {
      toast.error(`Please select a ${proofType} to upload.`);
      return;
    }

    setSubmitting(true);
    let contentUrl = null;

    try {
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${taskId}-${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("proofs")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Since it's a private bucket, we store the filepath to generate signed URLs later
        // or we use createSignedUrl when viewing. We store the path.
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

      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "proof_submitted" })
        .eq("id", taskId);

      if (updateError) throw updateError;

      toast.success("Proof submitted successfully!");
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
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 w-full text-sm text-muted hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors"
            >
              <Camera size={20} />
              Upload {proofType === "photo" ? "Photo" : "Video"}
            </button>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 bg-card">
              <span className="text-sm text-foreground truncate max-w-[200px]">
                {file.name}
              </span>
              <button
                onClick={() => setFile(null)}
                className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {file && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-muted/50 outline-none focus:border-accent resize-none"
              rows={2}
              placeholder="Add an optional note..."
            />
          )}
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-muted/50 outline-none focus:border-accent resize-none"
          rows={3}
          placeholder="Describe how you completed this task..."
        />
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={
            submitting ||
            (proofType === "text" && !text.trim()) ||
            ((proofType === "photo" || proofType === "video") && !file)
          }
          className="flex items-center gap-1.5"
          size="sm"
        >
          {submitting ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Upload size={12} />
          )}
          Submit
        </Button>
        <Button
          onClick={onCancel}
          variant="secondary"
          disabled={submitting}
          size="sm"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
