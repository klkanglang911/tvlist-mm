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

// 完整数据结构
export interface ChannelData {
  channels: Channel[];
  categories: Category[];
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

// GitHub 提交信息
export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

// 版本历史类型
export interface VersionHistory {
  commits: GitCommit[];
  total: number;
}
