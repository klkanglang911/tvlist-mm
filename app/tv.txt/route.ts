import { NextRequest, NextResponse } from 'next/server';
import { getChannelData } from '@/lib/data';
import { generateTxtFile } from '@/lib/parser';
import { verifyAccessKey, checkRateLimit, getClientIP, updateKeyLastUsed } from '@/lib/tv-endpoint-utils';

/**
 * GET - 受保护的 TV 列表（需要访问密钥）
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 验证访问密钥（混合模式：数据库优先，环境变量兜底）
    const { searchParams } = new URL(request.url);
    const accessKey = searchParams.get('key');

    const verifyResult = await verifyAccessKey(accessKey);

    if (!verifyResult.isValid) {
      return new NextResponse('# 访问被拒绝：无效的访问密钥\n# Access denied: Invalid access key', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // 2. 检查速率限制
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      return new NextResponse('# 访问过于频繁，请稍后再试\n# Too many requests, please try again later', {
        status: 429,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Retry-After': '3600', // 1 小时后重试
        },
      });
    }

    // 3. 如果使用的是数据库密钥，更新最后使用时间（异步，不阻塞）
    if (verifyResult.keyId) {
      // 使用目标更新函数，而不是全表重写
      updateKeyLastUsed(verifyResult.keyId);
    }

    // 4. 生成频道列表
    const data = verifyResult.data || await getChannelData();

    const content = generateTxtFile(
      data.channels,
      data.categories.map(cat => cat.name)
    );

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // 添加短期缓存，减少数据库访问
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('生成 TV 列表失败:', error);
    return new NextResponse('# 生成列表失败\n# Failed to generate playlist', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}
