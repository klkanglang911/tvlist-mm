import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * 诊断 API - 检查环境变量配置
 * 仅在已登录时可访问
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

  const envCheck = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN ? '✅ 已设置' : '❌ 未设置',
    GITHUB_OWNER: (process.env.GITHUB_OWNER || '❌ 未设置').trim(),
    GITHUB_REPO: (process.env.GITHUB_REPO || '❌ 未设置').trim(),
    GITHUB_BRANCH: (process.env.GITHUB_BRANCH || '(使用默认值: main)').trim(),
    GITHUB_DATA_PATH: (process.env.GITHUB_DATA_PATH || '(使用默认值: data/channels.json)').trim(),
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? '✅ 已设置' : '❌ 未设置',
    _raw: {
      GITHUB_OWNER_length: process.env.GITHUB_OWNER?.length || 0,
      GITHUB_OWNER_trimmed_length: (process.env.GITHUB_OWNER || '').trim().length,
    }
  };

  return NextResponse.json({
    success: true,
    data: envCheck,
  });
}
