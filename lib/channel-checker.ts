// ========================================
// 频道状态检测模块
// ========================================

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { Channel, ChannelTestResult, TestProgress } from '../types';
import { getDatabase } from './database';

// 测试配置
const CONFIG = {
  CONNECT_TIMEOUT: 10000,  // 连接超时 10 秒
  READ_TIMEOUT: 15000,     // 读取超时 15 秒
  MAX_BYTES: 65536,        // 最大读取 64KB
  MAX_REDIRECTS: 5,        // 最大重定向次数
};

// 全局测试状态（用于跟踪当前测试进度）
let currentTestProgress: TestProgress | null = null;
let testAbortController: AbortController | null = null;

// 获取当前测试进度
export function getTestProgress(): TestProgress | null {
  return currentTestProgress;
}

// 取消当前测试
export function cancelTest(): boolean {
  if (testAbortController && currentTestProgress?.status === 'running') {
    testAbortController.abort();
    currentTestProgress.status = 'cancelled';
    currentTestProgress.finishedAt = new Date().toISOString();
    return true;
  }
  return false;
}

// 测试单个频道
export async function testChannel(channel: Channel): Promise<ChannelTestResult> {
  const startTime = Date.now();

  try {
    const result = await testUrl(channel.url);
    const responseTime = Date.now() - startTime;

    return {
      channelId: channel.id,
      channelName: channel.name,
      status: result.success ? 'online' : 'offline',
      responseTime: result.success ? responseTime : undefined,
      errorMessage: result.error,
      testedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      channelId: channel.id,
      channelName: channel.name,
      status: 'offline',
      errorMessage: error instanceof Error ? error.message : '未知错误',
      testedAt: new Date().toISOString(),
    };
  }
}

// 测试 URL 是否可访问
async function testUrl(
  url: string,
  redirectCount = 0
): Promise<{ success: boolean; error?: string }> {
  if (redirectCount > CONFIG.MAX_REDIRECTS) {
    return { success: false, error: '重定向次数过多' };
  }

  return new Promise((resolve) => {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      resolve({ success: false, error: 'URL 格式无效' });
      return;
    }

    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: CONFIG.CONNECT_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TVList-Checker/1.0)',
        'Accept': '*/*',
      },
    };

    const req = httpModule.request(options, (res) => {
      // 处理重定向
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        req.destroy();
        // 递归处理重定向
        const redirectUrl = new URL(res.headers.location, url).toString();
        testUrl(redirectUrl, redirectCount + 1).then(resolve);
        return;
      }

      // 检查状态码
      if (!res.statusCode || res.statusCode >= 400) {
        req.destroy();
        resolve({ success: false, error: `HTTP 状态码: ${res.statusCode}` });
        return;
      }

      // 尝试读取数据
      let bytesRead = 0;
      const readTimeout = setTimeout(() => {
        req.destroy();
        // 如果已经读取到数据，认为成功
        if (bytesRead > 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: '读取数据超时' });
        }
      }, CONFIG.READ_TIMEOUT);

      res.on('data', (chunk) => {
        bytesRead += chunk.length;
        // 读取到足够数据后停止
        if (bytesRead >= CONFIG.MAX_BYTES) {
          clearTimeout(readTimeout);
          req.destroy();
          resolve({ success: true });
        }
      });

      res.on('end', () => {
        clearTimeout(readTimeout);
        // 如果读取到了数据，认为成功
        if (bytesRead > 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: '无数据返回' });
        }
      });

      res.on('error', (err) => {
        clearTimeout(readTimeout);
        resolve({ success: false, error: err.message });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: '连接超时' });
    });

    req.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
        resolve({ success: false, error: '连接被拒绝' });
      } else if ((err as NodeJS.ErrnoException).code === 'ENOTFOUND') {
        resolve({ success: false, error: '域名无法解析' });
      } else if ((err as NodeJS.ErrnoException).code === 'ECONNRESET') {
        resolve({ success: false, error: '连接被重置' });
      } else {
        resolve({ success: false, error: err.message });
      }
    });

    req.end();
  });
}

// 批量测试所有频道（顺序执行）
export async function testAllChannels(
  channels: Channel[],
  onProgress?: (progress: TestProgress) => void
): Promise<TestProgress> {
  // 初始化测试状态
  testAbortController = new AbortController();
  currentTestProgress = {
    total: channels.length,
    completed: 0,
    results: [],
    status: 'running',
    startedAt: new Date().toISOString(),
  };

  const db = getDatabase();
  const updateStmt = db.prepare(`
    UPDATE channels
    SET status = ?, responseTime = ?, lastCheckedAt = ?, errorMessage = ?
    WHERE id = ?
  `);

  // 顺序测试每个频道
  for (let i = 0; i < channels.length; i++) {
    // 检查是否被取消
    if (testAbortController.signal.aborted) {
      break;
    }

    const channel = channels[i];
    currentTestProgress.current = channel.name;

    // 通知进度
    if (onProgress) {
      onProgress({ ...currentTestProgress });
    }

    // 测试频道
    const result = await testChannel(channel);
    currentTestProgress.results.push(result);
    currentTestProgress.completed = i + 1;

    // 更新数据库
    updateStmt.run(
      result.status,
      result.responseTime || null,
      result.testedAt,
      result.errorMessage || null,
      result.channelId
    );

    // 通知��度
    if (onProgress) {
      onProgress({ ...currentTestProgress });
    }

    // 小延迟，避免请求过快
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 完成测试
  currentTestProgress.current = undefined;
  currentTestProgress.finishedAt = new Date().toISOString();

  if (!testAbortController.signal.aborted) {
    currentTestProgress.status = 'completed';
  }

  // 最终通知
  if (onProgress) {
    onProgress({ ...currentTestProgress });
  }

  const finalProgress = { ...currentTestProgress };

  // 清理
  testAbortController = null;

  return finalProgress;
}

// 获取测试摘要
export function getTestSummary(progress: TestProgress): {
  total: number;
  online: number;
  offline: number;
  avgResponseTime: number;
} {
  const online = progress.results.filter((r) => r.status === 'online').length;
  const offline = progress.results.filter((r) => r.status === 'offline').length;

  const responseTimes = progress.results
    .filter((r) => r.responseTime !== undefined)
    .map((r) => r.responseTime as number);

  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  return {
    total: progress.total,
    online,
    offline,
    avgResponseTime,
  };
}

// 格式化测试报告（用于 Webhook 通知）
export function formatTestReport(progress: TestProgress): string {
  const summary = getTestSummary(progress);
  const offlineChannels = progress.results.filter((r) => r.status === 'offline');

  let report = `📺 频道状态检测报告\n`;
  report += `━━━━━━━━━━━━━━━━━━\n`;
  report += `检测时间: ${new Date(progress.startedAt || '').toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`;
  report += `检测状态: ${progress.status === 'completed' ? '✅ 完成' : progress.status === 'cancelled' ? '❌ 已取消' : '🔄 进行中'}\n`;
  report += `━━━━━━━━━━━━━━━━━━\n`;
  report += `📊 统计摘要:\n`;
  report += `  • 总频道数: ${summary.total}\n`;
  report += `  • 在线: ${summary.online} ✅\n`;
  report += `  • 离线: ${summary.offline} ❌\n`;
  report += `  • 在线率: ${((summary.online / summary.total) * 100).toFixed(1)}%\n`;
  report += `  • 平均响应时间: ${summary.avgResponseTime}ms\n`;

  if (offlineChannels.length > 0) {
    report += `\n⚠️ 离线频道列表:\n`;
    offlineChannels.forEach((channel, index) => {
      report += `  ${index + 1}. ${channel.channelName}\n`;
      if (channel.errorMessage) {
        report += `     原因: ${channel.errorMessage}\n`;
      }
    });
  }

  return report;
}
