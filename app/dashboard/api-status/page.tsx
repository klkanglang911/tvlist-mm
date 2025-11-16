'use client';

import { useEffect, useState } from 'react';

interface RateLimitInfo {
  limit: number;
  remaining: number;
  used: number;
  reset: string;
  resetLocal: string;
  minutesUntilReset: number;
  isLimited: boolean;
  percentage: number;
}

export default function ApiStatusPage() {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchRateLimit = async () => {
    try {
      const response = await fetch('/api/debug/rate-limit');
      const data = await response.json();

      if (data.success) {
        setRateLimitInfo(data.data);
        setError('');
      } else {
        setError(data.error || '获取失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRateLimit();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (autoRefresh) {
      interval = setInterval(fetchRateLimit, 30000); // 每 30 秒刷新
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusColor = () => {
    if (!rateLimitInfo) return 'gray';
    if (rateLimitInfo.isLimited) return 'red';
    if (rateLimitInfo.percentage < 20) return 'yellow';
    return 'green';
  };

  const getStatusText = () => {
    if (!rateLimitInfo) return '未知';
    if (rateLimitInfo.isLimited) return '已达上限';
    if (rateLimitInfo.percentage < 20) return '即将耗尽';
    return '正常';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">API 状态监控</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            自动刷新（30秒）
          </label>
          <button
            onClick={fetchRateLimit}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? '加载中...' : '刷新'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {rateLimitInfo && (
        <div className="space-y-6">
          {/* 状态概览 */}
          <div className={`bg-${getStatusColor()}-50 border border-${getStatusColor()}-200 rounded-lg p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">
                {rateLimitInfo.isLimited ? '🚫' : rateLimitInfo.percentage < 20 ? '⚠️' : '✅'}
              </span>
              <div>
                <h3 className="text-xl font-semibold">
                  GitHub API 状态：{getStatusText()}
                </h3>
                <p className="text-gray-600">
                  {rateLimitInfo.isLimited
                    ? `速率限制中，${rateLimitInfo.minutesUntilReset} 分钟后恢复`
                    : `剩余 ${rateLimitInfo.remaining} 次请求`}
                </p>
              </div>
            </div>

            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div
                className={`h-4 rounded-full transition-all ${
                  rateLimitInfo.isLimited
                    ? 'bg-red-500'
                    : rateLimitInfo.percentage < 20
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${rateLimitInfo.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-right">
              {rateLimitInfo.remaining} / {rateLimitInfo.limit} 次 ({rateLimitInfo.percentage}%)
            </p>
          </div>

          {/* 详细信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-500 mb-1">总配额</p>
              <p className="text-2xl font-bold text-gray-900">{rateLimitInfo.limit}</p>
              <p className="text-xs text-gray-500">次/小时</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-500 mb-1">剩余次数</p>
              <p className={`text-2xl font-bold ${rateLimitInfo.isLimited ? 'text-red-600' : 'text-green-600'}`}>
                {rateLimitInfo.remaining}
              </p>
              <p className="text-xs text-gray-500">次</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-500 mb-1">已使用</p>
              <p className="text-2xl font-bold text-gray-900">{rateLimitInfo.used}</p>
              <p className="text-xs text-gray-500">次</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-500 mb-1">重置时间</p>
              <p className="text-lg font-bold text-gray-900">{rateLimitInfo.minutesUntilReset}</p>
              <p className="text-xs text-gray-500">分钟后</p>
            </div>
          </div>

          {/* 重置时间详情 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">重置时间详情</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">北京时间：</span>
                <span className="font-medium">{rateLimitInfo.resetLocal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">UTC 时间：</span>
                <span className="font-medium">{new Date(rateLimitInfo.reset).toUTCString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">距离重置：</span>
                <span className="font-medium">{rateLimitInfo.minutesUntilReset} 分钟</span>
              </div>
            </div>
          </div>

          {/* 使用建议 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">💡 使用建议</h3>
            <ul className="space-y-2 text-blue-700 text-sm">
              <li>• <strong>批量导入</strong>：使用&ldquo;导入导出&rdquo;页面一次性导入多个频道，只消耗 1 次 API 配额</li>
              <li>• <strong>避免频繁操作</strong>：添加、编辑、删除操作都会消耗 API 配额</li>
              <li>• <strong>查看操作免费</strong>：浏览频道列表、分类等不消耗配额</li>
              <li>• <strong>导出免费</strong>：导出 TXT/M3U 文件会消耗配额（需要读取数据）</li>
              <li>• <strong>配额重置</strong>：每小时自动重置配额</li>
            </ul>
          </div>

          {rateLimitInfo.isLimited && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-3">🚨 当前受限</h3>
              <p className="text-red-700 mb-3">
                GitHub API 速率限制已达上限，以下操作暂时不可用：
              </p>
              <ul className="space-y-1 text-red-600 text-sm">
                <li>❌ 添加/编辑/删除频道</li>
                <li>❌ 添加/编辑/删除分类</li>
                <li>❌ 批量导入</li>
                <li>❌ 版本回滚</li>
                <li>❌ 访问 tv.txt</li>
              </ul>
              <p className="text-red-700 mt-3">
                请等待 <strong>{rateLimitInfo.minutesUntilReset} 分钟</strong>后重试（{rateLimitInfo.resetLocal}）
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
