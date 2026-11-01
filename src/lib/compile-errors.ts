export interface CompileFailureContext {
  log: string;
  executable: string;
  errorCode?: string;
  timedOut?: boolean;
}

/**
 * Turn a raw TeX/process failure into a user-facing message. The route appends
 * a redacted log tail for unknown failures.
 */
export function explainCompileFailure({ log, executable, errorCode, timedOut }: CompileFailureContext): string {
  if (errorCode === 'ENOENT') {
    return `pdflatex was not found. Add TeX Live's bin directory to PATH or set PDFLATEX_PATH to pdflatex.exe. Configured executable: ${executable}`;
  }
  if (timedOut || /timeout|timed out/i.test(log)) {
    return 'pdflatex timed out after 30 seconds. Check TeX Live and reduce the document workload.';
  }
  if (/fontawesome5(?:-utex-helper)?\.sty|fontawesome5/i.test(log)) {
    return 'The PDF uses link-type icons, but the TeX Live fontawesome5 package is missing. Install fontawesome5 or disable Link Type Icons in Customize.';
  }

  const missingPackage = log.match(/File [`']([^'`]+)\.sty' not found/i);
  if (missingPackage) {
    return `The PDF template needs the LaTeX package "${missingPackage[1]}". Install it with TeX Live Manager, then recompile.`;
  }

  return 'pdflatex could not compile this resume. Check unsupported characters or LaTeX errors.';
}
