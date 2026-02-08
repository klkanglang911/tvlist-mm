// ========================================
// Webhook 通知模块
// ========================================

import { WebhookConfig } from '../types';
import { getDatabase } from './database';

// Webhook 超时时间（毫秒）
const WEBHOOK_TIMEOUT = 10000; // 10 秒

// Webhook 发送结果
interface WebhookResult {
  webhookId: string;
  success: boolean;
  error?: string;
}

/**
 * 带超时的 fetch 请求
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = WEBHOOK_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 获取所有 Webhook 配置
export function getAllWebhooks(): WebhookConfig[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM webhook_config ORDER BY createdAt DESC');
  const rows = stmt.all() as any[];

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    url: row.url,
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
  }));
}

// 添加 Webhook 配置
export function addWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt'>): WebhookConfig {
  const db = getDatabase();
  const id = generateId();
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO webhook_config (id, type, url, enabled, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(id, config.type, config.url, config.enabled ? 1 : 0, createdAt);

  return {
    id,
    type: config.type,
    url: config.url,
    enabled: config.enabled,
    createdAt,
  };
}

// 更新 Webhook 配置
export function updateWebhook(
  id: string,
  config: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>
): boolean {
  const db = getDatabase();

  const updates: string[] = [];
  const values: any[] = [];

  if (config.type !== undefined) {
    updates.push('type = ?');
    values.push(config.type);
  }
  if (config.url !== undefined) {
    updates.push('url = ?');
    values.push(config.url);
  }
  if (config.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(config.enabled ? 1 : 0);
  }

  if (updates.length === 0) return false;

  values.push(id);
  const stmt = db.prepare(`UPDATE webhook_config SET ${updates.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  return result.changes > 0;
}

// 删除 Webhook 配置
export function deleteWebhook(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM webhook_config WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// 发送企业微信通知
async function sendWechatWebhook(url: string, message: string): Promise<void> {
  const payload = {
    msgtype: 'text',
    text: {
      content: message,
    },
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`企业微信发送失败: ${response.status}`);
  }

  const data = await response.json();
  if (data.errcode !== 0) {
    throw new Error(`企业微信错误: ${data.errmsg}`);
  }
}

// 发送钉钉通知
async function sendDingtalkWebhook(url: string, message: string): Promise<void> {
  const payload = {
    msgtype: 'text',
    text: {
      content: message,
    },
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`钉钉发送失败: ${response.status}`);
  }

  const data = await response.json();
  if (data.errcode !== 0) {
    throw new Error(`钉钉错误: ${data.errmsg}`);
  }
}

// 发送飞书通知
async function sendFeishuWebhook(url: string, message: string): Promise<void> {
  const payload = {
    msg_type: 'text',
    content: {
      text: message,
    },
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`飞书发送失败: ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`飞书错误: ${data.msg}`);
  }
}

// 发送自定义 Webhook 通知
async function sendCustomWebhook(url: string, message: string): Promise<void> {
  const payload = {
    message: message,
    timestamp: new Date().toISOString(),
    type: 'channel_test_report',
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`自定义 Webhook 发送失败: ${response.status}`);
  }
}

// 发送单个 Webhook 通知
export async function sendWebhook(
  config: WebhookConfig,
  message: string
): Promise<WebhookResult> {
  try {
    switch (config.type) {
      case 'wechat':
        await sendWechatWebhook(config.url, message);
        break;
      case 'dingtalk':
        await sendDingtalkWebhook(config.url, message);
        break;
      case 'feishu':
        await sendFeishuWebhook(config.url, message);
        break;
      case 'custom':
        await sendCustomWebhook(config.url, message);
        break;
      default:
        throw new Error(`不支持的 Webhook 类型: ${config.type}`);
    }

    return {
      webhookId: config.id,
      success: true,
    };
  } catch (error) {
    return {
      webhookId: config.id,
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

// 发送所有启用的 Webhook 通知
export async function sendAllWebhooks(message: string): Promise<WebhookResult[]> {
  const webhooks = getAllWebhooks().filter((w) => w.enabled);

  if (webhooks.length === 0) {
    return [];
  }

  const results: WebhookResult[] = [];

  for (const webhook of webhooks) {
    const result = await sendWebhook(webhook, message);
    results.push(result);
    // 小延迟避免请求过快
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return results;
}

// 测试 Webhook 配置
export async function testWebhook(config: WebhookConfig): Promise<WebhookResult> {
  const testMessage = `🔧 Webhook 测试消息\n\n这是一条测试消息，用于验证 ${getWebhookTypeName(config.type)} Webhook 配置是否正确。\n\n发送时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;

  return sendWebhook(config, testMessage);
}

// 获取 Webhook 类型名称
export function getWebhookTypeName(type: WebhookConfig['type']): string {
  const names: Record<WebhookConfig['type'], string> = {
    wechat: '企业微信',
    dingtalk: '钉钉',
    feishu: '飞书',
    custom: '自定义',
  };
  return names[type] || type;
}

// 生成唯一 ID
function generateId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
