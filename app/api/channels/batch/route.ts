import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/data';
import type { ApiResponse } from '@/types';

/**
 * POST - 批量更新频道顺序
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
    const { channels } = body; // { id: string, order: number }[]

    if (!Array.isArray(channels)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '无效的数据格式',
      }, { status: 400 });
    }

    // 使用批量更新，而不是全表重写
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateStmt = db.prepare('UPDATE channels SET "order" = ?, updatedAt = ? WHERE id = ?');

    // 使用事务批量更新
    db.transaction(() => {
      for (const { id, order } of channels) {
        updateStmt.run(order, now, id);
      }

      // 更新 lastUpdated 元数据
      db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run(now, 'lastUpdated');
    })();

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '批量更新成功',
    });
  } catch (error) {
    console.error('批量更新失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '批量更新失败',
    }, { status: 500 });
  }
}
