export interface CompileResponseMetadata {
  pageCount: number;
  maxPages: number;
  overflow: boolean;
}

export function parseCompileResponseMetadata(response: Pick<Response, 'status' | 'headers'>): CompileResponseMetadata {
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (response.status !== 200 || contentType !== 'application/pdf') {
    throw new Error('The local compiler did not return a PDF. Retry the preview and check the local compile service.');
  }
  const pageCount = Number(response.headers.get('x-resume-page-count'));
  const maxPages = Number(response.headers.get('x-resume-max-pages'));
  const overflowHeader = response.headers.get('x-resume-overflow');
  if (!Number.isInteger(pageCount) || pageCount < 1 || !Number.isInteger(maxPages) || maxPages < 1 || (overflowHeader !== 'true' && overflowHeader !== 'false')) {
    throw new Error('The local compiler returned a PDF without valid page metadata. Rebuild the preview and check the local compile service.');
  }
  return { pageCount, maxPages, overflow: overflowHeader === 'true' };
}
