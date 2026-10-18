import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';

const InterruptResolutionSchema = z.object({
  interruptId: z.string().min(1, 'interruptId is required'),
  decision: z.enum(['approved', 'rejected']),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Verify active session with Auth.js
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: homeowner authentication required to resolve clearance interrupt.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = InterruptResolutionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid interrupt resolution payload', details: result.error.format() },
        { status: 400 }
      );
    }

    const mcpServerUrl = process.env.AGENT_API_URL || 'http://127.0.0.1:8080';
    const sessionToken =
      req.cookies.get('authjs.session-token')?.value ||
      req.cookies.get('__Secure-authjs.session-token')?.value ||
      session.user.id ||
      'dev-session-token';

    const userId = (session.user as any).id || '00000000-0000-0000-0000-000000000001';

    // 2. Forward request to Fastify with Authorization Bearer header & userId
    const response = await fetch(`${mcpServerUrl}/agent/interrupt/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
        'x-user-id': userId,
      },
      body: JSON.stringify({
        ...result.data,
        userId: userId,
      }),
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
