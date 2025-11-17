import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { testChannel } from '@/lib/channel-checker';
import type { ApiResponse, Channel, ChannelTestResult } from '@/types';

/**
 * POST - 测试单个频道
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
    const { channel } = body as { channel: Channel };

    if (!channel || !channel.url || !channel.name) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '频道信息不完整',
      }, { status: 400 });
    }

    // 测试频道
    const result = await testChannel(channel);

    return NextResponse.json<ApiResponse<ChannelTestResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('测试频道失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '测试失败',
    }, { status: 500 });
  }
}
