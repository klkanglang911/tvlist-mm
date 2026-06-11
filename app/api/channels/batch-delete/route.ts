import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { deleteChannels, getChannelData } from '@/lib/data';
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

    // 获取要删除的频道名称（用于响应）
    const data = await getChannelData();
    const deletedNames = data.channels
      .filter(ch => ids.includes(ch.id))
      .map(ch => ch.name);

    // 使用批量删除函数
    const deletedCount = deleteChannels(ids);

    if (deletedCount === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '没有找到要删除的频道',
      }, { status: 404 });
    }

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
