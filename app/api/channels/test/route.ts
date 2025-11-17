import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import { getDatabase } from '../../../../lib/database';
import {
  testAllChannels,
  getTestProgress,
  cancelTest,
  formatTestReport,
} from '../../../../lib/channel-checker';
import { sendAllWebhooks } from '../../../../lib/webhook';
import { Channel } from '../../../../types';

/**
 * 验证请求认证
 */
function checkAuth(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  return token ? verifyToken(token) : false;
}

// POST - 开始测试所有频道
export async function POST(request: NextRequest) {
  try {
    // 验证登录状态
    if (!checkAuth(request)) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    // 检查是否有测试正在进行
    const currentProgress = getTestProgress();
    if (currentProgress && currentProgress.status === 'running') {
      return NextResponse.json(
        { success: false, error: '已有测试正在进行中' },
        { status: 400 }
      );
    }

    // 获取所有频道
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM channels ORDER BY "order" ASC');
    const channels = stmt.all() as Channel[];

    if (channels.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有频道可供测试' },
        { status: 400 }
      );
    }

    // 异步开始测试（不等待完成）
    testAllChannels(channels)
      .then((progress) => {
        // 测试完成后发送 Webhook 通知
        const report = formatTestReport(progress);
        sendAllWebhooks(report).catch((err) => {
          console.error('[Test API] Failed to send webhooks:', err);
        });
      })
      .catch((err) => {
        console.error('[Test API] Test failed:', err);
      });

    return NextResponse.json({
      success: true,
      message: '测试已开始',
      total: channels.length,
    });
  } catch (error) {
    console.error('[Test API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

// GET - 获取测试进度
export async function GET(request: NextRequest) {
  try {
    // 验证登录状态
    if (!checkAuth(request)) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    const progress = getTestProgress();

    if (!progress) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'idle',
          total: 0,
          completed: 0,
          results: [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('[Test API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

// DELETE - 取消当前测试
export async function DELETE(request: NextRequest) {
  try {
    // 验证登录状态
    if (!checkAuth(request)) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    const cancelled = cancelTest();

    if (cancelled) {
      return NextResponse.json({
        success: true,
        message: '测试已取消',
      });
    } else {
      return NextResponse.json(
        { success: false, error: '没有正在进行的测试' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Test API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
