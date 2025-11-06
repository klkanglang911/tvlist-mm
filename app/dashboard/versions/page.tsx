'use client';

import { useEffect, useState } from 'react';
import type { GitCommit } from '@/types';

export default function VersionsPage() {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      const response = await fetch('/api/versions');
      const data = await response.json();

      if (data.success) {
        setCommits(data.data.commits);
      }
    } catch (error) {
      console.error('获取版本历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (sha: string, message: string) => {
    if (!confirm(`确定要回滚到版本「${message}」吗？\n\n当前数据将被替换，此操作会创建一个新的提交。`)) {
      return;
    }

    setRolling(true);

    try {
      const response = await fetch('/api/versions/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha }),
      });

      const data = await response.json();

      if (data.success) {
        alert('回滚成功！页面将刷新...');
        window.location.reload();
      } else {
        alert(data.error || '回滚失败');
      }
    } catch (error) {
      alert('网络错误');
    } finally {
      setRolling(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">版本历史</h2>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {commits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无版本历史
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {commits.map((commit, index) => (
              <div
                key={commit.sha}
                className="p-6 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {index === 0 && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          当前版本
                        </span>
                      )}
                      <span className="font-mono text-sm text-gray-500">
                        {commit.sha.substring(0, 7)}
                      </span>
                    </div>

                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {commit.message}
                    </h3>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {commit.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDate(commit.date)}
                      </span>
                    </div>
                  </div>

                  {index !== 0 && (
                    <button
                      onClick={() => handleRollback(commit.sha, commit.message)}
                      disabled={rolling}
                      className="ml-4 px-4 py-2 text-sm border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      回滚到此版本
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-2">💡 关于版本历史</p>
        <ul className="space-y-1 text-xs">
          <li>• 每次修改频道数据时都会自动创建一个新版本</li>
          <li>• 可以随时回滚到任意历史版本</li>
          <li>• 回滚操作会创建一个新的提交，不会删除历史记录</li>
          <li>• 版本数据存储在 GitHub 仓库中，永久保存</li>
        </ul>
      </div>
    </div>
  );
}
