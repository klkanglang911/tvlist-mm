import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import type { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (!token || !verifyToken(token)) {
    return NextResponse.json<ApiResponse>({
      success: false,
      data: { authenticated: false },
    });
  }

  return NextResponse.json<ApiResponse>({
    success: true,
    data: { authenticated: true },
  });
}
