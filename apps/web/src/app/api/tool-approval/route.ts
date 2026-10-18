import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ApprovalSchema = z.object({
  toolName: z.string().min(1),
  decision: z.enum(['approved', 'rejected']),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ApprovalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid approval request', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const mcpServerUrl = process.env.AGENT_API_URL || 'http://127.0.0.1:8080';

    const response = await fetch(`${mcpServerUrl}/agent/tool-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `MCP server error: ${response.status}`, details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Tool Approval API] Error forwarding decision:', error);
    return NextResponse.json(
      { error: 'Failed to contact MCP server for tool approval', details: error.message },
      { status: 500 }
    );
  }
}

