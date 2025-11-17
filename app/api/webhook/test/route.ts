import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import { getAllWebhooks, testWebhook } from '../../../../lib/webhook';

/**
 * 验证请求认证
 */
function checkAuth(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  return token ? verifyToken(token) : false;
}

// POST - 测试 Webhook 配置
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
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少 Webhook ID' },
        { status: 400 }
      );
    }

    // 查找 Webhook 配置
    const webhooks = getAllWebhooks();
    const webhook = webhooks.find((w) => w.id === id);

    if (!webhook) {
      return NextResponse.json(
        { success: false, error: 'Webhook 不存在' },
        { status: 404 }
      );
    }

    // 测试 Webhook
    const result = await testWebhook(webhook);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '测试消息已发送',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || '发送失败',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Webhook Test API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
