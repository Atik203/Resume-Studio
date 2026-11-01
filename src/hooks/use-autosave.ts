'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ProjectData } from '@/lib/data';
import { saveProject } from '@/lib/storage';

export type SaveState = 'saving' | 'saved' | 'idle' | 'error';

export function useAutosave(project: ProjectData, ready: boolean): {
  saveState: SaveState;
  saveStateText: string;
  markSaving: () => void;
  markLoaded: () => void;
  reportLoadError: () => void;
} {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveStateText, setSaveStateText] = useState('Loading library…');

  const markSaving = useCallback(() => {
    setSaveState('saving');
    setSaveStateText('Saving…');
  }, []);

  const markLoaded = useCallback(() => {
    setSaveState('saved');
    setSaveStateText('Saved locally');
  }, []);

  const reportLoadError = useCallback(() => {
    setSaveState('error');
    setSaveStateText('Storage error');
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      setSaveState('saving');
      setSaveStateText('Saving…');
      saveProject(project)
        .then(() => {
          setSaveState('saved');
          setSaveStateText('Saved locally');
        })
        .catch(err => {
          setSaveState('error');
          setSaveStateText(`Save failed: ${err instanceof Error ? err.message : 'error'}`);
        });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [project, ready]);

  return { saveState, saveStateText, markSaving, markLoaded, reportLoadError };
}
