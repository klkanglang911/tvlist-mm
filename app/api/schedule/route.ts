import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../lib/auth';
import {
  getScheduleConfig,
  updateScheduleConfig,
  restartScheduler,
  isSchedulerRunning,
} from '../../../lib/scheduler';

/**
 * 验证请求认证
 */
function checkAuth(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  return token ? verifyToken(token) : false;
}

// GET - 获取定时任务配置
export async function GET(request: NextRequest) {
  try {
    // 验证登录状态
    if (!checkAuth(request)) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    const config = getScheduleConfig();

    if (!config) {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...config,
        isRunning: isSchedulerRunning(),
      },
    });
  } catch (error) {
    console.error('[Schedule API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

// PUT - 更新定时任务配置
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
    const { enabled, scheduleTime, timezone } = body;

    // 验证必填字段
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled 必须是布尔值' },
        { status: 400 }
      );
    }

    // 验证���间格式
    if (scheduleTime && !/^\d{2}:\d{2}$/.test(scheduleTime)) {
      return NextResponse.json(
        { success: false, error: '时间格式必须为 HH:mm，如 13:00' },
        { status: 400 }
      );
    }

    // 更新配置
    const updatedConfig = updateScheduleConfig({
      enabled,
      scheduleTime,
      timezone,
    });

    if (!updatedConfig) {
      return NextResponse.json(
        { success: false, error: '更新失败' },
        { status: 500 }
      );
    }

    // 重启调度器以应用新配置
    const restarted = restartScheduler();

    return NextResponse.json({
      success: true,
      message: restarted ? '配置已更新，调度器已重启' : '配置已更新',
      data: {
        ...updatedConfig,
        isRunning: isSchedulerRunning(),
      },
    });
  } catch (error) {
    console.error('[Schedule API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
