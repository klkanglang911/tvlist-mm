import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getChannelData, saveChannelData } from '@/lib/data';
import type { ApiResponse } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET - 获取所有分类
 */
export async function GET(request: NextRequest) {
  try {
    const data = await getChannelData();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: data.categories,
    });
  } catch (error) {
    console.error('获取分类失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取分类失败',
    }, { status: 500 });
  }
}

/**
 * POST - 添加新分类
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '分类名称不能为空',
      }, { status: 400 });
    }

    const data = await getChannelData();

    // 检查是否已存在
    if (data.categories.some(cat => cat.name === name)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '分类已存在',
      }, { status: 400 });
    }

    const newCategory = {
      id: uuidv4(),
      name,
      order: data.categories.length,
    };

    data.categories.push(newCategory);
    data.lastUpdated = new Date().toISOString();

    await saveChannelData(data, `添加分类: ${name}`);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: newCategory,
      message: '分类添加成功',
    });
  } catch (error) {
    console.error('添加分类失败:', error);
    const errorMessage = error instanceof Error ? error.message : '添加分类失败';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

/**
 * PUT - 更新分类
 */
export async function PUT(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '分类 ID 和名称不能为空',
      }, { status: 400 });
    }

    const data = await getChannelData();
    const categoryIndex = data.categories.findIndex(cat => cat.id === id);

    if (categoryIndex === -1) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '分类不存在',
      }, { status: 404 });
    }

    const oldName = data.categories[categoryIndex].name;
    data.categories[categoryIndex].name = name;

    // 更新所有使用该分类的频道
    data.channels.forEach(channel => {
      if (channel.category === oldName) {
        channel.category = name;
        channel.updatedAt = new Date().toISOString();
      }
    });

    data.lastUpdated = new Date().toISOString();
    await saveChannelData(data, `更新分类: ${oldName} -> ${name}`);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: data.categories[categoryIndex],
      message: '分类更新成功',
    });
  } catch (error) {
    console.error('更新分类失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '更新分类失败',
    }, { status: 500 });
  }
}

/**
 * DELETE - 删除分类
 */
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token || !verifyToken(token)) {
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
        error: '分类 ID 不能为空',
      }, { status: 400 });
    }

    const data = await getChannelData();
    const categoryIndex = data.categories.findIndex(cat => cat.id === id);

    if (categoryIndex === -1) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '分类不存在',
      }, { status: 404 });
    }

    const deletedCategory = data.categories[categoryIndex];

    // 将该分类的频道移到"其他"
    data.channels.forEach(channel => {
      if (channel.category === deletedCategory.name) {
        channel.category = '其他';
        channel.updatedAt = new Date().toISOString();
      }
    });

    data.categories.splice(categoryIndex, 1);
    data.lastUpdated = new Date().toISOString();

    await saveChannelData(data, `删除分类: ${deletedCategory.name}`);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '分类删除成功',
    });
  } catch (error) {
    console.error('删除分类失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '删除分类失败',
    }, { status: 500 });
  }
}
