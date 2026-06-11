import { NextRequest, NextResponse } from 'next/server';
import { getChannelData } from '@/lib/data';
import { generateM3uFile } from '@/lib/parser';
import { verifyAccessKey, checkRateLimit, getClientIP, updateKeyLastUsed } from '@/lib/tv-endpoint-utils';

/**
 * GET - 受保护的 M3U 播放列表（需要访问密钥）
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 验证访问密钥（复用 tv.txt 的逻辑）
    const { searchParams } = new URL(request.url);
    const accessKey = searchParams.get('key');

    const verifyResult = await verifyAccessKey(accessKey);

    if (!verifyResult.isValid) {
      return new NextResponse('# 访问被拒绝：无效的访问密钥\n# Access denied: Invalid access key', {
        status: 403,
        headers: {
          'Content-Type': 'application/x-mpegurl; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // 2. 检查速率限制（复用 tv.txt 的逻辑）
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      return new NextResponse('# 访问过于频繁，请稍后再试\n# Too many requests, please try again later', {
        status: 429,
        headers: {
          'Content-Type': 'application/x-mpegurl; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Retry-After': '3600',
        },
      });
    }

    // 3. 如果使用的是数据库密钥，更新最后使用时间（复用 tv.txt 的逻辑）
    if (verifyResult.keyId) {
      updateKeyLastUsed(verifyResult.keyId);
    }

    // 4. 生成 M3U 播放列表
    const data = verifyResult.data || await getChannelData();

    const content = generateM3uFile(
      data.channels,
      data.categories.map(cat => cat.name)
    );

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/x-mpegurl; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('生成 M3U 列表失败:', error);
    return new NextResponse('# 生成列表失败\n# Failed to generate playlist', {
      status: 500,
      headers: {
        'Content-Type': 'application/x-mpegurl; charset=utf-8',
      },
    });
  }
}
