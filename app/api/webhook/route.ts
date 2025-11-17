import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../lib/auth';
import {
  getAllWebhooks,
  addWebhook,
  updateWebhook,
  deleteWebhook,
} from '../../../lib/webhook';

/**
 * 验证请求认证
 */
function checkAuth(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  return token ? verifyToken(token) : false;
}

// GET - 获取所有 Webhook 配置
export async function GET(request: NextRequest) {
  try {
    // 验证登录状态
    if (!checkAuth(request)) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    const webhooks = getAllWebhooks();

    return NextResponse.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    console.error('[Webhook API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

// POST - 添加 Webhook 配置
export async function POST(request: NextRequest) {
  try {
    // 验证登录状态
    if (!checkAuth(request)) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
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

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'URL 格式无效' },
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
      { success: false, error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

// PUT - 更新 Webhook 配置
export async function PUT(request: NextRequest) {
  try {
    // 验证登录状态
    if (!checkAuth(request)) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
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

    // 验证 URL 格式（如��提供）
    if (url) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { success: false, error: 'URL 格式无效' },
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
      { success: false, error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

// DELETE - 删除 Webhook 配置
export async function DELETE(request: NextRequest) {
  try {
    // 验证登录状态
    if (!checkAuth(request)) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
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
      { success: false, error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
