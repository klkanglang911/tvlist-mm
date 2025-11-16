'use client';

import { useEffect } from 'react';

export default function LoginPage() {
  useEffect(() => {
    // 重定向到简单的登录页面
    window.location.href = '/api/simple-login';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">正在跳转到登录页面...</p>
      </div>
    </div>
  );
}
