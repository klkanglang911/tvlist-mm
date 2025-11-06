import { NextRequest, NextResponse } from 'next/server';
import { getFileHistory, getFileAtCommit, GITHUB_CONFIG } from '@/lib/github';
import type { ApiResponse, VersionHistory } from '@/types';

/**
 * GET - 获取版本历史
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');

    const commits = await getFileHistory(GITHUB_CONFIG.dataPath, perPage);

    const history: VersionHistory = {
      commits,
      total: commits.length,
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('获取版本历史失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取版本历史失败',
    }, { status: 500 });
  }
}
