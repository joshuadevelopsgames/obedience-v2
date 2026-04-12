"use client";

import { Shield, ChevronDown, Play, Clock, CheckCircle2, Flame } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Profile, Pair, Ritual } from "@/types/database";

interface RitualCompletion {
  id: string;
  ritual_id: string;
  completed_by: string;
  completed_at: string;
  notes: string | null;
}

interface Props {
  profile: Profile;
  pair: Pair | null;
  rituals: Ritual[];
  completions: RitualCompletion[];
}

export function RitualsPage({ profile, pair, rituals, completions }: Props) {
  const [expandedRitual, setExpandedRitual] = useState<string | null>(null);
  const [activeFlow, setActiveFlow] = useState<{ ritualId: string; stepIndex: number } | null>(null);
  const [stepTimer, setStepTimer] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const getRitualCompletionCount = (ritualId: string) =>
    completions.filter((c) => c.ritual_id === ritualId).length;

  const getRecentCompletion = (ritualId: string) =>
    completions
      .filter((c) => c.ritual_id === ritualId)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0];

  const handleBeginRitual = (ritual: Ritual) => {
    if (ritual.steps && ritual.steps.length > 0) {
      const firstStep = ritual.steps[0];
      setActiveFlow({ ritualId: ritual.id, stepIndex: 0 });
      if (firstStep.duration_seconds > 0) setStepTimer(firstStep.duration_seconds);
    } else {
      toast.error("Ritual has no steps configured");
    }
  };

  const handleCompleteStep = async (ritual: Ritual) => {
    if (!activeFlow) return;
    const nextStep = ritual.steps?.[activeFlow.stepIndex + 1];
    if (!nextStep) {
      setSubmitting(true);
      const { error } = await supabase.from("ritual_completions").insert({
        ritual_id: ritual.id,
        completed_by: profile.id,
        completed_at: new Date().toISOString(),
        notes: null,
      });
      if (!error) { toast.success("Ritual completed!"); setActiveFlow(null); router.refresh(); }
      else { toast.error("Failed to record completion"); }
      setSubmitting(false);
    } else {
      setActiveFlow({ ritualId: ritual.id, stepIndex: activeFlow.stepIndex + 1 });
      if (nextStep.duration_seconds > 0) setStepTimer(nextStep.duration_seconds);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div>
        <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tighter leading-[0.9] mb-3">
          RITUALS &amp;<br />
          <span className="text-pink italic">PROTOCOLS</span>
        </h1>
        <p className="text-muted text-lg max-w-md leading-relaxed">
          Step-by-step guidance to deepen your practice. Discipline through repetition.
        </p>
      </div>

      {/* Active ritual overlay */}
      {activeFlow && (
        <RitualFlow
          ritual={rituals.find((r) => r.id === activeFlow.ritualId)!}
          stepIndex={activeFlow.stepIndex}
          timer={stepTimer}
          onSkipTimer={() => setStepTimer(0)}
          onCompleteStep={() => handleCompleteStep(rituals.find((r) => r.id === activeFlow.ritualId)!)}
          onCancel={() => setActiveFlow(null)}
          submitting={submitting}
        />
      )}

      {/* Rituals list */}
      {rituals.length === 0 ? (
        <div className="bg-surface-container rounded-xl p-12 text-center border border-outline-variant/5">
          <Shield size={32} className="mx-auto mb-4 text-zinc-600" />
          <p className="text-muted font-headline text-sm">No rituals assigned yet. Your Mistress will create some for you.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rituals.map((ritual) => {
            const completionCount = getRitualCompletionCount(ritual.id);
            const recentCompletion = getRecentCompletion(ritual.id);
            const isExpanded = expandedRitual === ritual.id;

            return (
              <div key={ritual.id} className="bg-surface-low rounded-xl border border-transparent hover:border-primary/20 transition-all duration-300 overflow-hidden glow-border-primary">
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer"
                  onClick={() => setExpandedRitual(isExpanded ? null : ritual.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-pink border border-outline-variant/10 flex-shrink-0">
                      <Shield size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-headline font-bold tracking-tight">{ritual.title}</h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {ritual.schedule && (
                          <span className="text-[10px] font-label uppercase tracking-widest text-muted">{ritual.schedule}</span>
                        )}
                        {completionCount > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-label text-muted">
                            <Flame size={10} className="text-orange-400" />
                            {completionCount}×
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleBeginRitual(ritual); }}
                      className="btn-gradient px-4 py-2 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center gap-1.5"
                    >
                      <Play size={10} />
                      Begin
                    </button>
                    <ChevronDown
                      size={16}
                      className={`text-muted transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>

                {isExpanded && ritual.steps && (
                  <div className="border-t border-white/5 px-5 py-5 bg-surface-container space-y-4">
                    {ritual.description && (
                      <div>
                        <p className="text-[10px] font-label uppercase tracking-[0.2em] text-muted mb-2">Description</p>
                        <p className="text-sm text-foreground leading-relaxed">{ritual.description}</p>
                      </div>
                    )}

                    {recentCompletion && (
                      <div className="bg-success/5 border-l-4 border-success px-4 py-2 rounded-r-xl">
                        <p className="text-xs text-muted">
                          Last completed: <span className="text-success font-headline font-bold">
                            {new Date(recentCompletion.completed_at).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-[10px] font-label uppercase tracking-[0.2em] text-muted">Steps</p>
                      {ritual.steps.map((step, idx) => (
                        <div key={idx} className="bg-surface-container-high rounded-xl px-4 py-3 space-y-1.5 border border-outline-variant/10">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-primary mb-1">
                                Step {idx + 1}
                              </p>
                              <p className="text-sm text-foreground leading-relaxed">{step.instruction}</p>
                            </div>
                            {step.duration_seconds > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted flex-shrink-0">
                                <Clock size={12} />
                                {Math.floor(step.duration_seconds / 60)}m
                              </div>
                            )}
                          </div>
                          {step.proof_required && (
                            <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-warning">
                              📸 Proof required
                            </p>
                          )}
                        </div>
                      ))}
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

interface RitualFlowProps {
  ritual: Ritual;
  stepIndex: number;
  timer: number;
  onSkipTimer: () => void;
  onCompleteStep: () => void;
  onCancel: () => void;
  submitting: boolean;
}

function RitualFlow({ ritual, stepIndex, timer, onSkipTimer, onCompleteStep, onCancel, submitting }: RitualFlowProps) {
  const step = ritual.steps?.[stepIndex];
  const totalSteps = ritual.steps?.length || 0;
  const isLastStep = stepIndex === totalSteps - 1;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md glass-panel rounded-xl border border-primary/20 p-6 mx-4 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-headline font-bold tracking-tight">{ritual.title}</h2>
            <span className="text-[10px] font-label uppercase tracking-widest text-muted">
              {stepIndex + 1} / {totalSteps}
            </span>
          </div>
          <div className="h-0.5 bg-surface-container-highest rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%`, boxShadow: "0 0 8px rgba(204,151,255,0.8)" }}
            />
          </div>
        </div>

        {/* Step content */}
        {step && (
          <div className="space-y-4">
            <div className="bg-surface-container rounded-xl border border-outline-variant/10 p-4">
              <p className="text-sm text-foreground leading-relaxed">{step.instruction}</p>
            </div>

            {/* Timer */}
            {step.duration_seconds > 0 && timer > 0 && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-[10px] font-label uppercase tracking-widest text-muted">Time Remaining</p>
                <div className="text-5xl font-headline font-bold text-primary" style={{ textShadow: "0 0 20px rgba(204,151,255,0.4)" }}>
                  {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
                </div>
                <button onClick={onSkipTimer} className="text-xs text-zinc-600 hover:text-muted transition-colors font-label">
                  Skip timer
                </button>
              </div>
            )}

            {step.proof_required && (
              <div className="bg-warning/5 border-l-4 border-warning px-4 py-2 rounded-r-xl">
                <p className="text-[10px] font-headline font-bold uppercase text-warning tracking-widest">
                  📸 Proof required before continuing
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-outline-variant/20 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase text-muted hover:text-foreground transition-colors"
          >
            Exit
          </button>
          <button
            onClick={onCompleteStep}
            disabled={submitting}
            className="flex-1 btn-gradient py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 size={12} />
            {isLastStep ? "Complete Ritual" : "Next Step"}
          </button>
        </div>
      </div>
    </div>
  );
}
