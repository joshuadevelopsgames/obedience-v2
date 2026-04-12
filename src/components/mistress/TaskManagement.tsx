"use client";

import {
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  X,
  Loader2,
  Zap,
  Send,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Pair, Profile, Task, Proof } from "@/types/database";

interface Props {
  pair: Pair | null;
  profile: Profile;
  tasks: Task[];
  proofs: Proof[];
}

const categoryColors: Record<string, string> = {
  service: "text-blue-400",
  obedience: "text-primary",
  training: "text-warning",
  self_care: "text-emerald-400",
  creative: "text-pink",
  endurance: "text-red-400",
  protocol: "text-cyan-400",
};

const statusStyles: Record<string, string> = {
  assigned: "text-[#00ff9d] bg-[#00ff9d]/5 border-[#00ff9d]/20",
  in_progress: "text-primary bg-primary/5 border-primary/20",
  proof_submitted: "text-warning bg-warning/5 border-warning/20",
  approved: "text-success bg-success/5 border-success/20",
  rejected: "text-[#ff3366] bg-[#ff3366]/5 border-[#ff3366]/20",
  completed: "text-success bg-success/5 border-success/20",
  expired: "text-zinc-500 bg-zinc-500/5 border-zinc-500/20",
  suggested: "text-zinc-400 bg-zinc-400/5 border-zinc-400/20",
};

function ProofPhotoViewer({ storagePath, proofType }: { storagePath: string; proofType: string }) {
  const supabase = createClient();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.storage.from('proofs').createSignedUrl(storagePath, 3600).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl);
    });
  }, [storagePath]);

  if (!url) return <div className="h-40 bg-surface-container rounded-xl animate-pulse" />;

  if (proofType === 'photo') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Proof photo" className="w-full max-h-64 object-cover rounded-xl hover:opacity-90 transition-opacity" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:text-pink transition-colors font-headline">
      View {proofType} evidence ↗
    </a>
  );
}

export function TaskManagement({ pair, profile, tasks, proofs }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"drafts" | "active" | "pending" | "completed" | "all">("drafts");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedProofs, setExpandedProofs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "service" as const,
    difficulty: 3,
    proof_type: "text" as const,
    due_date: "",
  });

  const draftTasks = tasks.filter((t) => t.status === "suggested");
  const activeTasks = tasks.filter((t) => ["assigned", "in_progress"].includes(t.status));
  const pendingTasks = tasks.filter((t) => t.status === "proof_submitted");
  const completedTasks = tasks.filter((t) => ["approved", "completed"].includes(t.status));
  const allDeployed = tasks.filter((t) => t.status !== "suggested");

  const getFilteredTasks = () => {
    switch (activeTab) {
      case "drafts": return draftTasks;
      case "active": return activeTasks;
      case "pending": return pendingTasks;
      case "completed": return completedTasks;
      case "all": return allDeployed;
    }
  };

  const filteredTasks = getFilteredTasks();
  const tabCounts = {
    drafts: draftTasks.length,
    active: activeTasks.length,
    pending: pendingTasks.length,
    completed: completedTasks.length,
    all: allDeployed.length,
  };

  const handleApprove = async (taskId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("tasks").update({ status: "approved" }).eq("id", taskId);
      if (!error) { toast.success("Task approved!"); router.refresh(); }
      else toast.error("Failed to approve task");
    } catch { toast.error("Error approving task"); }
    setSubmitting(false);
  };

  const handleReject = async (taskId: string, proofId: string) => {
    setSubmitting(true);
    try {
      const note = rejectNote[proofId] || "";
      await supabase.from("proofs").update({ status: "rejected", reviewer_note: note }).eq("id", proofId);
      const { error } = await supabase.from("tasks").update({ status: "rejected" }).eq("id", taskId);
      if (!error) {
        toast.success("Task rejected");
        router.refresh();
        setRejectNote((prev) => { const n = { ...prev }; delete n[proofId]; return n; });
      } else toast.error("Failed to reject task");
    } catch { toast.error("Error rejecting task"); }
    setSubmitting(false);
  };

  // Deploy a draft task — makes it visible to the slave
  const handleDeploy = async (taskId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "assigned" })
        .eq("id", taskId);
      if (!error) { toast.success("Protocol deployed!"); router.refresh(); }
      else toast.error("Failed to deploy");
    } catch { toast.error("Error deploying task"); }
    setSubmitting(false);
  };

  // Delete a task permanently
  const handleDelete = async (taskId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (!error) {
        toast.success("Task deleted");
        setConfirmDelete(null);
        router.refresh();
      } else toast.error("Failed to delete task");
    } catch { toast.error("Error deleting task"); }
    setSubmitting(false);
  };

  const handleCreateTask = async (e: React.FormEvent, deploy: boolean) => {
    e.preventDefault();
    if (!pair) { toast.error("Not paired"); return; }
    if (!formData.title.trim()) { toast.error("Title is required"); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("tasks").insert({
        pair_id: pair.id,
        created_by: profile.id,
        assigned_to: pair.slave_id,
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        difficulty: formData.difficulty,
        xp_reward: formData.difficulty * 15,
        proof_type: formData.proof_type,
        due_at: formData.due_date || null,
        status: deploy ? "assigned" : "suggested",
        ai_generated: false,
      });

      if (!error) {
        toast.success(deploy ? "Protocol deployed!" : "Saved to drafts");
        setShowCreateForm(false);
        setFormData({ title: "", description: "", category: "service", difficulty: 3, proof_type: "text", due_date: "" });
        if (!deploy) setActiveTab("drafts");
        router.refresh();
      } else toast.error("Failed to create task");
    } catch { toast.error("Error creating task"); }
    setSubmitting(false);
  };

  if (!pair) {
    return (
      <div className="bg-surface-container-high rounded-xl p-12 text-center border border-outline-variant/5">
        <p className="text-muted font-headline">Not paired yet. Share your protocol code to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">TASK MANAGEMENT</h1>
          <p className="text-sm text-muted mt-1">Create and review directives for your submissive</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-gradient flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs font-headline font-bold tracking-widest uppercase"
        >
          <Plus size={14} />
          New Protocol
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-surface-container p-8 rounded-2xl border border-white/5 space-y-5">
          <h3 className="font-headline font-bold text-lg tracking-tight">NEW PROTOCOL</h3>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
            <div>
              <label className="block text-[10px] font-label tracking-[0.2em] text-muted mb-2 uppercase">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="—"
                className="w-full bg-surface-container-high px-4 py-3 text-sm text-foreground placeholder-zinc-600 outline-none transition-all border-b-2 border-transparent focus:border-primary rounded-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-label tracking-[0.2em] text-muted mb-2 uppercase">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="—"
                rows={3}
                className="w-full bg-surface-container-high px-4 py-3 text-sm text-foreground placeholder-zinc-600 outline-none transition-all border-b-2 border-transparent focus:border-primary rounded-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-label tracking-[0.2em] text-muted mb-2 uppercase">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-surface-container-high px-4 py-3 text-sm text-foreground outline-none transition-all border-b-2 border-transparent focus:border-primary rounded-sm"
                >
                  <option value="service">Service</option>
                  <option value="obedience">Obedience</option>
                  <option value="training">Training</option>
                  <option value="self_care">Self Care</option>
                  <option value="creative">Creative</option>
                  <option value="endurance">Endurance</option>
                  <option value="protocol">Protocol</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-label tracking-[0.2em] text-muted mb-2 uppercase">Proof Type</label>
                <select
                  value={formData.proof_type}
                  onChange={(e) => setFormData({ ...formData, proof_type: e.target.value as any })}
                  className="w-full bg-surface-container-high px-4 py-3 text-sm text-foreground outline-none transition-all border-b-2 border-transparent focus:border-primary rounded-sm"
                >
                  <option value="text">Text</option>
                  <option value="photo">Photo</option>
                  <option value="video">Video</option>
                  <option value="checkin">Check-in</option>
                  <option value="location">Location</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-label tracking-[0.2em] text-muted mb-2 uppercase">
                  Difficulty: {formData.difficulty}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-headline mt-1">
                  <span>{"●".repeat(formData.difficulty)}{"○".repeat(5 - formData.difficulty)}</span>
                  <span>+{formData.difficulty * 15} XP</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-label tracking-[0.2em] text-muted mb-2 uppercase">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full bg-surface-container-high px-4 py-3 text-sm text-foreground outline-none transition-all border-b-2 border-transparent focus:border-primary rounded-sm"
                />
              </div>
            </div>

            {/* Two action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => handleCreateTask(e, false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-sm bg-surface-container-high border border-white/10 text-foreground text-xs font-headline font-bold tracking-widest uppercase hover:bg-surface-bright transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="mx-auto animate-spin" /> : "Save as Draft"}
              </button>
              <button
                type="button"
                onClick={(e) => handleCreateTask(e, true)}
                disabled={submitting}
                className="flex-1 btn-gradient flex items-center justify-center gap-2 py-3 rounded-sm text-xs font-headline font-bold tracking-widest uppercase disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <><Send size={12} /> Deploy Now</>}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 font-headline tracking-widest uppercase transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 flex-wrap">
        {(["drafts", "active", "pending", "completed", "all"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`font-label text-xs font-bold uppercase tracking-widest pb-2 transition-colors ${
              activeTab === tab
                ? "text-primary border-b-2 border-primary/30"
                : "text-zinc-500 hover:text-foreground"
            }`}
          >
            {tab === "all" ? "Deployed" : tab}{" "}
            <span className="text-[10px] ml-1 opacity-60">({tabCounts[tab]})</span>
          </button>
        ))}
      </div>

      {/* Helper text for drafts */}
      {activeTab === "drafts" && draftTasks.length > 0 && (
        <p className="text-xs text-zinc-500 -mt-4">
          Drafts are only visible to you. Deploy a task to send it to your submissive.
        </p>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-surface-container-high rounded-xl p-12 text-center border border-outline-variant/5">
          <p className="text-muted font-headline">
            {activeTab === "drafts" ? "No drafts. Create a task and save it for later." : "No protocols in this category."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTasks.map((task) => {
            const proof = proofs.find((p) => p.task_id === task.id);
            const isExpanded = expandedProofs.includes(task.id);
            const isDraft = task.status === "suggested";
            const isDeleting = confirmDelete === task.id;

            return (
              <div
                key={task.id}
                className={`bg-surface-low rounded-xl border transition-all duration-300 overflow-hidden ${
                  isDraft
                    ? "border-zinc-700/40 opacity-80"
                    : "border-transparent hover:border-primary/20 glow-border-primary"
                }`}
              >
                {/* Task Row */}
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center border flex-shrink-0 ${
                      isDraft
                        ? "bg-surface-container text-zinc-500 border-outline-variant/10"
                        : "bg-surface-container text-primary border-outline-variant/10"
                    }`}>
                      <Zap size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-headline font-bold tracking-tight">{task.title}</h4>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className={`text-xs font-headline font-medium ${categoryColors[task.category] || "text-muted"}`}>
                          {task.category.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-[10px] text-zinc-500 font-headline">
                          {"●".repeat(task.difficulty)}{"○".repeat(5 - task.difficulty)}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-primary text-xs font-headline font-bold">
                          +{task.xp_reward} XP
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{task.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <span className={`text-[10px] font-headline font-bold tracking-[0.2em] px-3 py-1 rounded border ${statusStyles[task.status] || "text-zinc-400 bg-zinc-400/5 border-zinc-400/20"}`}>
                      {isDraft ? "DRAFT" : task.status.replace("_", " ").toUpperCase()}
                    </span>

                    {/* Draft: Deploy + Delete */}
                    {isDraft && (
                      <>
                        <button
                          onClick={() => handleDeploy(task.id)}
                          disabled={submitting}
                          title="Deploy to slave"
                          className="p-2 text-primary hover:text-white hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Send size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(isDeleting ? null : task.id)}
                          disabled={submitting}
                          title="Delete task"
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}

                    {/* Deployed: expand proof + delete */}
                    {!isDraft && (
                      <>
                        {task.status === "proof_submitted" && proof && (
                          <button
                            onClick={() =>
                              setExpandedProofs((prev) =>
                                prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id]
                              )
                            }
                            className="p-2 text-zinc-500 hover:text-foreground transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(isDeleting ? null : task.id)}
                          disabled={submitting}
                          title="Delete task"
                          className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete Confirmation */}
                {isDeleting && (
                  <div className="border-t border-red-400/20 bg-red-400/5 px-6 py-4 flex items-center justify-between">
                    <p className="text-xs text-red-300 font-headline">Delete this task permanently?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(task.id)}
                        disabled={submitting}
                        className="px-4 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded text-xs font-headline font-bold tracking-widest uppercase hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {submitting ? <Loader2 size={12} className="animate-spin" /> : "Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-4 py-1.5 bg-surface-container text-zinc-400 rounded text-xs font-headline font-bold tracking-widest uppercase hover:bg-surface-bright transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Proof Review Panel */}
                {task.status === "proof_submitted" && proof && isExpanded && (
                  <div className="border-t border-white/5 p-6 bg-surface-container space-y-4">
                    <div className="bg-surface-container-high rounded-lg p-4 space-y-3">
                      {proof.content_url && (
                        <ProofPhotoViewer storagePath={proof.content_url} proofType={proof.proof_type} />
                      )}
                      {proof.text_content && (
                        <p className="text-sm text-foreground leading-relaxed">{proof.text_content}</p>
                      )}
                      {!proof.content_url && !proof.text_content && (
                        <p className="text-sm text-zinc-500">No content submitted</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-label tracking-[0.2em] text-muted mb-2 uppercase">
                        Review Note (optional)
                      </label>
                      <textarea
                        value={rejectNote[proof.id] || ""}
                        onChange={(e) => setRejectNote({ ...rejectNote, [proof.id]: e.target.value })}
                        placeholder="—"
                        rows={2}
                        className="w-full bg-surface-container-high px-4 py-3 text-sm text-foreground placeholder-zinc-600 outline-none transition-all border-b-2 border-transparent focus:border-primary rounded-sm"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(task.id)}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-sm bg-success/10 border border-success/20 text-success text-xs font-headline font-bold tracking-widest uppercase hover:bg-success/20 transition-colors disabled:opacity-50"
                      >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(task.id, proof.id)}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-sm bg-danger/10 border border-danger/20 text-danger text-xs font-headline font-bold tracking-widest uppercase hover:bg-danger/20 transition-colors disabled:opacity-50"
                      >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
