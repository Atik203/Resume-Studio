'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Copy,
  Plus,
  RefreshCw,
  TrendingUp,
  Zap,
  ShieldCheck,
  AlertCircle,
  X,
  Cpu,
} from 'lucide-react';
import type { PolishBulletResponse, PolishVariation } from '@/lib/ml-types';

interface BulletPolishModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulletText: string;
  bulletIndex: number;
  entryTitle?: string;
  entrySubtitle?: string;
  onApplyVariation: (bulletIndex: number, newText: string, mode: 'replace' | 'append') => void;
}

export function BulletPolishModal({
  isOpen,
  onClose,
  bulletText,
  bulletIndex,
  entryTitle,
  entrySubtitle,
  onApplyVariation,
}: BulletPolishModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PolishBulletResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);

  // Fetch polish variations on open or when bulletText changes
  useEffect(() => {
    if (!isOpen || !bulletText.trim()) {
      return;
    }

    let isMounted = true;
    async function fetchPolish() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/ml/polish-bullet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bullet: bulletText,
            context: {
              title: entryTitle,
              subtitle: entrySubtitle,
            },
            model: 'qwen3.5:4b',
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to polish bullet (HTTP ${res.status})`);
        }

        const json = (await res.json()) as PolishBulletResponse;
        if (isMounted) {
          setData(json);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error generating variations');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchPolish();
    return () => {
      isMounted = false;
    };
  }, [isOpen, bulletText, entryTitle, entrySubtitle]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleReplace = (v: PolishVariation) => {
    onApplyVariation(bulletIndex, v.text, 'replace');
    setAppliedKey(v.key);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleAppend = (v: PolishVariation) => {
    onApplyVariation(bulletIndex, v.text, 'append');
    setAppliedKey(v.key);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleRegenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ml/polish-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullet: bulletText,
          context: {
            title: entryTitle,
            subtitle: entrySubtitle,
          },
          model: 'qwen3.5:4b',
        }),
      });

      if (!res.ok) {
        throw new Error(`Regeneration failed (HTTP ${res.status})`);
      }

      const json = (await res.json()) as PolishBulletResponse;
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl text-foreground overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground tracking-wide">
                  Bullet Polish
                </h2>
                {data?.source?.startsWith('ollama:') ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                    <Cpu size={10} /> Local model · GPU
                  </span>
                ) : data?.source === 'rule_based_fallback' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/60">
                    <AlertCircle size={10} /> Rule-based · offline
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800/70 text-neutral-300 border border-neutral-700/60">
                    <RefreshCw size={10} className="animate-spin" /> Generating…
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {entryTitle ? (
                  <span>
                    Context: <strong className="text-foreground">{entryTitle}</strong>
                    {entrySubtitle ? ` @ ${entrySubtitle}` : ''}
                  </span>
                ) : (
                  'Google XYZ Impact Scoring & ATS Optimization'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Original Bullet Preview */}
          <div className="p-4 bg-muted/60 border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
                Original Input Bullet
              </span>
              {data && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px]">Initial Score:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                      data.original.score >= 70
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : data.original.score >= 50
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {data.original.score} / 100
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-foreground/90 leading-relaxed italic">
              &ldquo;{bulletText}&rdquo;
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <RefreshCw size={28} className="text-emerald-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Generating bullet variations…
                </p>
                <p className="text-xs text-muted-foreground">
                  Using the local model when available; otherwise a rule-based rewrite
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && !loading && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-3 text-rose-200">
              <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs space-y-1">
                <p className="font-bold">Failed to generate variations</p>
                <p>{error}</p>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-900/60 hover:bg-rose-800 border border-rose-700 rounded text-foreground font-medium transition-colors"
                >
                  <RefreshCw size={12} /> Retry Inference
                </button>
              </div>
            </div>
          )}

          {/* Variations Cards */}
          {!loading && data && (
            <div className="space-y-4">
              {data.source === 'rule_based_fallback' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-300">
                    Rule-based rewrite: the local model is offline. Replace the bracketed metric
                    placeholder with a real result before applying.
                  </p>
                </div>
              )}
              {!data.original.has_metrics && data.variations.some(variation => variation.has_metrics) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-300">
                    Some suggestions add numbers that were not in your original bullet. Verify or
                    replace every metric before applying.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Generated Variations ({data.variations.length})
                </span>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  <span>Regenerate</span>
                </button>
              </div>

              {data.variations.map((v) => {
                const isCopied = copiedKey === v.key;
                const isApplied = appliedKey === v.key;

                return (
                  <div
                    key={v.key}
                    className="p-4 bg-muted border border-border hover:border-emerald-500/40 rounded-xl transition-all space-y-3 group"
                  >
                    {/* Variation Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {v.key === 'quantified' ? (
                          <TrendingUp size={15} className="text-emerald-400" />
                        ) : v.key === 'action' ? (
                          <Zap size={15} className="text-sky-400" />
                        ) : (
                          <ShieldCheck size={15} className="text-amber-400" />
                        )}
                        <span className="font-bold text-sm text-foreground">{v.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted/60 text-muted-foreground border border-border">
                          {v.tag}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            v.delta_score > 0
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-muted/60 text-foreground/80'
                          }`}
                        >
                          Score: {v.score}/100 {v.delta_score > 0 ? `(+${v.delta_score})` : ''}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">{v.description}</p>

                    {/* Variation Content */}
                    <div className="p-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground/95 leading-relaxed font-normal">
                      {v.text}
                    </div>

                    {/* Metas & Action Buttons */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-border">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {v.has_metrics && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                            📊 Quantified
                          </span>
                        )}
                        {v.verb_strength === 'strong' && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/60">
                            ⚡ Strong Verb
                          </span>
                        )}
                        {v.has_methodology && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60">
                            ⚙️ Methodology
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(v.text, v.key)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors"
                        >
                          {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAppend(v)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-700/50 transition-colors"
                          title="Add as a new bullet below this one"
                        >
                          <Plus size={12} />
                          <span>Add as New</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReplace(v)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-950/50 transition-all active:scale-95"
                          title="Replace original bullet with this variation"
                        >
                          {isApplied ? <Check size={13} /> : <Sparkles size={13} />}
                          <span>{isApplied ? 'Applied!' : 'Replace Bullet'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-muted/80 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Zero silent replacement: Content is only modified when you click Replace or Add.</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-muted/60 hover:bg-muted rounded-lg text-foreground font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
