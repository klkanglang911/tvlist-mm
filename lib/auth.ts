import crypto from 'crypto';

/**
 * 密码验证 - 从环境变量读取
 */
export function verifyPassword(password: string): boolean {
  const correctPassword = process.env.ADMIN_PASSWORD;
  if (!correctPassword) {
    console.error('[Auth] ADMIN_PASSWORD 环境变量未设置');
    return false;
  }
  // 使用时序安全比较，防止计时攻击
  try {
    return crypto.timingSafeEqual(
      Buffer.from(password),
      Buffer.from(correctPassword)
    );
  } catch {
    // 长度不同时 timingSafeEqual 会抛出异常
    return false;
  }
}

/**
 * 生成加密安全的 session token
 */
export function generateToken(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return `${timestamp}.${randomPart}`;
}

/**
 * 验证 session token
 */
export function verifyToken(token: string): boolean {
  try {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const [timestampPart] = token.split('.');
    if (!timestampPart) {
      return false;
    }

    const tokenTime = parseInt(timestampPart, 36);
    if (isNaN(tokenTime)) {
      return false;
    }

    const now = Date.now();
    // Token 有效期 24 小时
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    return now - tokenTime < TWENTY_FOUR_HOURS;
  } catch {
    return false;
  }
}

// ========================================
// 登录速率限制
// ========================================

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

// 内存存储速率限制状态（生产环境建议使用 Redis）
const rateLimitMap = new Map<string, RateLimitEntry>();

// 内存保护配置
const RATE_LIMIT_MAX_ENTRIES = 10000; // 最多存储 10000 个条目
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 每 5 分钟清理一次

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 分钟窗口
const MAX_ATTEMPTS = 5; // 最多 5 次尝试
const BLOCK_DURATION = 30 * 60 * 1000; // 封锁 30 分钟

/**
 * 清理过期的速率限制条目
 */
function cleanupExpiredRateLimitEntries(): void {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, entry] of rateLimitMap.entries()) {
    // 清理已解封的条目
    if (entry.blockedUntil && now >= entry.blockedUntil) {
      rateLimitMap.delete(key);
      cleanedCount++;
      continue;
    }
    // 清理窗口已过期的条目
    if (!entry.blockedUntil && now - entry.firstAttempt >= RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`[Auth] Cleaned up ${cleanedCount} expired rate limit entries`);
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
 * 检查是否被速率限制
 */
export function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  // 清理过期条目
  if (entry) {
    // 如果被封锁且封锁已过期
    if (entry.blockedUntil && now >= entry.blockedUntil) {
      rateLimitMap.delete(identifier);
      return { allowed: true };
    }

    // 如果仍在封锁期
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }

    // 如果窗口已过期，重置
    if (now - entry.firstAttempt >= RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(identifier);
      return { allowed: true };
    }

    // 检查尝试次数
    if (entry.attempts >= MAX_ATTEMPTS) {
      entry.blockedUntil = now + BLOCK_DURATION;
      return {
        allowed: false,
        retryAfter: Math.ceil(BLOCK_DURATION / 1000),
      };
    }
  }

  return { allowed: true };
}

/**
 * 记录一次登录尝试
 */
export function recordLoginAttempt(identifier: string): void {
  const now = Date.now();

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

  const entry = rateLimitMap.get(identifier);

  if (entry) {
    entry.attempts += 1;
  } else {
    rateLimitMap.set(identifier, {
      attempts: 1,
      firstAttempt: now,
      blockedUntil: null,
    });
  }
}

/**
 * 登录成功后清除速率限制
 */
export function clearRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}

// ========================================
// 统一认证检查
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

/**
 * 从请求中检查认证状态
 */
export function checkAuth(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  return token ? verifyToken(token) : false;
}

/**
 * 认证失败的统一响应
 */
export function unauthorizedResponse(): NextResponse<ApiResponse> {
  return NextResponse.json<ApiResponse>({
    success: false,
    error: '未授权',
  }, { status: 401 });
}
