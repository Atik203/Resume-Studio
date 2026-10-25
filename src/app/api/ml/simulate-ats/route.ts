import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project, variantId } = body;

    if (!project || typeof project !== 'object') {
      return NextResponse.json({ error: 'project payload is required' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${ML_SERVICE_URL}/api/simulate-ats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, variantId }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText || 'ML service returned error' }, { status: res.status });
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to contact local ML service';
    return NextResponse.json({ error: message, offline: true }, { status: 503 });
  }
}
