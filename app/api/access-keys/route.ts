import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getChannelData, saveChannelData } from '@/lib/data';
import type { ApiResponse, AccessKey } from '@/types';

/**
 * 生成 UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 掩码密钥（显示前3位和后3位）
 */
function maskKey(key: string): string {
  if (key.length <= 6) {
    return '***';
  }
  return `${key.slice(0, 3)}${'*'.repeat(key.length - 6)}${key.slice(-3)}`;
}

/**
 * GET - 获取所有访问密钥（需要认证）
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '未授权',
    }, { status: 401 });
  }

  try {
    const data = await getChannelData();
    const accessKeys = data.accessKeys || [];

    // 返回掩码后的密钥列表
    const maskedKeys = accessKeys.map(key => ({
      ...key,
      keyMasked: maskKey(key.key),
      key: undefined, // 不返回完整密钥
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: maskedKeys,
    });
  } catch (error) {
    console.error('获取访问密钥失败:', error);
    const errorMessage = error instanceof Error ? error.message : '获取访问密钥失败';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

/**
 * POST - 添加新的访问密钥（需要认证）
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
    const { key, label, autoGenerate } = body as {
      key?: string;
      label: string;
      autoGenerate?: boolean;
    };

    if (!label || label.trim().length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请提供密钥备注',
      }, { status: 400 });
    }

    // 自动生成或使用提供的密钥
    const finalKey = autoGenerate ? generateUUID() : (key || '').trim();

    if (!finalKey || finalKey.length < 6) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '密钥长度至少为 6 个字符',
      }, { status: 400 });
    }

    const data = await getChannelData();
    const accessKeys = data.accessKeys || [];

    // 检查密钥是否已存在
    if (accessKeys.some(k => k.key === finalKey)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '该密钥已存在',
      }, { status: 400 });
    }

    // 创建新密钥
    const newKey: AccessKey = {
      id: generateUUID(),
      key: finalKey,
      label: label.trim(),
      createdAt: new Date().toISOString(),
    };

    accessKeys.push(newKey);
    data.accessKeys = accessKeys;
    data.lastUpdated = new Date().toISOString();

    await saveChannelData(data);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '密钥添加成功',
      data: {
        id: newKey.id,
        key: newKey.key, // 返回完整密钥（仅在创建时）
        keyMasked: maskKey(newKey.key),
        label: newKey.label,
        createdAt: newKey.createdAt,
      },
    });
  } catch (error) {
    console.error('添加访问密钥失败:', error);
    const errorMessage = error instanceof Error ? error.message : '添加访问密钥失败';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

/**
 * PUT - 更新访问密钥（仅支持修改备注）
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
    const { id, label } = body as { id: string; label: string };

    if (!id || !label || label.trim().length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请提供密钥 ID 和新备注',
      }, { status: 400 });
    }

    const data = await getChannelData();
    const accessKeys = data.accessKeys || [];

    const keyIndex = accessKeys.findIndex(k => k.id === id);
    if (keyIndex === -1) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '密钥不存在',
      }, { status: 404 });
    }

    const oldLabel = accessKeys[keyIndex].label;
    accessKeys[keyIndex].label = label.trim();
    data.accessKeys = accessKeys;
    data.lastUpdated = new Date().toISOString();

    await saveChannelData(data);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '密钥备注更新成功',
      data: {
        id: accessKeys[keyIndex].id,
        keyMasked: maskKey(accessKeys[keyIndex].key),
        label: accessKeys[keyIndex].label,
        createdAt: accessKeys[keyIndex].createdAt,
        lastUsedAt: accessKeys[keyIndex].lastUsedAt,
      },
    });
  } catch (error) {
    console.error('更新访问密钥失败:', error);
    const errorMessage = error instanceof Error ? error.message : '更新访问密钥失败';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

/**
 * DELETE - 删除访问密钥
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
        error: '请提供密钥 ID',
      }, { status: 400 });
    }

    const data = await getChannelData();
    const accessKeys = data.accessKeys || [];

    const keyIndex = accessKeys.findIndex(k => k.id === id);
    if (keyIndex === -1) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '密钥不存在',
      }, { status: 404 });
    }

    const deletedKey = accessKeys[keyIndex];
    accessKeys.splice(keyIndex, 1);
    data.accessKeys = accessKeys;
    data.lastUpdated = new Date().toISOString();

    await saveChannelData(data);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '密钥删除成功',
    });
  } catch (error) {
    console.error('删除访问密钥失败:', error);
    const errorMessage = error instanceof Error ? error.message : '删除访问密钥失败';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
