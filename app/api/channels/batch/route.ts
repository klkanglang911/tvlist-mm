import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getChannelData, saveChannelData } from '@/lib/data';
import type { ApiResponse } from '@/types';

/**
 * POST - 批量更新频道顺序
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
    const { channels } = body; // { id: string, order: number }[]

    if (!Array.isArray(channels)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '无效的数据格式',
      }, { status: 400 });
    }

    const data = await getChannelData();

    channels.forEach(({ id, order }) => {
      const channel = data.channels.find(ch => ch.id === id);
      if (channel) {
        channel.order = order;
        channel.updatedAt = new Date().toISOString();
      }
    });

    data.lastUpdated = new Date().toISOString();
    await saveChannelData(data, '批量更新频道顺序');

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '批量更新成功',
    });
  } catch (error) {
    console.error('批量更新失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '批量更新失败',
    }, { status: 500 });
  }
}
