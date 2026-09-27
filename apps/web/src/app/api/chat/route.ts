import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RequestSchema = z.object({
  message: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = RequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request', details: result.error.format() }, { status: 400 });
    }

    const mcpServerUrl = process.env.AGENT_API_URL || 'http://127.0.0.1:8080';

    const response = await fetch(`${mcpServerUrl}/agent/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: result.data.message }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Backend error: ${response.status}`, details: errText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Chat API] Error calling agent backend:', error);
    return NextResponse.json({ error: 'Failed to contact Agent backend', details: error.message }, { status: 500 });
  }
}
