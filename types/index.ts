// 频道数据类型
export interface Channel {
  id: string;
  name: string;
  url: string;
  category: string;
  order: number;
  createdAt: string;
  updatedAt: string;
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
