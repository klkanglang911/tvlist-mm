'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [tvTxtUrl, setTvTxtUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify');
        const data = await response.json();

        if (!data.data?.authenticated) {
          router.push('/login');
        } else {
          setLoading(false);
        }
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    // 获取带访问密钥的完整 URL
    const getFullUrl = async () => {
      try {
        const response = await fetch('/api/tv-txt-url');
        const data = await response.json();
        if (data.success) {
          setTvTxtUrl(data.url);
        }
      } catch (error) {
        // 降级显示（没有密钥）
        if (typeof window !== 'undefined') {
          setTvTxtUrl(`${window.location.origin}/tv.txt?key=<未配置>`);
        }
      }
    };

    if (!loading) {
      getFullUrl();
    }
  }, [loading]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(tvTxtUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      alert('复制失败，请手动复制');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  const menuItems = [
    { name: '频道管理', path: '/dashboard', icon: '📺' },
    { name: '分类管理', path: '/dashboard/categories', icon: '📁' },
    { name: '导入导出', path: '/dashboard/import-export', icon: '📤' },
    { name: '密钥管理', path: '/dashboard/access-keys', icon: '🔑' },
    { name: '系统设置', path: '/dashboard/settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">电视直播源管理系统</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            退出登录
          </button>
        </div>
      </header>

      <div className="flex">
        {/* 侧边栏 */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  pathname === item.path
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200 mt-4">
            <div className="text-xs text-gray-500 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">🔒 受保护的访问地址</p>
                {copySuccess && (
                  <span className="text-green-600 text-xs">✓ 已复制</span>
                )}
              </div>

              <div className="relative">
                <code className="block bg-gray-50 px-2 py-2 pr-16 rounded text-xs break-all border border-gray-200">
                  {tvTxtUrl || '加载中...'}
                </code>
                <button
                  onClick={handleCopyUrl}
                  disabled={!tvTxtUrl}
                  className="absolute right-1 top-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition disabled:opacity-50"
                  title="复制 URL"
                >
                  复制
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                <p className="text-yellow-800 text-xs">
                  ⚠️ <strong>安全提示</strong>
                </p>
                <p className="text-yellow-700 text-xs mt-1">
                  • 此 URL 包含访问密钥，请勿公开分享
                  <br />
                  • 仅分享给信任的人员
                  <br />
                  • 可在密钥管理中修改密钥
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* 主内容区域 */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
