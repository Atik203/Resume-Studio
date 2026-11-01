/**
 * True when a completed compilation was started from an older document
 * revision than the one currently in the editor. Stale results are discarded.
 */
export function isStaleCompile(requestRevision: number, currentRevision: number): boolean {
  return requestRevision !== currentRevision;
}
