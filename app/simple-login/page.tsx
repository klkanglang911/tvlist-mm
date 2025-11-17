'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SimpleLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setDebug('开始登录...');

    try {
      setDebug('发送请求到 /api/auth/login');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      setDebug(`收到响应，状态码: ${response.status}`);

      const data = await response.json();
      setDebug(`解析数据: ${JSON.stringify(data)}`);

      if (data.success) {
        setDebug('登录成功，准备跳转...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      } else {
        setError(data.error || '登录失败');
        setLoading(false);
        setDebug(`登录失败: ${data.error}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      setError('网络错误，请重试');
      setLoading(false);
      setDebug(`捕获错误: ${errorMsg}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              电视直播源管理系统
            </h1>
            <p className="text-gray-600">简化版登录（调试）</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setDebug(`密码长度: ${e.target.value.length}`);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="请输入密码"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {debug && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm font-mono text-xs">
                {debug}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:bg-indigo-400 disabled:cursor-not-allowed"
              onClick={() => setDebug('按钮被点击')}
            >
              {loading ? '登录中...' : '登录'}
            </button>

            <div className="mt-4 p-4 bg-gray-50 rounded text-xs">
              <p className="font-semibold mb-2">测试密码:</p>
              <code className="bg-white px-2 py-1 rounded border">Capibalaa@0711</code>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
