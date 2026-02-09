import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, unauthorizedResponse } from '@/lib/auth';
import { getChannelData } from '@/lib/data';
import { generateTxtFile, generateM3uFile } from '@/lib/parser';

/**
 * GET - 导出频道列表（需要认证）
 */
export async function GET(request: NextRequest) {
  // 认证检查
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'txt'; // txt | m3u
    const category = searchParams.get('category'); // 可选，导出特定分类

    const data = await getChannelData();

    let channels = data.channels;
    if (category && category !== 'all') {
      channels = channels.filter(ch => ch.category === category);
    }

    let content: string;
    let filename: string;
    let contentType: string;

    if (format === 'm3u') {
      content = generateM3uFile(
        channels,
        data.categories.map(cat => cat.name)
      );
      filename = 'tv.m3u';
      contentType = 'audio/x-mpegurl';
    } else {
      content = generateTxtFile(
        channels,
        data.categories.map(cat => cat.name)
      );
      filename = 'tv.txt';
      contentType = 'text/plain';
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': `${contentType}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('导出失败:', error);
    return NextResponse.json({
      success: false,
      error: '导出失败',
    }, { status: 500 });
  }
}
