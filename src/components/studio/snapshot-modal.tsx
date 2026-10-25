'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Camera,
  RotateCcw,
  GitFork,
  Trash2,
  Calendar,
  X,
  FileText,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { ProjectData, ResumeSnapshot, ResolvedVariant } from '@/lib/data';
import { loadSnapshots, saveSnapshot, deleteSnapshot } from '@/lib/storage';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
  activeVariant: ResolvedVariant;
  onRestoreProject: (snapshotProject: ProjectData) => void;
  onForkVariant: (snapshot: ResumeSnapshot) => void;
}

export function SnapshotModal({
  isOpen,
  onClose,
  project,
  activeVariant,
  onRestoreProject,
  onForkVariant,
}: SnapshotModalProps) {
  const [snapshots, setSnapshots] = useState<ResumeSnapshot[]>([]);
  const [newSnapshotName, setNewSnapshotName] = useState<string>('');
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadSnapshots().then((list) => setSnapshots(list));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSnapshotName.trim() || `${activeVariant.name} (${new Date().toLocaleDateString()})`;
    const snapshot: ResumeSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      variantId: activeVariant.id,
      variantName: activeVariant.name,
      templateId: activeVariant.templateId,
      createdAt: new Date().toISOString(),
      projectData: structuredClone(project),
    };

    await saveSnapshot(snapshot);
    const updated = await loadSnapshots();
    setSnapshots(updated);
    setNewSnapshotName('');
    setFeedbackMsg(`Snapshot "${name}" saved!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDelete = async (id: string) => {
    await deleteSnapshot(id);
    const updated = await loadSnapshots();
    setSnapshots(updated);
  };

  const handleRestore = (snap: ResumeSnapshot) => {
    onRestoreProject(snap.projectData);
    setConfirmRestoreId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-[#111813] border border-[#233529] rounded-2xl shadow-2xl text-[#e6f4ea] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#233529] bg-[#141e17]/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Snapshot Time Machine
              </h2>
              <p className="text-xs text-[#8ba393]">
                Durable local checkpoints saved in IndexedDB
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

        {/* Snapshot Creation Form */}
        <div className="px-6 py-3.5 bg-[#141e17]/50 border-b border-[#1b2b20]">
          <form onSubmit={handleCreateSnapshot} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`e.g. "Tailored for SRE" or "Post-Mentor Review"`}
              value={newSnapshotName}
              onChange={(e) => setNewSnapshotName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-[#18231c] text-white placeholder-[#5d7766] border border-[#263a2d] rounded-lg text-xs focus:outline-none focus:border-emerald-500/50"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#09110b] font-semibold text-xs rounded-lg shadow-md transition-all active:scale-95 shrink-0"
            >
              <Camera size={13} />
              <span>Capture Snapshot</span>
            </button>
          </form>
          {feedbackMsg && (
            <p className="mt-2 text-xs text-emerald-400 font-medium flex items-center gap-1">
              <Check size={12} /> {feedbackMsg}
            </p>
          )}
        </div>

        {/* Timeline List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {snapshots.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-[#8ba393]">
              <History size={36} className="text-[#3b5143] opacity-60" />
              <p className="text-sm font-semibold text-white/80">No Snapshots Captured Yet</p>
              <p className="text-xs max-w-sm">
                Capture a checkpoint above to preserve this draft before making major layout or content changes.
              </p>
            </div>
          ) : (
            snapshots.map((snap) => {
              const dateStr = new Date(snap.createdAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const isConfirming = confirmRestoreId === snap.id;

              return (
                <div
                  key={snap.id}
                  className="p-3.5 bg-[#141e17] border border-[#233529] hover:border-emerald-500/30 rounded-xl transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-emerald-400" />
                      <span className="font-bold text-sm text-white">{snap.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1c2920] text-[#a0b8a8] border border-[#273a2e]">
                        {snap.templateId}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#7e9986]">
                      <Calendar size={11} />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#1b2b20] text-xs">
                    <span className="text-[#7e9986] text-[11px]">
                      Variant: <strong>{snap.variantName}</strong> ·{' '}
                      {snap.projectData.library.entries.length} Library Entries
                    </span>

                    <div className="flex items-center gap-2">
                      {isConfirming ? (
                        <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-800 rounded px-2 py-1 text-xs">
                          <AlertTriangle size={12} className="text-rose-400" />
                          <span className="text-rose-200">Replace current state?</span>
                          <button
                            type="button"
                            onClick={() => handleRestore(snap)}
                            className="font-bold text-white hover:underline ml-1"
                          >
                            Yes, Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRestoreId(null)}
                            className="text-[#8ba393] hover:text-white ml-1"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreId(snap.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white/5 hover:bg-white/10 text-[#8ba393] hover:text-white border border-white/10 transition-colors"
                          title="Restore full project state from this snapshot"
                        >
                          <RotateCcw size={11} />
                          <span>Restore</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          onForkVariant(snap);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[#1d2c22] hover:bg-[#25392c] text-emerald-300 border border-emerald-700/50 transition-colors"
                        title="Fork as a new variant in active project"
                      >
                        <GitFork size={11} />
                        <span>Fork Variant</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(snap.id)}
                        className="p-1 rounded text-[#7e9986] hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title="Delete checkpoint"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#233529] bg-[#141e17]/90 text-xs text-[#8ba393]">
          <span>Checkpoints remain available across browser reloads.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
