import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Images } from "lucide-react";
import { GalleryView, type GalleryProof } from "@/components/shared/GalleryView";

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "mistress") redirect("/dashboard");

  // Get all active pairs for this mistress
  const { data: pairs } = await supabase
    .from("pairs")
    .select("id, slave_id")
    .eq("mistress_id", user.id)
    .eq("status", "active");

  if (!pairs || pairs.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl">
        <div>
          <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
            SUBMISSION<br /><span className="text-pink italic">GALLERY</span>
          </h1>
          <p className="text-muted text-sm">Visual record of all submitted proofs.</p>
        </div>
        <div className="flex flex-col items-center justify-center bg-surface-low rounded-2xl border border-outline-variant/10 p-16 gap-4">
          <Images size={24} className="text-zinc-600" />
          <p className="text-sm text-muted font-headline">No active pairs yet.</p>
        </div>
      </div>
    );
  }

  const pairIds = pairs.map((p) => p.id);

  // Fetch all photo/video proofs for these pairs, joined with task info
  const { data: rawProofs } = await supabase
    .from("proofs")
    .select(`
      id,
      proof_type,
      content_url,
      text_content,
      status,
      created_at,
      tasks!inner(title, category, pair_id)
    `)
    .in("proof_type", ["photo", "video"])
    .not("content_url", "is", null)
    .in("tasks.pair_id", pairIds)
    .order("created_at", { ascending: false })
    .limit(200);

  const proofs = rawProofs || [];

  // Generate signed URLs in batch
  const paths = proofs.map((p: any) => p.content_url as string).filter(Boolean);
  let signedUrlMap: Record<string, string> = {};

  if (paths.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from("proofs")
      .createSignedUrls(paths, 3600); // 1 hour expiry

    if (signedUrls) {
      for (const item of signedUrls) {
        if (item.signedUrl && item.path) signedUrlMap[item.path] = item.signedUrl;
      }
    }
  }

  // Build gallery items, skip any without a valid signed URL
  const galleryProofs: GalleryProof[] = proofs
    .filter((p: any) => p.content_url && signedUrlMap[p.content_url])
    .map((p: any) => ({
      id: p.id,
      proof_type: p.proof_type as "photo" | "video",
      signedUrl: signedUrlMap[p.content_url],
      text_content: p.text_content,
      status: p.status as "pending" | "approved" | "rejected",
      created_at: p.created_at,
      task_title: p.tasks?.title ?? null,
      task_category: p.tasks?.category ?? null,
    }));

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
          SUBMISSION<br /><span className="text-pink italic">GALLERY</span>
        </h1>
        <p className="text-muted text-sm">
          {galleryProofs.length > 0
            ? `${galleryProofs.length} submission${galleryProofs.length !== 1 ? "s" : ""} · click any image to expand`
            : "No media submissions yet."}
        </p>
      </div>

      <GalleryView proofs={galleryProofs} isOwner={false} />
    </div>
  );
}
