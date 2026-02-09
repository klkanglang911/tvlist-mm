import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { reorderChannelsInCategory } from '@/lib/data';
import type { ApiResponse } from '@/types';

/**
 * POST - 重新排序同一分类内的频道
 * Body: { categoryId: string, channelIds: string[] }
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
    const { categoryId, channelIds } = body as { categoryId: string; channelIds: string[] };

    if (!categoryId || typeof categoryId !== 'string') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '缺少分类 ID',
      }, { status: 400 });
    }

    if (!Array.isArray(channelIds) || channelIds.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '无效的频道 ID 列表',
      }, { status: 400 });
    }

    const success = reorderChannelsInCategory(categoryId, channelIds);

    if (success) {
      return NextResponse.json<ApiResponse>({
        success: true,
        message: '排序成功',
      });
    } else {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '排序失败，请检查频道是否存在',
      }, { status: 400 });
    }
  } catch (error) {
    console.error('频道排序失败:', error);
    const errorMessage = error instanceof Error ? error.message : '频道排序失败';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
