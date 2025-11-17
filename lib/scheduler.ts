// ========================================
// 定时任务调度模块
// ========================================

import cron, { ScheduledTask } from 'node-cron';
import { ScheduleConfig, Channel } from '../types';
import { getDatabase } from './database';
import { testAllChannels, formatTestReport } from './channel-checker';
import { sendAllWebhooks } from './webhook';

// 定时任务实例
let scheduledTask: ScheduledTask | null = null;

// 获取定时任务配置
export function getScheduleConfig(): ScheduleConfig | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM schedule_config WHERE id = ?');
  const row = stmt.get('default') as any;

  if (!row) return null;

  return {
    id: row.id,
    enabled: Boolean(row.enabled),
    scheduleTime: row.scheduleTime,
    timezone: row.timezone,
    lastRunAt: row.lastRunAt,
    nextRunAt: row.nextRunAt,
  };
}

// 更新定时任务配置
export function updateScheduleConfig(
  config: Partial<Omit<ScheduleConfig, 'id'>>
): ScheduleConfig | null {
  const db = getDatabase();

  const updates: string[] = [];
  const values: any[] = [];

  if (config.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(config.enabled ? 1 : 0);
  }
  if (config.scheduleTime !== undefined) {
    updates.push('scheduleTime = ?');
    values.push(config.scheduleTime);
  }
  if (config.timezone !== undefined) {
    updates.push('timezone = ?');
    values.push(config.timezone);
  }
  if (config.lastRunAt !== undefined) {
    updates.push('lastRunAt = ?');
    values.push(config.lastRunAt);
  }
  if (config.nextRunAt !== undefined) {
    updates.push('nextRunAt = ?');
    values.push(config.nextRunAt);
  }

  if (updates.length === 0) return getScheduleConfig();

  values.push('default');
  const stmt = db.prepare(`UPDATE schedule_config SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getScheduleConfig();
}

// 计算下次运行时间
function calculateNextRunTime(scheduleTime: string, timezone: string): string {
  const [hour, minute] = scheduleTime.split(':').map(Number);

  // 获取当前时区时间
  const now = new Date();
  const nowInTimezone = new Date(
    now.toLocaleString('en-US', { timeZone: timezone })
  );

  // 设置今天的目标时间
  const target = new Date(nowInTimezone);
  target.setHours(hour, minute, 0, 0);

  // 如果今天的时间已过，设置为明天
  if (target <= nowInTimezone) {
    target.setDate(target.getDate() + 1);
  }

  return target.toISOString();
}

// 将时间转换为 cron 表达式
function timeToCron(scheduleTime: string): string {
  const [hour, minute] = scheduleTime.split(':');
  // 格式：分 时 * * *（每天）
  return `${minute} ${hour} * * *`;
}

// 执行定时测试任务
async function runScheduledTest(): Promise<void> {
  console.log('[Scheduler] Starting scheduled channel test...');

  const db = getDatabase();

  // 更新最后运行时间
  const lastRunAt = new Date().toISOString();
  const config = getScheduleConfig();
  if (config) {
    const nextRunAt = calculateNextRunTime(config.scheduleTime, config.timezone);
    updateScheduleConfig({ lastRunAt, nextRunAt });
  }

  try {
    // 获取所有频道
    const stmt = db.prepare('SELECT * FROM channels ORDER BY "order" ASC');
    const channels = stmt.all() as Channel[];

    console.log(`[Scheduler] Testing ${channels.length} channels...`);

    // 执行测试
    const progress = await testAllChannels(channels);

    // 生成报告
    const report = formatTestReport(progress);
    console.log('[Scheduler] Test completed:', report);

    // 发送 Webhook 通知
    const webhookResults = await sendAllWebhooks(report);
    console.log(`[Scheduler] Sent ${webhookResults.length} webhook notifications`);

    // 记录成功发送的 Webhook
    const successCount = webhookResults.filter((r) => r.success).length;
    console.log(`[Scheduler] Webhooks sent: ${successCount}/${webhookResults.length} successful`);
  } catch (error) {
    console.error('[Scheduler] Error during scheduled test:', error);

    // 发送错误通知
    const errorMessage = `⚠️ 定时测试任务失败\n\n时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n错误: ${error instanceof Error ? error.message : '未知错误'}`;
    await sendAllWebhooks(errorMessage);
  }
}

// 启动定时任务
export function startScheduler(): boolean {
  const config = getScheduleConfig();

  if (!config || !config.enabled) {
    console.log('[Scheduler] Scheduler is disabled');
    return false;
  }

  // 如果已有任务在运行，先停止
  if (scheduledTask) {
    stopScheduler();
  }

  try {
    // 转换为 cron 表达式
    const cronExpression = timeToCron(config.scheduleTime);
    console.log(`[Scheduler] Starting scheduler with cron: ${cronExpression} (${config.timezone})`);

    // 创建定时任务（使用指定时区）
    scheduledTask = cron.schedule(
      cronExpression,
      () => {
        runScheduledTest().catch((error) => {
          console.error('[Scheduler] Unexpected error:', error);
        });
      },
      {
        timezone: config.timezone,
      } as any
    );

    // 计算并保存下次运行时间
    const nextRunAt = calculateNextRunTime(config.scheduleTime, config.timezone);
    updateScheduleConfig({ nextRunAt });

    console.log(`[Scheduler] Scheduler started. Next run at: ${nextRunAt}`);
    return true;
  } catch (error) {
    console.error('[Scheduler] Failed to start scheduler:', error);
    return false;
  }
}

// 停止定时任务
export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Scheduler] Scheduler stopped');
  }
}

// 重启定时任务
export function restartScheduler(): boolean {
  stopScheduler();
  return startScheduler();
}

// 检查定时任务状态
export function isSchedulerRunning(): boolean {
  return scheduledTask !== null;
}

// 手动触发一次测试（不影响定时任务）
export async function triggerManualTest(): Promise<void> {
  console.log('[Scheduler] Manual test triggered');
  await runScheduledTest();
}

// 初始化调度器（应用启动时调用）
export function initializeScheduler(): void {
  const config = getScheduleConfig();

  if (config && config.enabled) {
    console.log('[Scheduler] Initializing scheduler on startup...');
    startScheduler();
  } else {
    console.log('[Scheduler] Scheduler is disabled, skipping initialization');
  }
}
