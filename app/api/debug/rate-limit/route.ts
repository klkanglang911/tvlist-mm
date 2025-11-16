import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

/**
 * 检查 GitHub API 速率限制状态
 */
export async function GET(request: NextRequest) {
  // 验证认证
  const token = request.cookies.get('auth-token')?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const { data } = await octokit.rateLimit.get();

    const core = data.resources.core;
    const resetTime = new Date(core.reset * 1000);
    const now = new Date();
    const minutesUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / 60000);

    return NextResponse.json({
      success: true,
      data: {
        limit: core.limit,
        remaining: core.remaining,
        used: core.used,
        reset: resetTime.toISOString(),
        resetLocal: resetTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        minutesUntilReset,
        isLimited: core.remaining === 0,
        percentage: Math.round((core.remaining / core.limit) * 100),
      },
    });
  } catch (error) {
    console.error('获取速率限制失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取速率限制失败',
    }, { status: 500 });
  }
}
