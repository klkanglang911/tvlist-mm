// ========================================
// 日志管理模块 - 生产环境优化
// ========================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

interface LogConfig {
  level: LogLevel;
  prefix: string;
  timestamp: boolean;
}

// 日志级别优先级
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

// 从环境变量读取日志级别，生产环境默认 warn
const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'warn' : 'info');

/**
 * 检查是否应该输出该级别的日志
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * 格式化日志消息
 */
function formatMessage(prefix: string, message: string, includeTimestamp: boolean): string {
  const parts: string[] = [];

  if (includeTimestamp) {
    parts.push(new Date().toISOString());
  }

  if (prefix) {
    parts.push(`[${prefix}]`);
  }

  parts.push(message);

  return parts.join(' ');
}

/**
 * 创建带前缀的日志器
 */
export function createLogger(prefix: string, options: Partial<LogConfig> = {}) {
  const config: LogConfig = {
    level: currentLevel,
    prefix,
    timestamp: process.env.NODE_ENV === 'production',
    ...options,
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog('debug')) {
        console.log(formatMessage(config.prefix, message, config.timestamp), ...args);
      }
    },

    info: (message: string, ...args: unknown[]) => {
      if (shouldLog('info')) {
        console.log(formatMessage(config.prefix, message, config.timestamp), ...args);
      }
    },

    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn(formatMessage(config.prefix, message, config.timestamp), ...args);
      }
    },

    error: (message: string, ...args: unknown[]) => {
      if (shouldLog('error')) {
        console.error(formatMessage(config.prefix, message, config.timestamp), ...args);
      }
    },
  };
}

// 默认日志器
export const logger = createLogger('App');

// 预定义的模块日志器
export const schedulerLogger = createLogger('Scheduler');
export const webhookLogger = createLogger('Webhook');
export const authLogger = createLogger('Auth');
export const dbLogger = createLogger('Database');
export const checkerLogger = createLogger('Checker');
