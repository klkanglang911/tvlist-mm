import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, unauthorizedResponse } from '@/lib/auth';
import { addCategory, updateCategory, deleteCategory, getChannelData, getDatabase } from '@/lib/data';
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
  if (!checkAuth(request)) {
    return unauthorizedResponse();
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

    // 检查是否已存在
    const data = await getChannelData();
    if (data.categories.some(cat => cat.name === name)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '分类已存在',
      }, { status: 400 });
    }

    // 使用目标添加函数
    const newCategory = addCategory({
      id: uuidv4(),
      name,
      order: data.categories.length,
    });

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
  if (!checkAuth(request)) {
    return unauthorizedResponse();
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

    // 获取旧分类名称
    const data = await getChannelData();
    const oldCategory = data.categories.find(cat => cat.id === id);

    if (!oldCategory) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '分类不存在',
      }, { status: 404 });
    }

    const oldName = oldCategory.name;

    // 使用目标更新函数
    const success = updateCategory(id, { name });

    if (!success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '更新失败',
      }, { status: 500 });
    }

    // 如果分类名称改变了，更新所有使用该分类的频道
    if (oldName !== name) {
      const db = getDatabase();
      const now = new Date().toISOString();
      db.prepare('UPDATE channels SET category = ?, updatedAt = ? WHERE category = ?').run(name, now, oldName);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id, name },
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
  if (!checkAuth(request)) {
    return unauthorizedResponse();
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

    // 获取分类名称
    const data = await getChannelData();
    const category = data.categories.find(cat => cat.id === id);

    if (!category) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '分类不存在',
      }, { status: 404 });
    }

    // 将该分类的频道移到"其他"
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare('UPDATE channels SET category = ?, updatedAt = ? WHERE category = ?').run('其他', now, category.name);

    // 使用目标删除函数
    const success = deleteCategory(id);

    if (!success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '删除失败',
      }, { status: 500 });
    }

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
