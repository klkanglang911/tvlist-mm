import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getChannelData, saveChannelData } from '@/lib/data';
import type { ApiResponse } from '@/types';

/**
 * POST - 批量删除频道
 * 只消耗 1 次 GitHub API 配额
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
    const { ids } = body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请提供要删除的频道 ID 列表',
      }, { status: 400 });
    }

    // 只读取一次数据
    const data = await getChannelData();

    // 找出要删除的频道名称（用于 commit message）
    const deletedNames = data.channels
      .filter(ch => ids.includes(ch.id))
      .map(ch => ch.name);

    // 过滤掉要删除的频道
    const originalLength = data.channels.length;
    data.channels = data.channels.filter(ch => !ids.includes(ch.id));
    const deletedCount = originalLength - data.channels.length;

    if (deletedCount === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '没有找到要删除的频道',
      }, { status: 404 });
    }

    data.lastUpdated = new Date().toISOString();

    // 只保存一次数据（只消耗 1 次 GitHub API 配额）
    const commitMessage = deletedCount <= 5
      ? `批量删除 ${deletedCount} 个频道: ${deletedNames.join(', ')}`
      : `批量删除 ${deletedCount} 个频道`;

    await saveChannelData(data, commitMessage);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `成功删除 ${deletedCount} 个频道`,
      data: {
        deletedCount,
        deletedNames,
      },
    });
  } catch (error) {
    console.error('批量删除频道失败:', error);
    const errorMessage = error instanceof Error ? error.message : '批量删除频道失败';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
