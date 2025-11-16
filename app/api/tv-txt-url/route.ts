import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import type { ApiResponse } from '@/types';

/**
 * GET - 获取带访问密钥的完整 tv.txt URL（需要认证）
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  try {
    const accessKey = (process.env.TV_TXT_ACCESS_KEY || '').trim();

    if (!accessKey) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'TV_TXT_ACCESS_KEY 环境变量未配置',
      }, { status: 500 });
    }

    // 获取主机地址
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    const fullUrl = `${baseUrl}/tv.txt?key=${encodeURIComponent(accessKey)}`;

    return NextResponse.json({
      success: true,
      url: fullUrl,
    });
  } catch (error) {
    console.error('获取 TV.TXT URL 失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取 URL 失败',
    }, { status: 500 });
  }
}
