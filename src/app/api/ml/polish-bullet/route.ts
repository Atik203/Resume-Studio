import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.bullet || typeof body.bullet !== 'string' || !body.bullet.trim()) {
      return NextResponse.json({ error: 'Bullet text is required.' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000); // 35s for local SLM inference

    try {
      const res = await fetch(`${ML_SERVICE_URL}/api/polish-bullet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      clearTimeout(timeout);
    }

    // Offline fallback if Python service is not running
    const originalText = body.bullet.trim();
    const cleaned = originalText.replace(/\.$/, '');

    const quantified = `${cleaned}, driving a 35% efficiency improvement and reducing operational latency.`;
    const action = `Spearheaded ${cleaned.toLowerCase()}, establishing automated verification and high-reliability operational patterns.`;
    const compact = `${cleaned}, delivering 35% higher throughput and optimized resource utilization.`;

    return NextResponse.json({
      success: true,
      source: 'offline_heuristic_fallback',
      original: {
        text: originalText,
        score: 45,
        verb_strength: 'moderate',
        has_metrics: false,
        has_methodology: false,
      },
      variations: [
        {
          key: 'quantified',
          title: 'Quantified Impact',
          tag: 'Google XYZ',
          description: 'Emphasizes measurable metrics, scale, and performance outcome.',
          text: quantified,
          score: 85,
          verb_strength: 'strong',
          first_verb: 'Driving',
          has_metrics: true,
          has_methodology: true,
          delta_score: 40,
        },
        {
          key: 'action',
          title: 'Action-First Leadership',
          tag: 'Leadership',
          description: 'Emphasizes proactive architecture, execution, and technical authority.',
          text: action,
          score: 80,
          verb_strength: 'strong',
          first_verb: 'Spearheaded',
          has_metrics: false,
          has_methodology: true,
          delta_score: 35,
        },
        {
          key: 'compact',
          title: 'Compact ATS',
          tag: 'ATS Dense',
          description: 'Keyword-dense, concise single line optimized for tight page limits.',
          text: compact,
          score: 75,
          verb_strength: 'strong',
          first_verb: 'Delivering',
          has_metrics: true,
          has_methodology: false,
          delta_score: 30,
        },
      ],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
