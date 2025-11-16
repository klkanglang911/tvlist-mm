import { NextRequest, NextResponse } from 'next/server';
import { getChannelData } from '@/lib/data';
import { generateTxtFile } from '@/lib/parser';

// 简单的内存速率限制器
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * 验证访问密钥
 */
function verifyAccessKey(key: string | null): boolean {
  if (!key) return false;

  const mainKey = (process.env.TV_TXT_ACCESS_KEY || '').trim();
  const secondaryKeys = (process.env.TV_TXT_SECONDARY_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  return key === mainKey || secondaryKeys.includes(key);
}

/**
 * 检查速率限制
 */
function checkRateLimit(ip: string): boolean {
  const limit = parseInt(process.env.TV_TXT_RATE_LIMIT || '60', 10);
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;

  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    // 创建新记录或重置
    rateLimitMap.set(ip, {
      count: 1,
      resetAt: now + hourInMs,
    });
    return true;
  }

  if (record.count >= limit) {
    return false; // 超出限制
  }

  record.count++;
  return true;
}

/**
 * 获取客户端 IP
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

/**
 * GET - 受保护的 TV 列表（需要访问密钥）
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 验证访问密钥
    const { searchParams } = new URL(request.url);
    const accessKey = searchParams.get('key');

    if (!verifyAccessKey(accessKey)) {
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

    // 3. 生成频道列表
    const data = await getChannelData();

    const content = generateTxtFile(
      data.channels,
      data.categories.map(cat => cat.name)
    );

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
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
