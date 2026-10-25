'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

export interface NewDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (type: 'resume' | 'cv', name: string) => void;
  existingResumeCount: number;
  existingCvCount: number;
}

export function NewDraftModal({
  isOpen,
  onClose,
  onCreate,
  existingResumeCount,
  existingCvCount,
}: NewDraftModalProps) {
  const [draftType, setDraftType] = useState<'resume' | 'cv'>('resume');
  const [draftName, setDraftName] = useState('');

  if (!isOpen) return null;

  function handleSubmit() {
    const fallback =
      draftType === 'cv'
        ? `Academic CV Draft ${existingCvCount + 1}`
        : `Resume Draft ${existingResumeCount + 1}`;
    onCreate(draftType, draftName.trim() || fallback);
    setDraftName('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-draft-modal-title"
    >
      <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 id="new-draft-modal-title" className="text-lg font-bold">
            Create New Draft
          </h3>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-muted-foreground -mt-3">
          Choose whether to create a compact 1-page Software Resume or a longer Academic/Professional
          CV. Your master profile and entries stay safely shared.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDraftType('resume')}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
              draftType === 'resume'
                ? 'border-primary bg-primary/10 shadow-xs'
                : 'border-border bg-card/50 hover:bg-muted/50'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              1-Page Resume
            </span>
            <span className="text-sm font-semibold">Software Developer</span>
            <span className="text-xs text-muted-foreground">
              Compact ATS layout · Centered header · Skills & Projects
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDraftType('cv')}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
              draftType === 'cv'
                ? 'border-primary bg-primary/10 shadow-xs'
                : 'border-border bg-card/50 hover:bg-muted/50'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
              2-Page CV
            </span>
            <span className="text-sm font-semibold">Academic / Professional</span>
            <span className="text-xs text-muted-foreground">
              Roomy academic rhythm · Education & Experience first
            </span>
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Draft Name</span>
          <Input
            placeholder={
              draftType === 'resume' ? 'e.g. Senior Frontend Resume' : 'e.g. Research & Teaching CV'
            }
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            autoFocus
          />
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" className="button secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button className="button primary" onClick={handleSubmit}>
            <Plus size={14} />
            <span>Create Draft</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
