import type { ChannelData } from '@/types';
import { getFileFromGitHub, updateFileOnGitHub, GITHUB_CONFIG } from './github';

/**
 * 从 GitHub 读取频道数据
 */
export async function getChannelData(): Promise<ChannelData> {
  const file = await getFileFromGitHub(GITHUB_CONFIG.dataPath);

  if (!file) {
    // 如果文件不存在，返回默认数据
    return {
      channels: [],
      categories: [
        { id: 'cctv', name: '央视频道', order: 1 },
        { id: 'satellite', name: '卫视频道', order: 2 },
        { id: 'local', name: '地方台', order: 3 },
        { id: 'other', name: '其他', order: 4 },
      ],
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
    };
  }

  return JSON.parse(file.content);
}

/**
 * 保存频道数据到 GitHub
 */
export async function saveChannelData(data: ChannelData, message: string): Promise<void> {
  const file = await getFileFromGitHub(GITHUB_CONFIG.dataPath);
  const content = JSON.stringify(data, null, 2);

  await updateFileOnGitHub(
    GITHUB_CONFIG.dataPath,
    content,
    message,
    file?.sha
  );
}
