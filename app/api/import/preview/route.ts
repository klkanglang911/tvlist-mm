import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { parseTxtFile } from '@/lib/parser';
import { testChannel } from '@/lib/channel-checker';
import type { ApiResponse, Channel, ChannelTestResult } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST - 预览并测试将要导入的频道
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
    const { content, defaultCategory } = body;

    if (!content) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '导入内容不能为空',
      }, { status: 400 });
    }

    // 解析频道列表
    const parsed = parseTxtFile(content);

    if (parsed.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '未能解析任何有效频道',
      }, { status: 400 });
    }

    // 转换为临时 Channel 对象（用于测试）
    const tempChannels: Channel[] = parsed
      .filter(ch => ch.name && ch.url)
      .map(ch => ({
        id: uuidv4(),
        name: ch.name!,
        url: ch.url!,
        category: defaultCategory || '其他',
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'unknown' as const,
      }));

    // 返回解析后的频道列表（不包含测试结果）
    return NextResponse.json<ApiResponse>({
      success: true,
      data: tempChannels,
      message: `解析成功，共 ${tempChannels.length} 个频道`,
    });
  } catch (error) {
    console.error('导入预览失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '导入预览失败',
    }, { status: 500 });
  }
}
