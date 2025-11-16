import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>电视直播源管理系统 - 登录</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="max-w-md w-full mx-4">
        <div class="bg-white rounded-lg shadow-xl p-8">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">
                    电视直播源管理系统
                </h1>
                <p class="text-gray-600">请输入管理员密码</p>
            </div>

            <form id="loginForm" class="space-y-6">
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                        密码
                    </label>
                    <input
                        type="password"
                        id="password"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                        placeholder="请输入密码"
                        required
                    />
                </div>

                <div id="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" style="display: none;">
                    密码错误
                </div>

                <button
                    type="submit"
                    class="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
                >
                    登录
                </button>
            </form>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();

            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');
            const button = document.querySelector('button[type="submit"]');

            const correctPassword = 'REDACTED_PASSWORD';

            if (password === correctPassword) {
                button.disabled = true;
                button.textContent = '登录中...';

                // 设置客户端 session
                const token = btoa(Date.now() + '-valid');
                document.cookie = 'auth_token=' + token + '; path=/; max-age=86400';

                // 跳转到管理后台
                window.location.href = '/dashboard';
            } else {
                errorDiv.style.display = 'block';
            }
        });
    </script>
</body>
</html>`;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}