import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getFileAtCommit, GITHUB_CONFIG } from '@/lib/github';
import { saveChannelData } from '@/lib/data';
import type { ApiResponse, ChannelData } from '@/types';

/**
 * POST - 回滚到指定版本
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sha } = body;

    if (!sha) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '版本 SHA 不能为空',
      }, { status: 400 });
    }

    const content = await getFileAtCommit(GITHUB_CONFIG.dataPath, sha);

    if (!content) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '无法获取指定版本的数据',
      }, { status: 404 });
    }

    const data: ChannelData = JSON.parse(content);
    data.lastUpdated = new Date().toISOString();

    await saveChannelData(data, `回滚到版本: ${sha.substring(0, 7)}`);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '回滚成功',
    });
  } catch (error) {
    console.error('回滚失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '回滚失败',
    }, { status: 500 });
  }
}
