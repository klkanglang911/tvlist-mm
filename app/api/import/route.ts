import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getChannelData, saveChannelData } from '@/lib/data';
import { parseTxtFile } from '@/lib/parser';
import type { ApiResponse, Channel, ImportResult } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST - 导入频道
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
    const { content, mode, defaultCategory } = body; // mode: 'append' | 'replace'

    if (!content) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '导入内容不能为空',
      }, { status: 400 });
    }

    const parsed = parseTxtFile(content);

    if (parsed.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '未能解析任何有效频道',
      }, { status: 400 });
    }

    const data = await getChannelData();
    const result: ImportResult = {
      total: parsed.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    if (mode === 'replace') {
      data.channels = [];
    }

    const existingUrls = new Set(data.channels.map(ch => ch.url));

    parsed.forEach((partialChannel, index) => {
      if (!partialChannel.url || !partialChannel.name) {
        result.skipped++;
        result.errors.push(`第 ${index + 1} 行: 缺少必要字段`);
        return;
      }

      if (existingUrls.has(partialChannel.url)) {
        result.skipped++;
        return;
      }

      const newChannel: Channel = {
        id: uuidv4(),
        name: partialChannel.name,
        url: partialChannel.url,
        category: defaultCategory || '其他',
        order: data.channels.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      data.channels.push(newChannel);
      existingUrls.add(newChannel.url);
      result.imported++;
    });

    data.lastUpdated = new Date().toISOString();

    await saveChannelData(
      data,
      `导入 ${result.imported} 个频道 (${mode === 'replace' ? '替换' : '追加'})`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: `成功导入 ${result.imported} 个频道`,
    });
  } catch (error) {
    console.error('导入失败:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '导入失败',
    }, { status: 500 });
  }
}
