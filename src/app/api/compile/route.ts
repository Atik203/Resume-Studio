import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { resolveVariant, validateProject } from '../../../lib/data.ts';
import { renderLatex, safeUrl } from '../../../lib/latex.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_LOG = 48_000;
const MAX_REQUEST_BYTES = 8_000_000;

function run(executable: string, args: string[], cwd: string, timeoutMs = 30_000): Promise<{ code: number; log: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd, shell: false, windowsHide: true, timeout: timeoutMs,
      env: { NODE_ENV: process.env.NODE_ENV ?? 'production', ...Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'TEXMFHOME'].flatMap(k => process.env[k] ? [[k, process.env[k] as string]] : [])) },
      stdio: 'pipe',
    });
    child.stdin.end();
    let log = '';
    const append = (chunk: Buffer) => { if (log.length < MAX_LOG) log += chunk.toString('utf8').slice(0, MAX_LOG - log.length); };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.once('error', reject);
    child.once('close', code => resolve({ code: code ?? -1, log }));
  });
}

function safeLog(log: string, workDir: string): string {
  return log.replaceAll(workDir, '[temporary build directory]').replace(/(?:[A-Z]:\\|\\\\)[^\r\n: ]+/gi, '[local path]').slice(-5000);
}

function decodePhoto(dataUrl: string): { extension: string; bytes: Buffer } | null {
  const match = /^data:(image\/(?:png|jpeg|pdf));base64,([A-Za-z0-9+/]+=*)$/.exec(dataUrl);
  if (!match) throw new Error('Photo must be a PNG, JPEG, or PDF image. WebP and other formats are not supported by pdfLaTeX.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 3_000_000) throw new Error('Photo must be smaller than 3 MB.');
  const valid = match[1] === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : match[1] === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8
      : bytes.subarray(0, 5).toString() === '%PDF-';
  if (!valid) throw new Error('Photo content does not match its declared file type.');
  return { extension: match[1] === 'image/png' ? 'png' : match[1] === 'image/jpeg' ? 'jpg' : 'pdf', bytes };
}

export async function POST(request: NextRequest) {
  let workDir = '';
  try {
    const requestBytes = Number(request.headers.get('content-length') ?? 0);
    if (requestBytes > MAX_REQUEST_BYTES) return NextResponse.json({ error: 'Project data is larger than the 8 MB compile limit. Reduce embedded photo size or split the content.' }, { status: 413 });
    const payload = await request.json() as { project?: unknown; variantId?: string };
    const project = validateProject(payload.project);
    const variant = project.variants.find(item => item.id === payload.variantId);
    if (!variant) return NextResponse.json({ error: 'Selected resume variant was not found.' }, { status: 400 });
    const resolved = resolveVariant(project, variant);
    const latex = renderLatex(resolved);
    workDir = await mkdtemp(path.join(tmpdir(), 'resume-studio-'));
    await writeFile(path.join(workDir, 'resume.tex'), latex, 'utf8');
    if (resolved.templateId === 't05-profile-cv' && resolved.profile.photoDataUrl) {
      const photo = decodePhoto(resolved.profile.photoDataUrl);
      if (photo) await writeFile(path.join(workDir, `profile-photo.${photo.extension}`), photo.bytes);
    }
    const executable = process.env.PDFLATEX_PATH?.trim() || 'pdflatex';
    const compile = await run(executable, ['-interaction=nonstopmode', '-halt-on-error', '-file-line-error', '-no-shell-escape', 'resume.tex'], workDir);
    if (compile.code !== 0) {
      const missing = (compile as unknown as { error?: NodeJS.ErrnoException }).error?.code === 'ENOENT';
      const message = missing ? `pdflatex was not found. Add TeX Live's bin directory to PATH or set PDFLATEX_PATH to pdflatex.exe. Configured executable: ${executable}`
        : /timeout|timed out/i.test(compile.log) ? 'pdflatex timed out after 30 seconds. Check TeX Live and reduce the document workload.'
          : `pdflatex could not compile this resume. Check unsupported characters or LaTeX errors.\n${safeLog(compile.log, workDir)}`;
      return NextResponse.json({ error: message }, { status: 422 });
    }
    const pdfPath = path.join(workDir, 'resume.pdf');
    const pdf = await readFile(pdfPath).catch(() => Buffer.alloc(0));
    if (pdf.length < 100) return NextResponse.json({ error: 'pdflatex exited successfully but did not produce a valid PDF.' }, { status: 422 });
    const parsedPdf = await PDFDocument.load(pdf);
    const pageCount = parsedPdf.getPageCount();
    const linkCount = parsedPdf.getPages().reduce((total, page) => {
      const annotations = page.node.Annots()?.asArray() ?? [];
      return total + annotations.filter(reference => {
        const annotation = parsedPdf.context.lookup(reference);
        return annotation instanceof PDFDict && annotation.get(PDFName.of('Subtype'))?.toString() === '/Link';
      }).length;
    }, 0);
    const expectedLinks = Number(Boolean(resolved.profile.email.trim())) + resolved.profile.links.filter(link => safeUrl(link.url)).length + resolved.entries.reduce((total, entry) => total + entry.links.filter(link => safeUrl(link.url)).length, 0);
    if (linkCount < expectedLinks) return NextResponse.json({ error: 'One or more PDF hyperlinks could not be verified. Check the link URLs and try again.' }, { status: 422 });
    const extracted = await run('pdftotext', ['resume.pdf', '-'], workDir, 10_000).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') throw new Error('pdftotext was not found. Add TeX Live’s bin directory or Poppler to PATH so selectable PDF text can be verified.');
      throw error;
    });
    if (!extracted.log.trim()) return NextResponse.json({ error: 'The PDF contains no selectable text. Please check the selected content.' }, { status: 422 });
    const overflow = pageCount > resolved.maxPages;
    return new NextResponse(new Uint8Array(pdf), { headers: {
      'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="resume-studio.pdf"',
      'X-Resume-Page-Count': String(pageCount ?? 'unknown'), 'X-Resume-Max-Pages': String(resolved.maxPages),
      'X-Resume-Overflow': String(overflow), 'Cache-Control': 'no-store',
    } });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    const message = code === 'ENOENT'
      ? `pdflatex was not found. Add TeX Live's bin directory to PATH or set PDFLATEX_PATH to pdflatex.exe. Configured executable: ${process.env.PDFLATEX_PATH?.trim() || 'pdflatex'}`
      : code === 'ETIMEDOUT' ? 'pdflatex timed out after 30 seconds. Check TeX Live and reduce the document workload.'
        : error instanceof Error ? error.message : 'Could not compile this resume.';
    return NextResponse.json({ error: message }, { status: code === 'ENOENT' ? 503 : code === 'ETIMEDOUT' ? 504 : 400 });
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
