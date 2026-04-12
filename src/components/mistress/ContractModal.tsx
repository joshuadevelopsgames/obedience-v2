'use client';

import { useState, useEffect } from 'react';
import {
  X, Sparkles, Loader2, FileText, Shield, AlertTriangle,
  CheckCircle2, Plus, Trash2, ChevronDown, ChevronUp, Pen,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ContractContent {
  expectations: string;
  rules: string[];
  hard_limits: string[];
  soft_limits: string[];
  curiosities: string[];
}

interface Props {
  pairId: string;
  slaveName: string;
  onClose: () => void;
}

type Tab = 'expectations' | 'rules' | 'limits' | 'curiosities';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'expectations', label: 'Expectations', icon: <FileText size={12} /> },
  { id: 'rules', label: 'Rules', icon: <Shield size={12} /> },
  { id: 'limits', label: 'Limits', icon: <AlertTriangle size={12} /> },
  { id: 'curiosities', label: 'Explore', icon: <Sparkles size={12} /> },
];

export function ContractModal({ pairId, slaveName, onClose }: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('expectations');
  const [contract, setContract] = useState<ContractContent>({
    expectations: '',
    rules: [],
    hard_limits: [],
    soft_limits: [],
    curiosities: [],
  });
  const [newRule, setNewRule] = useState('');
  const [newCuriosity, setNewCuriosity] = useState('');
  const [editingExpectations, setEditingExpectations] = useState(false);

  useEffect(() => {
    generateContract();
  }, []);

  const generateContract = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContract(data.contract);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate contract draft');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!contract.expectations.trim()) { toast.error('Add expectations to the contract'); return; }
    if (contract.rules.length === 0) { toast.error('Add at least one rule'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/contracts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairId, content: contract }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Contract created — you have signed. Awaiting operative\'s countersignature.');
      onClose();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create contract');
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    setContract((c) => ({ ...c, rules: [...c.rules, newRule.trim()] }));
    setNewRule('');
  };

  const removeRule = (i: number) => {
    setContract((c) => ({ ...c, rules: c.rules.filter((_, idx) => idx !== i) }));
  };

  const addCuriosity = () => {
    if (!newCuriosity.trim()) return;
    setContract((c) => ({ ...c, curiosities: [...c.curiosities, newCuriosity.trim()] }));
    setNewCuriosity('');
  };

  const removeCuriosity = (i: number) => {
    setContract((c) => ({ ...c, curiosities: c.curiosities.filter((_, idx) => idx !== i) }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-surface-low border border-outline-variant/20 rounded-t-2xl sm:rounded-2xl w-full max-w-xl mx-0 sm:mx-4 flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h2 className="text-sm font-headline font-bold tracking-widest uppercase">New Contract</h2>
          </div>
          <div className="flex items-center gap-3">
            {!generating && (
              <button
                onClick={generateContract}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg text-[9px] font-headline font-bold tracking-widest uppercase transition-colors"
              >
                <Sparkles size={10} />
                Re-draft
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Loading state */}
        {generating ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12">
            <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FileText size={24} className="text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-surface-low rounded-full flex items-center justify-center">
                <Loader2 size={12} className="animate-spin text-primary" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-headline font-bold tracking-wide">Drafting Contract</p>
              <p className="text-xs text-muted mt-1">Grok is reading your pair context…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-white/5 flex-shrink-0 px-2 pt-2 gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[10px] font-headline font-bold tracking-widest uppercase whitespace-nowrap transition-colors ${
                    tab === t.id
                      ? 'bg-surface-container text-primary border-t border-x border-white/10'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {t.id === 'rules' && contract.rules.length > 0 && (
                    <span className="ml-0.5 text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                      {contract.rules.length}
                    </span>
                  )}
                  {t.id === 'limits' && (contract.hard_limits.length + contract.soft_limits.length) > 0 && (
                    <span className="ml-0.5 text-[8px] bg-[#ff3366]/20 text-[#ff3366] px-1.5 py-0.5 rounded-full">
                      {contract.hard_limits.length + contract.soft_limits.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">

              {/* Expectations */}
              {tab === 'expectations' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-label uppercase tracking-widest text-muted">
                      Dynamic principles &amp; mutual commitments
                    </p>
                    <button
                      onClick={() => setEditingExpectations(!editingExpectations)}
                      className="flex items-center gap-1 text-[9px] font-label uppercase tracking-widest text-muted hover:text-foreground transition-colors"
                    >
                      <Pen size={9} />
                      {editingExpectations ? 'Done' : 'Edit'}
                    </button>
                  </div>
                  {editingExpectations ? (
                    <textarea
                      value={contract.expectations}
                      onChange={(e) => setContract((c) => ({ ...c, expectations: e.target.value }))}
                      rows={12}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-foreground leading-relaxed outline-none focus:border-primary/40 resize-none transition-colors"
                    />
                  ) : (
                    <div
                      className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden cursor-pointer hover:border-primary/20 transition-colors group"
                      onClick={() => setEditingExpectations(true)}
                    >
                      {/* Section header — looks like a contract article */}
                      <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between">
                        <span className="text-[9px] font-headline font-bold tracking-[0.2em] uppercase text-primary/60">
                          Article I — Mutual Expectations
                        </span>
                        <span className="text-[9px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity font-label">
                          click to edit
                        </span>
                      </div>
                      {/* Body */}
                      <div className="px-5 py-4 space-y-3">
                        {contract.expectations
                          ? contract.expectations
                              .split(/\n\n+/)
                              .map((para) => para.trim())
                              .filter(Boolean)
                              .map((para, i) => (
                                <p key={i} className="text-sm leading-[1.75] text-foreground/90 tracking-wide">
                                  {para}
                                </p>
                              ))
                          : <span className="text-sm text-muted italic">Click to edit expectations…</span>
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rules */}
              {tab === 'rules' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-label uppercase tracking-widest text-muted">
                    Binding rules for {slaveName}
                  </p>
                  <div className="space-y-2">
                    {contract.rules.map((rule, i) => (
                      <div key={i} className="flex items-start gap-3 bg-surface-container rounded-xl px-4 py-3 border border-outline-variant/10 group">
                        <span className="text-[10px] font-headline font-bold text-primary mt-0.5 flex-shrink-0 w-5 text-right">{i + 1}.</span>
                        <p className="text-sm flex-1 leading-relaxed">{rule}</p>
                        <button
                          onClick={() => removeRule(i)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-danger transition-all flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add rule */}
                  <div className="flex gap-2 mt-4">
                    <input
                      type="text"
                      value={newRule}
                      onChange={(e) => setNewRule(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addRule(); }}
                      placeholder="Add a rule…"
                      className="flex-1 bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-primary/40 transition-colors"
                    />
                    <button
                      onClick={addRule}
                      disabled={!newRule.trim()}
                      className="px-3 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-xl disabled:opacity-40 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Limits */}
              {tab === 'limits' && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#ff3366]" />
                      <p className="text-[10px] font-label uppercase tracking-widest text-muted">
                        Hard Limits — absolutely off the table
                      </p>
                    </div>
                    {contract.hard_limits.length === 0 ? (
                      <p className="text-xs text-zinc-600 font-headline italic">
                        No hard limits selected in your Limits Library yet.
                        Add them from the Preferences page.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {contract.hard_limits.map((l, i) => (
                          <span key={i} className="text-[10px] font-headline font-bold px-3 py-1.5 rounded-lg bg-[#ff3366]/10 border border-[#ff3366]/30 text-[#ff3366] uppercase tracking-wider">
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-warning" />
                      <p className="text-[10px] font-label uppercase tracking-widest text-muted">
                        Soft Limits — proceed with care
                      </p>
                    </div>
                    {contract.soft_limits.length === 0 ? (
                      <p className="text-xs text-zinc-600 font-headline italic">
                        No soft limits selected yet. Add them from the Preferences page.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {contract.soft_limits.map((l, i) => (
                          <span key={i} className="text-[10px] font-headline font-bold px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30 text-warning uppercase tracking-wider">
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Limits are pulled from both parties' Limits Library selections. To update them, edit the Limits Library in Preferences and re-draft the contract.
                  </p>
                </div>
              )}

              {/* Curiosities / Explore */}
              {tab === 'curiosities' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-label uppercase tracking-widest text-muted">
                    Things to explore together (based on shared interests)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contract.curiosities.map((c, i) => (
                      <span
                        key={i}
                        className="group flex items-center gap-1.5 text-[10px] font-headline font-bold px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider cursor-pointer hover:bg-[#ff3366]/10 hover:border-[#ff3366]/30 hover:text-[#ff3366] transition-colors"
                        onClick={() => removeCuriosity(i)}
                        title="Click to remove"
                      >
                        {c}
                        <X size={9} className="opacity-0 group-hover:opacity-100" />
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newCuriosity}
                      onChange={(e) => setNewCuriosity(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addCuriosity(); }}
                      placeholder="Add something to explore…"
                      className="flex-1 bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-primary/40 transition-colors"
                    />
                    <button
                      onClick={addCuriosity}
                      disabled={!newCuriosity.trim()}
                      className="px-3 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-xl disabled:opacity-40 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-white/5 p-4 space-y-3">
              {/* Signature status */}
              <div className="flex items-center gap-3 text-[10px] font-label uppercase tracking-widest text-muted px-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={11} className="text-success" />
                  <span className="text-success">You will sign on create</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full border border-zinc-600" />
                  <span>{slaveName} signs separately</span>
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 border border-outline-variant/20 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase text-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !contract.expectations.trim() || contract.rules.length === 0}
                  className="flex-1 btn-gradient py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Pen size={12} />}
                  {saving ? 'Creating…' : 'Create & Sign'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
