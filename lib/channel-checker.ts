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
  CONCURRENCY_LIMIT: 20,   // 并发测试数量
};

// 全局测试状态（用于跟踪当前测试进度）
let currentTestProgress: TestProgress | null = null;
let testAbortController: AbortController | null = null;
let isTestRunning = false; // 测试锁，防止并发测试

// 获取当前测试进度
export function getTestProgress(): TestProgress | null {
  return currentTestProgress;
}

// 检查是否有测试正在运行
export function isTestInProgress(): boolean {
  return isTestRunning;
}

// 取消当前测试
export function cancelTest(): boolean {
  if (testAbortController && currentTestProgress?.status === 'running') {
    testAbortController.abort();
    currentTestProgress.status = 'cancelled';
    currentTestProgress.finishedAt = new Date().toISOString();
    isTestRunning = false;
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

// 批量测试所有频道（并发执行）
export async function testAllChannels(
  channels: Channel[],
  onProgress?: (progress: TestProgress) => void
): Promise<TestProgress> {
  // 检查是否有测试正在运行
  if (isTestRunning) {
    throw new Error('已有测试任务正在运行');
  }

  // 设置测试锁
  isTestRunning = true;

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

  try {
    // 使用并发限制的批量测试
    const results: ChannelTestResult[] = [];
    const concurrencyLimit = CONFIG.CONCURRENCY_LIMIT;

    // 将频道分成批次
    for (let i = 0; i < channels.length; i += concurrencyLimit) {
      // 检查是否被取消
      if (testAbortController.signal.aborted) {
        break;
      }

      const batch = channels.slice(i, i + concurrencyLimit);

      // 更新当前测试的频道名称（显示批次信息）
      currentTestProgress.current = `测试中 (${i + 1}-${Math.min(i + batch.length, channels.length)}/${channels.length})`;

      // 通知进度
      if (onProgress) {
        onProgress({ ...currentTestProgress });
      }

      // 并发测试这一批频道
      const batchPromises = batch.map(async (channel) => {
        // 检查是否被取消
        if (testAbortController?.signal.aborted) {
          return {
            channelId: channel.id,
            channelName: channel.name,
            status: 'offline' as const,
            errorMessage: '测试已取消',
            testedAt: new Date().toISOString(),
          };
        }

        return testChannel(channel);
      });

      // 等待这批测试完成
      const batchResults = await Promise.allSettled(batchPromises);

      // 处理结果
      for (let j = 0; j < batchResults.length; j++) {
        const settledResult = batchResults[j];
        let result: ChannelTestResult;

        if (settledResult.status === 'fulfilled') {
          result = settledResult.value;
        } else {
          // Promise 被拒绝的情况
          result = {
            channelId: batch[j].id,
            channelName: batch[j].name,
            status: 'offline',
            errorMessage: settledResult.reason?.message || '测试失败',
            testedAt: new Date().toISOString(),
          };
        }

        results.push(result);
        currentTestProgress.results.push(result);
        currentTestProgress.completed = results.length;

        // 更新数据库
        updateStmt.run(
          result.status,
          result.responseTime || null,
          result.testedAt,
          result.errorMessage || null,
          result.channelId
        );
      }

      // 通知进度
      if (onProgress) {
        onProgress({ ...currentTestProgress });
      }
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

    return finalProgress;
  } finally {
    // 清理
    testAbortController = null;
    isTestRunning = false;
  }
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
