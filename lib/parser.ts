import type { Channel } from '@/types';

/**
 * 解析 txt 格式的直播源文件
 * 支持多种格式：
 * 1. 频道名称,URL
 * 2. 频道名称 URL
 * 3. #EXTINF:-1,频道名称\nURL (M3U格式)
 */
export function parseTxtFile(content: string): Partial<Channel>[] {
  const lines = content.split('\n').filter(line => line.trim());
  const channels: Partial<Channel>[] = [];
  let currentChannel: Partial<Channel> | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 跳过空行和注释（非 M3U 注释）
    if (!trimmedLine || (trimmedLine.startsWith('#') && !trimmedLine.startsWith('#EXTINF'))) {
      continue;
    }

    // M3U 格式：#EXTINF:-1,频道名称
    if (trimmedLine.startsWith('#EXTINF')) {
      const match = trimmedLine.match(/#EXTINF:.*?,(.+)/);
      if (match) {
        currentChannel = {
          name: match[1].trim(),
        };
      }
      continue;
    }

    // URL 行
    if (trimmedLine.match(/^https?:\/\//)) {
      if (currentChannel) {
        // M3U 格式的 URL
        currentChannel.url = trimmedLine;
        channels.push(currentChannel);
        currentChannel = null;
      } else {
        // 单独的 URL（可能前面没有频道名）
        continue;
      }
    } else {
      // 尝试解析 "频道名,URL" 或 "频道名 URL" 格式
      const commaMatch = trimmedLine.match(/^([^,]+),(.+)$/);
      const spaceMatch = trimmedLine.match(/^(\S+)\s+(https?:\/\/.+)$/);

      if (commaMatch) {
        channels.push({
          name: commaMatch[1].trim(),
          url: commaMatch[2].trim(),
        });
      } else if (spaceMatch) {
        channels.push({
          name: spaceMatch[1].trim(),
          url: spaceMatch[2].trim(),
        });
      }
    }
  }

  return channels.filter(ch => ch.name && ch.url);
}

/**
 * 生成 VLC 兼容的 txt 格式
 * 格式：频道名,URL
 */
export function generateTxtFile(channels: Channel[], categories?: string[]): string {
  let output = '';

  if (categories && categories.length > 0) {
    // 按分类分组
    for (const category of categories) {
      const categoryChannels = channels
        .filter(ch => ch.category === category)
        .sort((a, b) => a.order - b.order);

      if (categoryChannels.length > 0) {
        output += `${category},#genre#\n`;
        for (const channel of categoryChannels) {
          output += `${channel.name},${channel.url}\n`;
        }
      }
    }

    // 未分类的频道
    const uncategorized = channels
      .filter(ch => !categories.includes(ch.category))
      .sort((a, b) => a.order - b.order);

    if (uncategorized.length > 0) {
      output += '其他,#genre#\n';
      for (const channel of uncategorized) {
        output += `${channel.name},${channel.url}\n`;
      }
    }
  } else {
    // 不分组，直接输出所有频道
    const sortedChannels = [...channels].sort((a, b) => a.order - b.order);
    for (const channel of sortedChannels) {
      output += `${channel.name},${channel.url}\n`;
    }
  }

  return output;
}

/**
 * 生成 M3U 格式
 */
export function generateM3uFile(channels: Channel[], categories?: string[]): string {
  let output = '#EXTM3U\n\n';

  if (categories && categories.length > 0) {
    for (const category of categories) {
      const categoryChannels = channels
        .filter(ch => ch.category === category)
        .sort((a, b) => a.order - b.order);

      for (const channel of categoryChannels) {
        output += `#EXTINF:-1 group-title="${category}",${channel.name}\n`;
        output += `${channel.url}\n`;
      }
    }

    // 未分类的频道
    const uncategorized = channels.filter(ch => !categories.includes(ch.category));
    for (const channel of uncategorized) {
      output += `#EXTINF:-1,${channel.name}\n`;
      output += `${channel.url}\n`;
    }
  } else {
    const sortedChannels = [...channels].sort((a, b) => a.order - b.order);
    for (const channel of sortedChannels) {
      output += `#EXTINF:-1,${channel.name}\n`;
      output += `${channel.url}\n`;
    }
  }

  return output;
}

/**
 * 验证 URL 格式
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
