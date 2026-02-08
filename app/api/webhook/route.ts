import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, unauthorizedResponse } from '@/lib/auth';
import {
  getAllWebhooks,
  addWebhook,
  updateWebhook,
  deleteWebhook,
} from '@/lib/webhook';

/**
 * 验证 Webhook URL 是否安全（防止 SSRF 攻击）
 */
function isValidWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // 只允许 HTTP 和 HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: '只支持 HTTP 和 HTTPS 协议' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 禁止本地地址
    const localPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '[::1]',
    ];
    if (localPatterns.includes(hostname)) {
      return { valid: false, error: '不允许使用本地地址' };
    }

    // 禁止内网地址
    const privatePatterns = [
      /^10\./,                           // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./,   // 172.16.0.0/12
      /^192\.168\./,                      // 192.168.0.0/16
      /^169\.254\./,                      // 链路本地
      /^fc00:/i,                          // IPv6 ULA
      /^fe80:/i,                          // IPv6 链路本地
    ];
    for (const pattern of privatePatterns) {
      if (pattern.test(hostname)) {
        return { valid: false, error: '不允许使用内网地址' };
      }
    }

    // 禁止元数据服务地址（云服务商）
    const metadataPatterns = [
      '169.254.169.254',  // AWS/GCP/Azure 元数据
      'metadata.google.internal',
      'metadata.goog',
    ];
    if (metadataPatterns.includes(hostname)) {
      return { valid: false, error: '不允许访问元数据服务' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'URL 格式无效' };
  }
}

// GET - 获取所有 Webhook 配置
export async function GET(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return unauthorizedResponse();
    }

    const webhooks = getAllWebhooks();

    return NextResponse.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    console.error('[Webhook API] Error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// POST - 添加 Webhook 配置
export async function POST(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { type, url, enabled } = body;

    // 验证必填字段
    if (!type || !url) {
      return NextResponse.json(
        { success: false, error: '缺少必要字段' },
        { status: 400 }
      );
    }

    // 验证 type
    const validTypes = ['wechat', 'dingtalk', 'feishu', 'custom'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `无效的 Webhook 类型，必须是: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // 验证 URL 格式和安全性
    const urlValidation = isValidWebhookUrl(url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { success: false, error: urlValidation.error },
        { status: 400 }
      );
    }

    // 添加 Webhook
    const webhook = addWebhook({
      type,
      url,
      enabled: enabled !== false, // 默认启用
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook 添加成功',
      data: webhook,
    });
  } catch (error) {
    console.error('[Webhook API] Error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// PUT - 更新 Webhook 配置
export async function PUT(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { id, type, url, enabled } = body;

    // 验证必填字段
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少 Webhook ID' },
        { status: 400 }
      );
    }

    // 验证 type（如果提供）
    if (type) {
      const validTypes = ['wechat', 'dingtalk', 'feishu', 'custom'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { success: false, error: `无效的 Webhook 类型，必须是: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // 验证 URL 格式和安全性（如果提供）
    if (url) {
      const urlValidation = isValidWebhookUrl(url);
      if (!urlValidation.valid) {
        return NextResponse.json(
          { success: false, error: urlValidation.error },
          { status: 400 }
        );
      }
    }

    // 更新 Webhook
    const updated = updateWebhook(id, { type, url, enabled });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Webhook 不存在或更新失败' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook 更新成功',
    });
  } catch (error) {
    console.error('[Webhook API] Error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// DELETE - 删除 Webhook 配置
export async function DELETE(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少 Webhook ID' },
        { status: 400 }
      );
    }

    const deleted = deleteWebhook(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Webhook 不存在或删除失败' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook 删除成功',
    });
  } catch (error) {
    console.error('[Webhook API] Error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
