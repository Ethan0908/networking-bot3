import { NextResponse } from 'next/server';

/**
 * Temporary handler to keep the auth callback route live in production.
 * Replace with a NextAuth configuration when authentication is ready.
 */
function notImplementedResponse() {
  return NextResponse.json(
    {
      error: 'NextAuth is not configured yet.',
      message:
        'This is a placeholder for /api/auth/[...nextauth]. Configure NextAuth to enable authentication.',
    },
    { status: 501 }
  );
}

export async function GET() {
  return notImplementedResponse();
}

export async function POST() {
  return notImplementedResponse();
}
