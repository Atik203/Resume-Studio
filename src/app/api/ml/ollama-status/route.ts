import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
const OLLAMA_URL = 'http://127.0.0.1:11434';

export async function GET() {
  // First try via Python ML service
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${ML_SERVICE_URL}/api/ollama/status`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fall back to direct Ollama check
  }

  // Direct check to Ollama daemon
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as { models?: Array<{ name?: string }> };
      const models = (data.models || []).map((m) => m.name || '');
      const modelAvailable = models.some((m) => m.includes('qwen3.5:4b') || m.startsWith('qwen3.5'));

      return NextResponse.json({
        online: true,
        preferred_model: 'qwen3.5:4b',
        model_available: modelAvailable,
        installed_models: models,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ollama offline';
    return NextResponse.json({
      online: false,
      preferred_model: 'qwen3.5:4b',
      model_available: false,
      installed_models: [],
      error: message,
    });
  }

  return NextResponse.json({
    online: false,
    preferred_model: 'qwen3.5:4b',
    model_available: false,
    installed_models: [],
  });
}
