import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, unauthorizedResponse } from '@/lib/auth';
import { addChannel, updateChannel, deleteChannel, getChannel, getChannelData } from '@/lib/data';
import type { ApiResponse, Channel } from '@/types';
import { v4 as uuidv4 } from 'uuid';

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
    return unauthorizedResponse();
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

    // 获取当前最大 order 值
    const data = await getChannelData();
    const maxOrder = data.channels.length > 0
      ? Math.max(...data.channels.map(ch => ch.order))
      : 0;

    const newChannel = addChannel({
      id: uuidv4(),
      name,
      url,
      category: category || '其他',
      order: maxOrder + 1,
    });

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
    return unauthorizedResponse();
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

    // 检查频道是否存在
    const existingChannel = getChannel(id);
    if (!existingChannel) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '频道不存在',
      }, { status: 404 });
    }

    // 使用目标更新函数
    const updates: Partial<Omit<Channel, 'id' | 'createdAt'>> = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (category !== undefined) updates.category = category;
    if (order !== undefined) updates.order = order;

    const success = updateChannel(id, updates);

    if (!success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '更新失败',
      }, { status: 500 });
    }

    // 返回更新后的频道
    const updatedChannel = getChannel(id);

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
    return unauthorizedResponse();
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

    // 检查频道是否存在
    const existingChannel = getChannel(id);
    if (!existingChannel) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '频道不存在',
      }, { status: 404 });
    }

    // 使用目标删除函数
    const success = deleteChannel(id);

    if (!success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '删除失败',
      }, { status: 500 });
    }

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
