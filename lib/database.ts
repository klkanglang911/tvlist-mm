// ========================================
// SQLite 数据库模块
// ========================================

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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
      updatedAt TEXT NOT NULL
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

  // 创建索引以提高查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
    CREATE INDEX IF NOT EXISTS idx_channels_order ON channels("order");
    CREATE INDEX IF NOT EXISTS idx_categories_order ON categories("order");
  `);

  // 初始化元数据
  const versionStmt = db.prepare('SELECT value FROM metadata WHERE key = ?');
  const version = versionStmt.get('version');

  if (!version) {
    const insertMetadata = db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
    insertMetadata.run('version', '1.2.0');
    insertMetadata.run('lastUpdated', new Date().toISOString());
    console.log('[Database] Metadata initialized');
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
