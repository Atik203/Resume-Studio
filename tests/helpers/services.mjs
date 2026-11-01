export const ML_HEALTH_URL = 'http://127.0.0.1:8000/health';

/**
 * Returns true only when a local service answers a request within the timeout.
 * Never throws: integration tests use this to skip cleanly when a service is
 * not running on the developer machine.
 */
export async function serviceIsUp(url, timeoutMs = 750) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
