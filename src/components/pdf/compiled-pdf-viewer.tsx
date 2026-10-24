'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ChevronDown, ChevronUp, ExternalLink, Maximize2, Scan, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface CompiledPdfViewerProps {
  src: string;
  expectedPageCount: number | null;
  overflow: boolean;
  onPageCountChange: (pages: number) => void;
}

interface PageSize { width: number; height: number }

export default function CompiledPdfViewer({ src, expectedPageCount, overflow, onPageCountChange }: CompiledPdfViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [pageSize, setPageSize] = useState<PageSize | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [activePage, setActivePage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [fitPage, setFitPage] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setViewport({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const pageWidth = useMemo(() => {
    if (!viewport.width) return undefined;
    const availableWidth = Math.max(320, Math.min(960, viewport.width - 48));
    if (!fitPage || !pageSize || !viewport.height) return availableWidth * zoom;
    const availableHeight = Math.max(420, viewport.height - 56);
    const fitPageWidth = Math.min(availableWidth, availableHeight * pageSize.width / pageSize.height);
    return fitPageWidth * zoom;
  }, [fitPage, pageSize, viewport.height, viewport.width, zoom]);

  async function onDocumentLoadSuccess(document: PDFDocumentProxy) {
    setPageCount(document.numPages);
    setActivePage(1);
    onPageCountChange(document.numPages);
    try {
      const page = await document.getPage(1);
      const size = page.getViewport({ scale: 1 });
      setPageSize({ width: size.width, height: size.height });
    } catch {
      setError('The PDF loaded, but its page dimensions could not be read.');
    }
  }

  function goToPage(page: number) {
    const nextPage = Math.max(1, Math.min(pageCount, page));
    setActivePage(nextPage);
    pageRefs.current[nextPage - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return <div className="pdf-viewer" aria-label="Compiled PDF viewer">
    <div className="pdf-viewer-toolbar">
      <div className="pdf-page-control" aria-label="Page navigation">
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={activePage <= 1} onClick={() => goToPage(activePage - 1)}><ChevronUp /></Button>
        <span><strong>{pageCount ? activePage : '—'}</strong><span> / {pageCount || '—'}</span></span>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={!pageCount || activePage >= pageCount} onClick={() => goToPage(activePage + 1)}><ChevronDown /></Button>
      </div>
      <div className="pdf-zoom-control" aria-label="Zoom controls">
        <Button variant="outline" size="icon-sm" aria-label="Zoom out" onClick={() => { setFitPage(false); setZoom(value => Math.max(.5, Number((value - .1).toFixed(2)))); }}><ZoomOut /></Button>
        <span>{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="icon-sm" aria-label="Zoom in" onClick={() => { setFitPage(false); setZoom(value => Math.min(1.8, Number((value + .1).toFixed(2)))); }}><ZoomIn /></Button>
        <Button variant="outline" size="icon-sm" aria-label="Fit page" aria-pressed={fitPage} onClick={() => { setFitPage(true); setZoom(1); }}><Scan /></Button>
        <Button variant="outline" size="icon-sm" aria-label="Fit width" aria-pressed={!fitPage && zoom === 1} onClick={() => { setFitPage(false); setZoom(1); }}><Maximize2 /></Button>
      </div>
      <a className="pdf-open-link" href={src} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" /> <span>Open PDF</span></a>
    </div>
    {overflow && <div className="pdf-overflow-note" role="status">This document exceeds the selected page limit. All content is preserved.</div>}
    {expectedPageCount && pageCount && expectedPageCount !== pageCount && <div className="pdf-overflow-note" role="alert">Page metadata mismatch: the server reported {expectedPageCount} page(s), the viewer found {pageCount}.</div>}
    {error && <div className="pdf-viewer-error" role="alert">{error}</div>}
    <div className="pdf-page-viewport" ref={viewportRef}>
      <Document file={src} onLoadSuccess={onDocumentLoadSuccess} onLoadError={loadError => setError(loadError.message || 'The compiled PDF could not be opened.')} loading={<div className="pdf-viewer-state">Loading compiled PDF…</div>} error={<div className="pdf-viewer-state" role="alert">This compiled PDF could not be rendered. Download it to inspect the file.</div>}>
        {Array.from({ length: pageCount }, (_, index) => <div className="pdf-page-frame" key={`${src}-${index + 1}`} ref={node => { pageRefs.current[index] = node; }} data-page={index + 1}>
          <Page pageNumber={index + 1} width={pageWidth} renderTextLayer renderAnnotationLayer loading={<div className="pdf-viewer-state">Rendering page {index + 1}…</div>} />
        </div>)}
      </Document>
    </div>
  </div>;
}
