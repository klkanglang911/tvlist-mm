import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getChannelData, saveChannelData } from '@/lib/data';
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

    const data = await getChannelData();
    data.categories = categories;
    data.lastUpdated = new Date().toISOString();

    await saveChannelData(data);

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
