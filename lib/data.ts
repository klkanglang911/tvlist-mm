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

// ========================================
// 单条记录操作函数（高性能）
// ========================================

/**
 * 添加单个频道
 */
export function addChannel(channel: Omit<Channel, 'createdAt' | 'updatedAt'>): Channel {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO channels (id, name, url, category, "order", createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    channel.id,
    channel.name,
    channel.url,
    channel.category,
    channel.order,
    now,
    now
  );

  // 更新 lastUpdated 元数据
  db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run(now, 'lastUpdated');

  return {
    ...channel,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 更新单个频道
 */
export function updateChannel(
  id: string,
  updates: Partial<Omit<Channel, 'id' | 'createdAt'>>
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.url !== undefined) {
    fields.push('url = ?');
    values.push(updates.url);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }
  if (updates.order !== undefined) {
    fields.push('"order" = ?');
    values.push(updates.order);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.responseTime !== undefined) {
    fields.push('responseTime = ?');
    values.push(updates.responseTime);
  }
  if (updates.lastCheckedAt !== undefined) {
    fields.push('lastCheckedAt = ?');
    values.push(updates.lastCheckedAt);
  }
  if (updates.errorMessage !== undefined) {
    fields.push('errorMessage = ?');
    values.push(updates.errorMessage);
  }

  if (fields.length === 0) return false;

  // 总是更新 updatedAt
  fields.push('updatedAt = ?');
  values.push(now);

  values.push(id);
  const stmt = db.prepare(`UPDATE channels SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  if (result.changes > 0) {
    // 更新 lastUpdated 元数据
    db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run(now, 'lastUpdated');
    return true;
  }

  return false;
}

/**
 * 删除单个频道
 */
export function deleteChannel(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM channels WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes > 0) {
    // 更新 lastUpdated 元数据
    const now = new Date().toISOString();
    db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run(now, 'lastUpdated');
    return true;
  }

  return false;
}

/**
 * 批量删除频道
 */
export function deleteChannels(ids: string[]): number {
  if (ids.length === 0) return 0;

  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`DELETE FROM channels WHERE id IN (${placeholders})`);
  const result = stmt.run(...ids);

  if (result.changes > 0) {
    // 更新 lastUpdated 元数据
    const now = new Date().toISOString();
    db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run(now, 'lastUpdated');
  }

  return result.changes;
}

/**
 * 批量添加频道（使用事务）
 */
export function addChannelsBatch(channels: Omit<Channel, 'createdAt' | 'updatedAt'>[]): number {
  if (channels.length === 0) return 0;

  return runInTransaction((db) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO channels (id, name, url, category, "order", createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    for (const channel of channels) {
      stmt.run(
        channel.id,
        channel.name,
        channel.url,
        channel.category,
        channel.order,
        now,
        now
      );
      count++;
    }

    // 更新 lastUpdated 元数据
    db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run(now, 'lastUpdated');

    return count;
  });
}

/**
 * 获取单个频道
 */
export function getChannel(id: string): Channel | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM channels WHERE id = ?');
  const row = stmt.get(id) as Channel | undefined;
  return row || null;
}

// ========================================
// 分类单条操作
// ========================================

/**
 * 添加单个分类
 */
export function addCategory(category: Category): Category {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO categories (id, name, "order")
    VALUES (?, ?, ?)
  `);
  stmt.run(category.id, category.name, category.order);

  // 更新 lastUpdated 元数据
  const now = new Date().toISOString();
  db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run(now, 'lastUpdated');

  return category;
}

/**
 * 更新单个分类
 */
export function updateCategory(
  id: string,
  updates: Partial<Omit<Category, 'id'>>
): boolean {
  const db = getDatabase();

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.order !== undefined) {
    fields.push('"order" = ?');
    values.push(updates.order);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const stmt = db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  if (result.changes > 0) {
    // 更新 lastUpdated 元数据
    const now = new Date().toISOString();
    db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run(now, 'lastUpdated');
    return true;
  }

  return false;
}

/**
 * 删除单个分类
 */
export function deleteCategory(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes > 0) {
    // 更新 lastUpdated 元数据
    const now = new Date().toISOString();
    db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run(now, 'lastUpdated');
    return true;
  }

  return false;
}

// ========================================
// 访问密钥单条操作
// ========================================

/**
 * 添加单个访问密钥
 */
export function addAccessKey(accessKey: AccessKey): AccessKey {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO access_keys (id, key, label, createdAt, lastUsedAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    accessKey.id,
    accessKey.key,
    accessKey.label,
    accessKey.createdAt,
    accessKey.lastUsedAt || null
  );

  return accessKey;
}

/**
 * 更新单个访问密钥
 */
export function updateAccessKey(
  id: string,
  updates: Partial<Omit<AccessKey, 'id' | 'createdAt'>>
): boolean {
  const db = getDatabase();

  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (updates.key !== undefined) {
    fields.push('key = ?');
    values.push(updates.key);
  }
  if (updates.label !== undefined) {
    fields.push('label = ?');
    values.push(updates.label);
  }
  if (updates.lastUsedAt !== undefined) {
    fields.push('lastUsedAt = ?');
    values.push(updates.lastUsedAt);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const stmt = db.prepare(`UPDATE access_keys SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  return result.changes > 0;
}

/**
 * 删除单个访问密钥
 */
export function deleteAccessKey(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM access_keys WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// ========================================
// 频道排序操作
// ========================================

/**
 * 重新排序同一分类内的频道
 * @param categoryId 分类 ID
 * @param channelIds 按新顺序排列的频道 ID 数组
 */
export function reorderChannelsInCategory(categoryId: string, channelIds: string[]): boolean {
  if (channelIds.length === 0) return false;

  return runInTransaction((db) => {
    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE channels SET "order" = ?, updatedAt = ?
      WHERE id = ? AND category = ?
    `);

    let updated = 0;
    for (let i = 0; i < channelIds.length; i++) {
      const result = updateStmt.run(i + 1, now, channelIds[i], categoryId);
      if (result.changes > 0) updated++;
    }

    // 更新 lastUpdated 元数据
    db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run(now, 'lastUpdated');

    return updated > 0;
  });
}
