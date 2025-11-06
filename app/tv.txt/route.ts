import { NextResponse } from 'next/server';
import { getChannelData } from '@/lib/data';
import { generateTxtFile } from '@/lib/parser';

/**
 * GET - 公开访问的 TV 列表（用于 VLC 等播放器）
 */
export async function GET() {
  try {
    const data = await getChannelData();

    const content = generateTxtFile(
      data.channels,
      data.categories.map(cat => cat.name)
    );

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 缓存 5 分钟
      },
    });
  } catch (error) {
    console.error('生成 TV 列表失败:', error);
    return new NextResponse('# 生成列表失败', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}
