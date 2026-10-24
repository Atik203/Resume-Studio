export interface CompileResponseMetadata {
  pageCount: number;
  maxPages: number;
  overflow: boolean;
}

export function parseCompileResponseMetadata(response: Pick<Response, 'status' | 'headers'>): CompileResponseMetadata {
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (response.status !== 200 || contentType !== 'application/json') {
    throw new Error('The local compiler did not return a PDF payload. Retry the preview and check the local compile service.');
  }
  const pageCount = Number(response.headers.get('x-resume-page-count'));
  const maxPages = Number(response.headers.get('x-resume-max-pages'));
  const overflowHeader = response.headers.get('x-resume-overflow');
  if (!Number.isInteger(pageCount) || pageCount < 1 || !Number.isInteger(maxPages) || maxPages < 1 || (overflowHeader !== 'true' && overflowHeader !== 'false')) {
    throw new Error('The local compiler returned a PDF without valid page metadata. Rebuild the preview and check the local compile service.');
  }
  return { pageCount, maxPages, overflow: overflowHeader === 'true' };
}

export function decodePdfBase64(value: unknown): Uint8Array {
  if (typeof value !== 'string' || !value.length || value.length > 16_000_000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('The local compiler returned an invalid PDF payload. Retry the preview and check the local compile service.');
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  if (bytes.length < 100 || new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') {
    throw new Error('The local compiler returned an empty or invalid PDF. Retry the preview and check the local compile service.');
  }
  return bytes;
}
