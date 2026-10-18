import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';

const RequestSchema = z.object({
  message: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Verify active session with Auth.js
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to access Homepilot.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = RequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.format() },
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

    // 2. Forward request to Fastify with Authorization Bearer token & user headers
    const response = await fetch(`${mcpServerUrl}/agent/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
        'x-user-id': userId,
        'x-user-name': session.user.name || 'Homeowner',
        'x-user-email': session.user.email || 'homeowner@amazon.internal',
      },
      body: JSON.stringify({
        prompt: result.data.message,
        userId: userId,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.status}`, details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Chat API] Error calling agent backend:', error);
    return NextResponse.json(
      { error: 'Failed to contact Agent backend', details: error.message },
      { status: 500 }
    );
  }
}
