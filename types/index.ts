// 频道数据类型
export interface Channel {
  id: string;
  name: string;
  url: string;
  category: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  // 频道状态检测字段
  status?: 'online' | 'offline' | 'unknown' | 'checking';
  responseTime?: number; // 响应时间（毫秒）
  lastCheckedAt?: string; // 最后检测时间
  errorMessage?: string; // 错误信息
}

// 分类类型
export interface Category {
  id: string;
  name: string;
  order: number;
}

// 访问密钥类型
export interface AccessKey {
  id: string;
  key: string;
  label: string; // 备注，如"客厅电视"、"朋友张三"
  createdAt: string;
  lastUsedAt?: string; // 最后使用时间（可选）
}

// 完整数据结构
export interface ChannelData {
  channels: Channel[];
  categories: Category[];
  accessKeys?: AccessKey[]; // 访问密钥列表（可选，用于向后兼容）
  version: string;
  lastUpdated: string;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 导入结果类型
export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
}

// Webhook 配置类型
export interface WebhookConfig {
  id: string;
  type: 'wechat' | 'dingtalk' | 'feishu' | 'custom';
  url: string;
  enabled: boolean;
  createdAt: string;
}

// 定时任务配置类型
export interface ScheduleConfig {
  id: string;
  enabled: boolean;
  scheduleTime: string; // HH:mm 格式，如 "13:00"
  timezone: string; // 如 "Asia/Shanghai"
  lastRunAt?: string;
  nextRunAt?: string;
}

// 频道测试结果类型
export interface ChannelTestResult {
  channelId: string;
  channelName: string;
  status: 'online' | 'offline';
  responseTime?: number;
  errorMessage?: string;
  testedAt: string;
}

// 测试进度类型
export interface TestProgress {
  total: number;
  completed: number;
  current?: string; // 当前测试的频道名称
  results: ChannelTestResult[];
  status: 'idle' | 'running' | 'completed' | 'cancelled';
  startedAt?: string;
  finishedAt?: string;
}
