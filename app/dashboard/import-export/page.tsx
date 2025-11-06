'use client';

import { useState } from 'react';
import type { ImportResult } from '@/types';

export default function ImportExportPage() {
  const [importContent, setImportContent] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [defaultCategory, setDefaultCategory] = useState('其他');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    if (!importContent.trim()) {
      alert('请输入要导入的内容');
      return;
    }

    if (importMode === 'replace' && !confirm('替换模式将删除所有现有频道，确定继续吗？')) {
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: importContent,
          mode: importMode,
          defaultCategory,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setImportResult(data.data);
        setImportContent('');
        alert(`导入成功！共导入 ${data.data.imported} 个频道`);
      } else {
        alert(data.error || '导入失败');
      }
    } catch (error) {
      alert('网络错误');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (format: 'txt' | 'm3u') => {
    try {
      const response = await fetch(`/api/export?format=${format}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = format === 'm3u' ? 'tv.m3u' : 'tv.txt';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('导出失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const copyPublicUrl = () => {
    const url = `${window.location.origin}/tv.txt`;
    navigator.clipboard.writeText(url);
    alert('已复制到剪贴板');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">导入导出</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 导入区域 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">📥 导入频道</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                导入模式
              </label>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="append">追加模式（保留现有频道）</option>
                <option value="replace">替换模式（删除所有现有频道）</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                默认分类
              </label>
              <input
                type="text"
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="导入频道的默认分类"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                频道列表内容
              </label>
              <textarea
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                placeholder={`支持以下格式：
1. 频道名称,URL
2. 频道名称 URL
3. M3U 格式
#EXTINF:-1,频道名称
URL`}
              />
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {importing ? '导入中...' : '开始导入'}
            </button>

            {importResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-green-800 mb-2">导入完成</p>
                <ul className="space-y-1 text-green-700">
                  <li>总数: {importResult.total}</li>
                  <li>成功: {importResult.imported}</li>
                  <li>跳过: {importResult.skipped}</li>
                  {importResult.errors.length > 0 && (
                    <li className="text-red-600">
                      错误: {importResult.errors.join(', ')}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 导出区域 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">📤 导出频道</h3>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">导出为 TXT 格式</h4>
              <p className="text-sm text-gray-600 mb-3">
                适用于大多数播放器，格式：频道名称,URL
              </p>
              <button
                onClick={() => handleExport('txt')}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                下载 TXT 文件
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">导出为 M3U 格式</h4>
              <p className="text-sm text-gray-600 mb-3">
                标准 M3U 播放列表格式，支持分组
              </p>
              <button
                onClick={() => handleExport('m3u')}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                下载 M3U 文件
              </button>
            </div>

            <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">🔗 公开访问地址</h4>
              <p className="text-sm text-gray-700 mb-3">
                VLC 等播放器可以直接访问此地址获取最新直播源列表
              </p>
              <div className="bg-white border border-gray-300 rounded-lg px-3 py-2 mb-3">
                <code className="text-xs text-gray-800 break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/tv.txt` : ''}
                </code>
              </div>
              <button
                onClick={copyPublicUrl}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                复制地址
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">💡 使用提示</p>
              <ul className="space-y-1 text-xs">
                <li>• 在 VLC 中打开网络流，粘贴公开访问地址</li>
                <li>• 系统会自动保持列表最新</li>
                <li>• 公开地址无需密码即可访问</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
