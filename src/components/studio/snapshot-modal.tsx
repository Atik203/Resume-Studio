'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { useModalBehavior } from '@/hooks/use-modal-behavior';

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

  const modalRef = useRef<HTMLDivElement>(null);
  useModalBehavior(modalRef, onClose, isOpen);

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
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl text-foreground overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-wide">
                Snapshot Time Machine
              </h2>
              <p className="text-xs text-muted-foreground">
                Durable local checkpoints saved in IndexedDB
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

        {/* Snapshot Creation Form */}
        <div className="px-6 py-3.5 bg-muted/50 border-b border-border">
          <form onSubmit={handleCreateSnapshot} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`e.g. "Tailored for SRE" or "Post-Mentor Review"`}
              value={newSnapshotName}
              onChange={(e) => setNewSnapshotName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-muted text-foreground placeholder:text-muted-foreground border border-border rounded-lg text-xs focus:outline-none focus:border-emerald-500/50"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs rounded-lg shadow-md transition-all active:scale-95 shrink-0"
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
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-muted-foreground">
              <History size={36} className="text-muted-foreground/50 opacity-60" />
              <p className="text-sm font-semibold text-foreground/80">No Snapshots Captured Yet</p>
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
                  className="p-3.5 bg-muted border border-border hover:border-emerald-500/30 rounded-xl transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-emerald-400" />
                      <span className="font-bold text-sm text-foreground">{snap.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                        {snap.templateId}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar size={11} />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border text-xs">
                    <span className="text-muted-foreground text-[11px]">
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
                            className="font-bold text-foreground hover:underline ml-1"
                          >
                            Yes, Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRestoreId(null)}
                            className="text-muted-foreground hover:text-foreground ml-1"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreId(snap.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors"
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-700/50 transition-colors"
                        title="Fork as a new variant in active project"
                      >
                        <GitFork size={11} />
                        <span>Fork Variant</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(snap.id)}
                        className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
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
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/90 text-xs text-muted-foreground">
          <span>Checkpoints remain available across browser reloads.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 bg-muted/60 hover:bg-muted rounded-lg text-foreground font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
