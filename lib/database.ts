// ========================================
// SQLite 数据库模块
// ========================================

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 表列信息类型
interface TableColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

// 元数据行类型
interface MetadataRow {
  value: string;
}

// 计数行类型
interface CountRow {
  count: number;
}

// 数据库文件路径
const getDatabasePath = (): string => {
  // Docker 环境使用 volume 路径
  if (process.env.NODE_ENV === 'production') {
    return process.env.DATABASE_PATH || '/data/tvlist.db';
  }

  // 开发环境使用本地路径
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, 'tvlist.db');
};

// 数据库实例（单例）
let db: Database.Database | null = null;

// 获取数据库实例
export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = getDatabasePath();
    console.log(`[Database] Initializing database at: ${dbPath}`);

    db = new Database(dbPath);

    // 启用 WAL 模式（提高并发性能）
    db.pragma('journal_mode = WAL');

    // 初始化数据库表结构
    initializeTables();

    console.log('[Database] Database initialized successfully');
  }

  return db;
}

// 初始化数据库表结构
function initializeTables(): void {
  const db = getDatabase();

  // 创建频道表
  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      "order" INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      status TEXT DEFAULT 'unknown',
      responseTime INTEGER,
      lastCheckedAt TEXT,
      errorMessage TEXT
    )
  `);

  // 创建分类表
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      "order" INTEGER DEFAULT 0
    )
  `);

  // 创建访问密钥表
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_keys (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      lastUsedAt TEXT
    )
  `);

  // 创建元数据表
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // 创建 Webhook 配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_config (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL
    )
  `);

  // 创建定时任务配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_config (
      id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      scheduleTime TEXT NOT NULL,
      timezone TEXT DEFAULT 'Asia/Shanghai',
      lastRunAt TEXT,
      nextRunAt TEXT
    )
  `);

  // 创建索引以提高查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
    CREATE INDEX IF NOT EXISTS idx_channels_order ON channels("order");
    CREATE INDEX IF NOT EXISTS idx_categories_order ON categories("order");
  `);

  // 初始化元数据
  const versionStmt = db.prepare('SELECT value FROM metadata WHERE key = ?');
  const version = versionStmt.get('version') as MetadataRow | undefined;

  if (!version) {
    const insertMetadata = db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
    insertMetadata.run('version', '1.3.0');
    insertMetadata.run('lastUpdated', new Date().toISOString());
    console.log('[Database] Metadata initialized');
  }

  // 数据库迁移：为已存在的 channels 表添加新列
  try {
    const tableInfo = db.pragma('table_info(channels)') as TableColumn[];
    const columns = tableInfo.map((col) => col.name);

    if (!columns.includes('status')) {
      db.exec(`
        ALTER TABLE channels ADD COLUMN status TEXT DEFAULT 'unknown';
        ALTER TABLE channels ADD COLUMN responseTime INTEGER;
        ALTER TABLE channels ADD COLUMN lastCheckedAt TEXT;
        ALTER TABLE channels ADD COLUMN errorMessage TEXT;
      `);
      console.log('[Database] Migrated channels table with status fields');
    }
  } catch (error) {
    console.log('[Database] Channels table already up to date or migration not needed');
  }

  // 初始化默认的定时任务配置
  const scheduleStmt = db.prepare('SELECT COUNT(*) as count FROM schedule_config');
  const scheduleCount = scheduleStmt.get() as CountRow;

  if (scheduleCount.count === 0) {
    const insertSchedule = db.prepare(`
      INSERT INTO schedule_config (id, enabled, scheduleTime, timezone, nextRunAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertSchedule.run('default', 0, '13:00', 'Asia/Shanghai', null);
    console.log('[Database] Default schedule config initialized');
  }
}

// 关闭数据库连接（主要用于测试或优雅关闭）
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[Database] Database connection closed');
  }
}

// 事务辅助函数
export function runInTransaction<T>(fn: (db: Database.Database) => T): T {
  const db = getDatabase();
  const transaction = db.transaction(fn);
  return transaction(db);
}
