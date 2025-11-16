import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getChannelData, saveChannelData } from '@/lib/data';
import type { ApiResponse, Channel } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 验证请求认证
 */
function checkAuth(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  return token ? verifyToken(token) : false;
}

/**
 * GET - 获取所有频道
 */
export async function GET(request: NextRequest) {
  try {
    const data = await getChannelData();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: data.channels,
    });
  } catch (error) {
    console.error('获取频道失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取频道失败',
    }, { status: 500 });
  }
}

/**
 * POST - 添加新频道
 */
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, url, category } = body;

    if (!name || !url) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '频道名称和 URL 不能为空',
      }, { status: 400 });
    }

    const data = await getChannelData();

    const newChannel: Channel = {
      id: uuidv4(),
      name,
      url,
      category: category || '其他',
      order: data.channels.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.channels.push(newChannel);
    data.lastUpdated = new Date().toISOString();

    await saveChannelData(data, `添加频道: ${name}`);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: newChannel,
      message: '频道添加成功',
    });
  } catch (error) {
    console.error('添加频道失败:', error);
    const errorMessage = error instanceof Error ? error.message : '添加频道失败';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

/**
 * PUT - 更新频道
 */
export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, url, category, order } = body;

    if (!id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '频道 ID 不能为空',
      }, { status: 400 });
    }

    const data = await getChannelData();
    const channelIndex = data.channels.findIndex(ch => ch.id === id);

    if (channelIndex === -1) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '频道不存在',
      }, { status: 404 });
    }

    const updatedChannel = {
      ...data.channels[channelIndex],
      ...(name !== undefined && { name }),
      ...(url !== undefined && { url }),
      ...(category !== undefined && { category }),
      ...(order !== undefined && { order }),
      updatedAt: new Date().toISOString(),
    };

    data.channels[channelIndex] = updatedChannel;
    data.lastUpdated = new Date().toISOString();

    await saveChannelData(data, `更新频道: ${updatedChannel.name}`);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedChannel,
      message: '频道更新成功',
    });
  } catch (error) {
    console.error('更新频道失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '更新频道失败',
    }, { status: 500 });
  }
}

/**
 * DELETE - 删除频道
 */
export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '频道 ID 不能为空',
      }, { status: 400 });
    }

    const data = await getChannelData();
    const channelIndex = data.channels.findIndex(ch => ch.id === id);

    if (channelIndex === -1) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '频道不存在',
      }, { status: 404 });
    }

    const deletedChannel = data.channels[channelIndex];
    data.channels.splice(channelIndex, 1);
    data.lastUpdated = new Date().toISOString();

    await saveChannelData(data, `删除频道: ${deletedChannel.name}`);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '频道删除成功',
    });
  } catch (error) {
    console.error('删除频道失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '删除频道失败',
    }, { status: 500 });
  }
}
