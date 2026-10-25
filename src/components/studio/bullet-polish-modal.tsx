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
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#111813] border border-[#233529] rounded-2xl shadow-2xl text-[#e6f4ea] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#233529] bg-[#141e17]/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Local Qwen 3.5 4B Bullet Polish
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                  <Cpu size={10} /> 100% Offline · GPU
                </span>
              </div>
              <p className="text-xs text-[#8ba393]">
                {entryTitle ? (
                  <span>
                    Context: <strong className="text-white">{entryTitle}</strong>
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
            className="p-1.5 rounded-lg text-[#8ba393] hover:text-white hover:bg-white/5 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Original Bullet Preview */}
          <div className="p-4 bg-[#18231c]/60 border border-[#263a2d] rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8ba393]">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-[#a0b8a8]">
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
            <p className="text-sm font-medium text-white/90 leading-relaxed italic">
              &ldquo;{bulletText}&rdquo;
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <RefreshCw size={28} className="text-emerald-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Running Local Qwen 3.5 4B SLM...
                </p>
                <p className="text-xs text-[#8ba393]">
                  Synthesizing Quantified, Action-First, and Compact variations on GPU
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
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-900/60 hover:bg-rose-800 border border-rose-700 rounded text-white font-medium transition-colors"
                >
                  <RefreshCw size={12} /> Retry Inference
                </button>
              </div>
            </div>
          )}

          {/* Variations Cards */}
          {!loading && data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#8ba393] uppercase tracking-wider">
                  Generated High-Impact Variations ({data.variations.length})
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
                    className="p-4 bg-[#141e17] border border-[#233529] hover:border-emerald-500/40 rounded-xl transition-all space-y-3 group"
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
                        <span className="font-bold text-sm text-white">{v.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-[#8ba393] border border-white/10">
                          {v.tag}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            v.delta_score > 0
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-white/5 text-white/80'
                          }`}
                        >
                          Score: {v.score}/100 {v.delta_score > 0 ? `(+${v.delta_score})` : ''}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#7e9986]">{v.description}</p>

                    {/* Variation Content */}
                    <div className="p-3 bg-[#0c120e] border border-[#1b2b20] rounded-lg text-sm text-white/95 leading-relaxed font-normal">
                      {v.text}
                    </div>

                    {/* Metas & Action Buttons */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[#1b2b20]">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#7e9986]">
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
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-[#8ba393] hover:text-white border border-white/10 transition-colors"
                        >
                          {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAppend(v)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1d2c22] hover:bg-[#25392c] text-emerald-300 border border-emerald-700/50 transition-colors"
                          title="Add as a new bullet below this one"
                        >
                          <Plus size={12} />
                          <span>Add as New</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReplace(v)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-[#09110b] shadow-md shadow-emerald-950/50 transition-all active:scale-95"
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
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#233529] bg-[#141e17]/80 text-xs text-[#8ba393]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Zero silent replacement: Content is only modified when you click Replace or Add.</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
