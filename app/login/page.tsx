'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 添加客户端验证脚本
  useEffect(() => {
    // 内联客户端验证函数
    window.clientLogin = function(pwd) {
      const correctPassword = 'REDACTED_PASSWORD';
      return pwd === correctPassword;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 使用内联客户端验证
      if (window.clientLogin && window.clientLogin(password)) {
        // 设置客户端 session
        const token = btoa(`${Date.now()}-valid`);
        document.cookie = `auth_token=${token}; path=/; max-age=86400`;
        router.push('/dashboard');
      } else {
        setError('密码错误');
      }
    } catch (err) {
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 内联客户端验证脚本 */}
      <script dangerouslySetInnerHTML={{
        __html: `
          function handleClientLogin(password) {
            const correctPassword = 'REDACTED_PASSWORD';
            if (password === correctPassword) {
              // 设置客户端 session
              const token = btoa(Date.now() + '-valid');
              document.cookie = 'auth_token=' + token + '; path=/; max-age=86400';
              window.location.href = '/dashboard';
              return true;
            }
            return false;
          }

          // 覆盖表单提交处理
          document.addEventListener('DOMContentLoaded', function() {
            const form = document.querySelector('form');
            if (form) {
              form.addEventListener('submit', function(e) {
                e.preventDefault();
                const password = document.getElementById('password').value;
                const errorDiv = document.querySelector('.bg-red-50');
                const button = document.querySelector('button[type="submit"]');

                if (handleClientLogin(password)) {
                  button.disabled = true;
                  button.textContent = '登录中...';
                } else {
                  if (errorDiv) {
                    errorDiv.style.display = 'block';
                    errorDiv.textContent = '密码错误';
                  }
                }
              });
            }
          });
        `
      }} />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              电视直播源管理系统
            </h1>
            <p className="text-gray-600">请输入管理员密码</p>
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
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="请输入密码"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
