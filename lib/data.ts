// ========================================
// 数据读写接口（SQLite 版本）
// ========================================

import type { ChannelData, Channel, Category, AccessKey } from '@/types';
import { getDatabase, runInTransaction } from './database';

/**
 * 从 SQLite 读取完整的频道数据
 */
export async function getChannelData(): Promise<ChannelData> {
  const db = getDatabase();

  try {
    // 读取所有频道（按 order 排序）
    const channelsStmt = db.prepare(`
      SELECT * FROM channels
      ORDER BY "order" ASC, createdAt ASC
    `);
    const channels = channelsStmt.all() as Channel[];

    // 读取所有分类（按 order 排序）
    const categoriesStmt = db.prepare(`
      SELECT * FROM categories
      ORDER BY "order" ASC
    `);
    const categories = categoriesStmt.all() as Category[];

    // 读取所有访问密钥
    const accessKeysStmt = db.prepare(`
      SELECT * FROM access_keys
      ORDER BY createdAt DESC
    `);
    const accessKeys = accessKeysStmt.all() as AccessKey[];

    // 读取元数据
    const metadataStmt = db.prepare('SELECT value FROM metadata WHERE key = ?');
    const version = metadataStmt.get('version') as { value: string } | undefined;
    const lastUpdated = metadataStmt.get('lastUpdated') as { value: string } | undefined;

    // 如果是空数据库，初始化默认分类
    if (categories.length === 0) {
      await initializeDefaultCategories();
      // 重新读取分类
      const categoriesStmt2 = db.prepare(`
        SELECT * FROM categories
        ORDER BY "order" ASC
      `);
      const newCategories = categoriesStmt2.all() as Category[];
      return {
        channels,
        categories: newCategories,
        accessKeys,
        version: version?.value || '1.2.0',
        lastUpdated: lastUpdated?.value || new Date().toISOString(),
      };
    }

    return {
      channels,
      categories,
      accessKeys,
      version: version?.value || '1.2.0',
      lastUpdated: lastUpdated?.value || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Data] Error reading channel data:', error);
    throw error;
  }
}

/**
 * 保存完整的频道数据到 SQLite
 *
 * 注意：此函数会完全替换现有数据（用于导入等场景）
 * 如果只需要更新部分数据，请使用专门的更新函数
 */
export async function saveChannelData(data: ChannelData): Promise<void> {
  return runInTransaction((db) => {
    try {
      // 1. 清空现有数据
      db.prepare('DELETE FROM channels').run();
      db.prepare('DELETE FROM categories').run();
      db.prepare('DELETE FROM access_keys').run();

      // 2. 插入频道数据
      if (data.channels.length > 0) {
        const insertChannel = db.prepare(`
          INSERT INTO channels (id, name, url, category, "order", createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const channel of data.channels) {
          insertChannel.run(
            channel.id,
            channel.name,
            channel.url,
            channel.category,
            channel.order,
            channel.createdAt,
            channel.updatedAt
          );
        }
      }

      // 3. 插入分类数据
      if (data.categories.length > 0) {
        const insertCategory = db.prepare(`
          INSERT INTO categories (id, name, "order")
          VALUES (?, ?, ?)
        `);

        for (const category of data.categories) {
          insertCategory.run(category.id, category.name, category.order);
        }
      }

      // 4. 插入访问密钥数据
      if (data.accessKeys && data.accessKeys.length > 0) {
        const insertAccessKey = db.prepare(`
          INSERT INTO access_keys (id, key, label, createdAt, lastUsedAt)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const accessKey of data.accessKeys) {
          insertAccessKey.run(
            accessKey.id,
            accessKey.key,
            accessKey.label,
            accessKey.createdAt,
            accessKey.lastUsedAt || null
          );
        }
      }

      // 5. 更新元数据
      const updateMetadata = db.prepare(`
        INSERT OR REPLACE INTO metadata (key, value)
        VALUES (?, ?)
      `);

      updateMetadata.run('version', data.version);
      updateMetadata.run('lastUpdated', new Date().toISOString());

      console.log('[Data] Channel data saved successfully');
    } catch (error) {
      console.error('[Data] Error saving channel data:', error);
      throw error;
    }
  });
}

/**
 * 初始化默认分类
 */
async function initializeDefaultCategories(): Promise<void> {
  const db = getDatabase();

  const defaultCategories = [
    { id: 'cctv', name: '央视频道', order: 1 },
    { id: 'satellite', name: '卫视频道', order: 2 },
    { id: 'local', name: '地方台', order: 3 },
    { id: 'other', name: '其他', order: 4 },
  ];

  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, "order")
    VALUES (?, ?, ?)
  `);

  for (const category of defaultCategories) {
    insertCategory.run(category.id, category.name, category.order);
  }

  console.log('[Data] Default categories initialized');
}
