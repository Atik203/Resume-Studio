import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ status: 'offline', message: `HTTP ${res.status}` });
    }

    const data = await res.json();
    return NextResponse.json({ status: 'online', ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Service unreachable';
    return NextResponse.json({ status: 'offline', message });
  }
}
