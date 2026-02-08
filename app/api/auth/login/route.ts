import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken, checkRateLimit, recordLoginAttempt, clearRateLimit } from '@/lib/auth';
import type { ApiResponse } from '@/types';

// 获取客户端标识符（IP 或请求头）
function getClientIdentifier(request: NextRequest): string {
  // 优先使用 X-Forwarded-For（用于反向代理后的真实 IP）
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // 使用 X-Real-IP
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // 默认使用 unknown（不应该发生）
  return 'unknown';
}

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);

  // 检查速率限制
  const rateLimit = checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: `尝试次数过多，请 ${rateLimit.retryAfter} 秒后重试`,
    }, {
      status: 429,
      headers: {
        'Retry-After': String(rateLimit.retryAfter),
      },
    });
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请提供密码',
      }, { status: 400 });
    }

    // 记录登录尝试
    recordLoginAttempt(clientId);

    const isValid = verifyPassword(password);

    if (!isValid) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '密码错误',
      }, { status: 401 });
    }

    // 登录成功，清除速率限制
    clearRateLimit(clientId);

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
