import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/data';
import type { ApiResponse, Category } from '@/types';

/**
 * POST - 重新排序分类
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
    const { categories } = body as { categories: Category[] };

    if (!Array.isArray(categories)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '无效的数据格式',
      }, { status: 400 });
    }

    // 使用批量更新，而不是全表重写
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateStmt = db.prepare('UPDATE categories SET "order" = ? WHERE id = ?');

    // 使用事务批量更新
    db.transaction(() => {
      for (const category of categories) {
        updateStmt.run(category.order, category.id);
      }

      // 更新 lastUpdated 元数据
      db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run(now, 'lastUpdated');
    })();

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '排序成功',
    });
  } catch (error) {
    console.error('分类排序失败:', error);
    const errorMessage = error instanceof Error ? error.message : '分类排序失败';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
