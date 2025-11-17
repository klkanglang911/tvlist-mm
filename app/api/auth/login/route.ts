import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken } from '@/lib/auth';
import type { ApiResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请提供密码',
      }, { status: 400 });
    }

    const isValid = verifyPassword(password);

    if (!isValid) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '密码错误',
      }, { status: 401 });
    }

    const token = generateToken();

    const response = NextResponse.json<ApiResponse>({
      success: true,
      data: { token },
      message: '登录成功',
    });

    // 设置 cookie
    // 在开发环境或未启用 HTTPS 时，不设置 Secure 标志
    const isHttps = process.env.ENABLE_HTTPS === 'true';
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '服务器错误',
    }, { status: 500 });
  }
}
