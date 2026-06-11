// ========================================
// TV 端点共享工具函数
// ========================================

import { getChannelData, updateAccessKey } from './data';
import type { ChannelData } from '@/types';
import type { NextRequest } from 'next/server';

// 简单的内存速率限制器
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// 内存保护配置
const RATE_LIMIT_MAX_ENTRIES = 10000; // 最多存储 10000 个条目
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 每 5 分钟清理一次

/**
 * 清理过期的速率限制条目
 */
function cleanupExpiredRateLimitEntries(): void {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`[tv-endpoint] Cleaned up ${cleanedCount} expired rate limit entries`);
  }
}

// 启动定期清理任务
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startRateLimitCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(cleanupExpiredRateLimitEntries, RATE_LIMIT_CLEANUP_INTERVAL);
  // 不阻止进程退出
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

// 自动启动清理任务
startRateLimitCleanup();

/**
 * 验证访问密钥（混合模式：数据库优先，环境变量兜底）
 * @returns { isValid: boolean, keyId?: string } - 验证结果和密钥ID（如果是数据库密钥）
 */
export async function verifyAccessKey(key: string | null): Promise<{ isValid: boolean; keyId?: string; data?: ChannelData }> {
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
 * 使用目标更新函数，而不是全表重写
 */
export function updateKeyLastUsed(keyId: string): void {
  try {
    const now = new Date().toISOString();
    updateAccessKey(keyId, { lastUsedAt: now });
  } catch (error) {
    // 静默失败，不影响主流程
    console.error('更新密钥使用时间失败:', error);
  }
}

/**
 * 检查速率限制
 */
export function checkRateLimit(ip: string): boolean {
  const limit = parseInt(process.env.TV_TXT_RATE_LIMIT || '60', 10);
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;

  // 内存保护：如果条目过多，先清理
  if (rateLimitMap.size >= RATE_LIMIT_MAX_ENTRIES) {
    cleanupExpiredRateLimitEntries();
    // 如果清理后仍然过多，删除最旧的条目
    if (rateLimitMap.size >= RATE_LIMIT_MAX_ENTRIES) {
      const oldestKey = rateLimitMap.keys().next().value;
      if (oldestKey) {
        rateLimitMap.delete(oldestKey);
      }
    }
  }

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
export function getClientIP(request: NextRequest): string {
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
