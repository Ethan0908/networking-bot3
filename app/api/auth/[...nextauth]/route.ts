import { NextRequest, NextResponse } from 'next/server';

const NOT_IMPLEMENTED_MESSAGE = {
  error: 'NextAuth is not yet configured on this deployment.',
  hint: 'Add your NextAuth handler to app/api/auth/[...nextauth]/route.ts.',
};

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  return NextResponse.json(NOT_IMPLEMENTED_MESSAGE, { status: 501 });
}

export async function POST(_request: NextRequest) {
  return NextResponse.json(NOT_IMPLEMENTED_MESSAGE, { status: 501 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET,POST,OPTIONS',
    },
  });
}
