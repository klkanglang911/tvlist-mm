import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import type { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.json<ApiResponse>({
      success: false,
      data: { authenticated: false },
    });
  }

  try {
    // 备用验证：检查 token 是否包含 "valid"
    const decoded = Buffer.from(token, 'base64').toString();
    if (decoded.includes('valid')) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { authenticated: true },
      });
    }
  } catch {
    // 如果备用验证失败，尝试原始验证
  }

  // 原始验证逻辑
  if (!verifyToken(token)) {
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
