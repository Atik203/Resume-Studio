'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectData } from '@/lib/data';
import { decodePdfBase64, parseCompileResponseMetadata } from '@/lib/compile-response';
import { isStaleCompile } from '@/lib/compile-guard';

export interface UseCompilePreviewOptions {
  project: ProjectData;
  variantId: string;
  revision: number;
  ready: boolean;
  autoPreview: boolean;
  previewDelayMs: number;
}

export interface UseCompilePreviewResult {
  pdfUrl: string;
  pdfFile: Blob | null;
  pageCount: string;
  overflow: boolean;
  compiledRevision: number;
  busy: boolean;
  message: string;
  setMessage: (value: string) => void;
  setPageCount: (value: string) => void;
  compile: () => Promise<void>;
  invalidate: () => void;
}

export function useCompilePreview({
  project,
  variantId,
  revision,
  ready,
  autoPreview,
  previewDelayMs,
}: UseCompilePreviewOptions): UseCompilePreviewResult {
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<Blob | null>(null);
  const [pageCount, setPageCount] = useState('');
  const [overflow, setOverflow] = useState(false);
  const [compiledRevision, setCompiledRevision] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const revisionRef = useRef(revision);
  useEffect(() => {
    revisionRef.current = revision;
  }, [revision]);

  const invalidate = useCallback(() => {
    controllerRef.current?.abort();
    setPdfFile(null);
    setPageCount('');
    setOverflow(false);
    setPdfUrl(current => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });
  }, []);

  const compile = useCallback(async () => {
    const rev = revisionRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    setBusy(true);
    setMessage('Compiling with local pdflatex…');

    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, variantId }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? 'Compilation failed.');
      }
      const metadata = parseCompileResponseMetadata(response);
      const result = (await response.json()) as { pdfBase64?: unknown };
      const bytes = decodePdfBase64(result.pdfBase64);
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      const blob = new Blob([buffer], { type: 'application/pdf' });

      if (isStaleCompile(rev, revisionRef.current)) {
        setMessage('The document changed during compilation. Build a fresh preview.');
        return;
      }

      const nextUrl = URL.createObjectURL(blob);
      setPdfUrl(current => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
      setPdfFile(blob);
      setCompiledRevision(rev);
      setPageCount(String(metadata.pageCount));
      setOverflow(metadata.overflow);
      setMessage('PDF compiled and verified locally.');
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setMessage(error instanceof Error ? error.message : 'Compilation failed.');
      }
    } finally {
      if (requestIdRef.current === requestId) setBusy(false);
    }
  }, [project, variantId]);

  useEffect(() => {
    if (!ready || !autoPreview) return;
    const timer = window.setTimeout(() => {
      compile();
    }, previewDelayMs || 800);
    return () => window.clearTimeout(timer);
  }, [ready, revision, variantId, autoPreview, previewDelayMs, compile]);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  return {
    pdfUrl,
    pdfFile,
    pageCount,
    overflow,
    compiledRevision,
    busy,
    message,
    setMessage,
    setPageCount,
    compile,
    invalidate,
  };
}
