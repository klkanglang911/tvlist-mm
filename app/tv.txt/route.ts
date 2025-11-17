import { NextRequest, NextResponse } from 'next/server';
import { getChannelData, saveChannelData } from '@/lib/data';
import { generateTxtFile } from '@/lib/parser';
import type { ChannelData } from '@/types';

// 简单的内存速率限制器
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * 验证访问密钥（混合模式：数据库优先，环境变量兜底）
 * @returns { isValid: boolean, keyId?: string } - 验证结果和密钥ID（如果是数据库密钥）
 */
async function verifyAccessKey(key: string | null): Promise<{ isValid: boolean; keyId?: string; data?: ChannelData }> {
  if (!key) {
    return { isValid: false };
  }

  // 1. 首先检查数据库中的密钥（优先级最高）
  try {
    const data = await getChannelData();
    const accessKeys = data.accessKeys || [];

    const foundKey = accessKeys.find(k => k.key === key);
    if (foundKey) {
      return { isValid: true, keyId: foundKey.id, data };
    }

    // 2. 如果数据库中没有密钥，回退到环境变量（兜底）
    if (accessKeys.length === 0) {
      const mainKey = (process.env.TV_TXT_ACCESS_KEY || '').trim();
      const secondaryKeys = (process.env.TV_TXT_SECONDARY_KEYS || '')
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const isEnvKeyValid = key === mainKey || secondaryKeys.includes(key);
      return { isValid: isEnvKeyValid, data };
    }

    // 3. 数据库中有密钥但不匹配，返回无效
    return { isValid: false };
  } catch (error) {
    console.error('验证访问密钥失败:', error);
    // 发生错误时回退到环境变量
    const mainKey = (process.env.TV_TXT_ACCESS_KEY || '').trim();
    const secondaryKeys = (process.env.TV_TXT_SECONDARY_KEYS || '')
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const isEnvKeyValid = key === mainKey || secondaryKeys.includes(key);
    return { isValid: isEnvKeyValid };
  }
}

/**
 * 更新密钥的最后使用时间（异步，不阻塞主流程）
 */
async function updateKeyLastUsed(data: ChannelData, keyId: string): Promise<void> {
  try {
    const accessKeys = data.accessKeys || [];
    const key = accessKeys.find(k => k.id === keyId);

    if (key) {
      key.lastUsedAt = new Date().toISOString();
      data.accessKeys = accessKeys;
      // 不更新 lastUpdated，因为这不是用户主动的数据修改
      await saveChannelData(data);
    }
  } catch (error) {
    // 静默失败，不影响主流程
    console.error('更新密钥使用时间失败:', error);
  }
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
    if (verifyResult.keyId && verifyResult.data) {
      // 使用 Promise 但不等待，避免阻塞响应
      updateKeyLastUsed(verifyResult.data, verifyResult.keyId).catch(err => {
        console.error('后台更新密钥使用时间失败:', err);
      });
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
