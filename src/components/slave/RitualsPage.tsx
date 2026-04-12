"use client";

import {
  Shield,
  ChevronDown,
  Play,
  Clock,
  CheckCircle2,
  Flame,
} from "lucide-react";
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

export function RitualsPage({
  profile,
  pair,
  rituals,
  completions,
}: Props) {
  const [expandedRitual, setExpandedRitual] = useState<string | null>(null);
  const [activeFlow, setActiveFlow] = useState<{
    ritualId: string;
    stepIndex: number;
  } | null>(null);
  const [stepTimer, setStepTimer] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const getRitualCompletionCount = (ritualId: string) => {
    return completions.filter((c) => c.ritual_id === ritualId).length;
  };

  const getRecentCompletion = (ritualId: string) => {
    return completions
      .filter((c) => c.ritual_id === ritualId)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0];
  };

  const handleBeginRitual = (ritual: Ritual) => {
    if (ritual.steps && ritual.steps.length > 0) {
      const firstStep = ritual.steps[0];
      setActiveFlow({ ritualId: ritual.id, stepIndex: 0 });
      if (firstStep.duration_seconds > 0) {
        setStepTimer(firstStep.duration_seconds);
      }
    } else {
      toast.error("Ritual has no steps configured");
    }
  };

  const handleCompleteStep = async (ritual: Ritual) => {
    if (!activeFlow) return;

    const nextStep = ritual.steps?.[activeFlow.stepIndex + 1];

    if (!nextStep) {
      // Ritual complete
      setSubmitting(true);
      const { error } = await supabase.from("ritual_completions").insert({
        ritual_id: ritual.id,
        completed_by: profile.id,
        completed_at: new Date().toISOString(),
        notes: null,
      });

      if (!error) {
        toast.success("Ritual completed! Great discipline.");
        setActiveFlow(null);
        router.refresh();
      } else {
        toast.error("Failed to record completion");
      }
      setSubmitting(false);
    } else {
      // Move to next step
      setActiveFlow({ ritualId: ritual.id, stepIndex: activeFlow.stepIndex + 1 });
      if (nextStep.duration_seconds > 0) {
        setStepTimer(nextStep.duration_seconds);
      }
    }
  };

  const handleSkipTimer = () => {
    setStepTimer(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Shield size={24} className="text-purple" />
          Rituals
        </h1>
        <p className="text-sm text-muted">Step-by-step guidance to deepen your practice</p>
      </div>

      {/* Active ritual flow */}
      {activeFlow && (
        <RitualFlow
          ritual={rituals.find((r) => r.id === activeFlow.ritualId)!}
          stepIndex={activeFlow.stepIndex}
          timer={stepTimer}
          onSkipTimer={handleSkipTimer}
          onCompleteStep={() => {
            const ritual = rituals.find((r) => r.id === activeFlow.ritualId)!;
            handleCompleteStep(ritual);
          }}
          onCancel={() => setActiveFlow(null)}
          submitting={submitting}
        />
      )}

      {/* Rituals list */}
      <div className="space-y-3">
        {rituals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Shield size={24} className="mx-auto mb-2 text-muted" />
            <p className="text-sm text-muted">
              No active rituals. Your Mistress will create some for you.
            </p>
          </div>
        ) : (
          rituals.map((ritual) => {
            const completionCount = getRitualCompletionCount(ritual.id);
            const recentCompletion = getRecentCompletion(ritual.id);
            const isExpanded = expandedRitual === ritual.id;

            return (
              <div key={ritual.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-card-hover transition-colors"
                  onClick={() => setExpandedRitual(isExpanded ? null : ritual.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium">{ritual.title}</h3>
                    <p className="text-xs text-muted mt-0.5">
                      {ritual.schedule || "No schedule set"}
                    </p>
                    {completionCount > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Flame size={14} className="text-orange-400" />
                        <span className="text-xs font-medium text-muted">
                          {completionCount} completions
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBeginRitual(ritual);
                      }}
                      className="rounded-lg bg-purple/10 px-3 py-1.5 text-xs font-medium text-purple hover:bg-purple/20 flex items-center gap-1 transition-colors"
                    >
                      <Play size={12} />
                      Begin
                    </button>
                    <ChevronDown
                      size={16}
                      className={`text-muted transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                {isExpanded && ritual.steps && (
                  <div className="border-t border-border px-4 py-4 bg-card/50 space-y-3">
                    {ritual.description && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-muted mb-1">Description</p>
                        <p className="text-sm text-foreground">{ritual.description}</p>
                      </div>
                    )}

                    {recentCompletion && (
                      <div className="rounded-lg bg-success/10 border border-success/30 p-2">
                        <p className="text-xs text-muted">
                          Last completed:{" "}
                          <span className="text-success font-medium">
                            {new Date(recentCompletion.completed_at).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted">Steps</p>
                      {ritual.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-background border border-border p-3 space-y-1.5"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-accent">
                                Step {idx + 1}
                              </p>
                              <p className="text-sm text-foreground mt-1">
                                {step.instruction}
                              </p>
                            </div>
                            {step.duration_seconds > 0 && (
                              <div className="flex items-center gap-1 ml-2 text-xs text-muted">
                                <Clock size={12} />
                                {Math.floor(step.duration_seconds / 60)}m
                              </div>
                            )}
                          </div>
                          {step.proof_required && (
                            <p className="text-xs text-accent font-medium">
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
          })
        )}
      </div>
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

function RitualFlow({
  ritual,
  stepIndex,
  timer,
  onSkipTimer,
  onCompleteStep,
  onCancel,
  submitting,
}: RitualFlowProps) {
  const step = ritual.steps?.[stepIndex];
  const totalSteps = ritual.steps?.length || 0;
  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold">{ritual.title}</h2>
          <p className="text-xs text-muted mt-1">
            Step {stepIndex + 1} of {totalSteps}
          </p>
          <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-purple transition-all"
              style={{
                width: `${((stepIndex + 1) / totalSteps) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Step content */}
        {step && (
          <div className="space-y-4">
            <div className="rounded-lg bg-background border border-border p-4">
              <p className="text-sm text-foreground leading-relaxed">
                {step.instruction}
              </p>
            </div>

            {/* Timer */}
            {step.duration_seconds > 0 && timer > 0 && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs text-muted">Time remaining</p>
                <div className="text-4xl font-bold text-accent">
                  {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
                </div>
                <button
                  onClick={onSkipTimer}
                  className="text-xs text-muted hover:text-foreground transition-colors"
                >
                  Skip timer
                </button>
              </div>
            )}

            {step.proof_required && (
              <div className="rounded-lg bg-purple/10 border border-purple/30 p-2">
                <p className="text-xs text-purple font-medium">
                  📸 Please provide proof of this step before continuing
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            Exit
          </button>
          <button
            onClick={onCompleteStep}
            disabled={submitting}
            className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-black hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
          >
            <CheckCircle2 size={14} />
            {isLastStep ? "Complete Ritual" : "Next Step"}
          </button>
        </div>
      </div>
    </div>
  );
}
