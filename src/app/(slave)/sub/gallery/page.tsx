import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Images } from "lucide-react";
import { pickActivePair } from "@/lib/activePair";
import { GalleryView, type GalleryProof } from "@/components/shared/GalleryView";

export default async function SubGalleryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "slave") redirect("/dashboard");

  // Fetch all active pairs, respect switcher
  const { data: allPairs } = await supabase
    .from("pairs")
    .select("*")
    .eq("slave_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const activePair = await pickActivePair(allPairs || []);
  if (!activePair) redirect("/sub");

  // Fetch all of this slave's photo/video proofs for the active pair's tasks
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
    .eq("submitted_by", user.id)
    .in("proof_type", ["photo", "video"])
    .not("content_url", "is", null)
    .eq("tasks.pair_id", activePair.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const proofs = rawProofs || [];

  // Generate signed URLs — slave can read their own bucket folder
  const paths = proofs.map((p: any) => p.content_url as string).filter(Boolean);
  let signedUrlMap: Record<string, string> = {};

  if (paths.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from("proofs")
      .createSignedUrls(paths, 3600);

    if (signedUrls) {
      for (const item of signedUrls) {
        if (item.signedUrl && item.path) signedUrlMap[item.path] = item.signedUrl;
      }
    }
  }

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
      <div>
        <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
          MY<br /><span className="text-primary italic">SUBMISSIONS</span>
        </h1>
        <p className="text-muted text-sm">
          {galleryProofs.length > 0
            ? `${galleryProofs.length} submission${galleryProofs.length !== 1 ? "s" : ""} · click any image to expand`
            : "No media submitted yet."}
        </p>
      </div>

      <GalleryView proofs={galleryProofs} isOwner={true} />
    </div>
  );
}
