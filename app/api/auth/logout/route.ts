import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

export async function POST() {
  const response = NextResponse.json<ApiResponse>({
    success: true,
    message: '退出成功',
  });

  response.cookies.delete('auth-token');

  return response;
}
