import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const InterruptResolutionSchema = z.object({
  interruptId: z.string().min(1, 'interruptId is required'),
  decision: z.enum(['approved', 'rejected']),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = InterruptResolutionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid interrupt resolution payload', details: result.error.format() },
        { status: 400 }
      );
    }

    const mcpServerUrl = process.env.AGENT_API_URL || 'http://127.0.0.1:8080';

    const response = await fetch(`${mcpServerUrl}/agent/interrupt/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[Interrupt Resolution API] Error communicating with MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to resolve interrupt', details: error.message },
      { status: 500 }
    );
  }
}

