'use client';

import { useState } from 'react';
import type { ImportResult, Channel, ChannelTestResult } from '@/types';

export default function ImportExportPage() {
  const [importContent, setImportContent] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [defaultCategory, setDefaultCategory] = useState('其他');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // 预览相关状态
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewChannels, setPreviewChannels] = useState<Channel[]>([]);
  const [testResults, setTestResults] = useState<Map<string, ChannelTestResult>>(new Map());
  const [testing, setTesting] = useState(false);
  const [testProgress, setTestProgress] = useState({ current: 0, total: 0 });

  // 开始导入（显示预览）
  const handleImport = async () => {
    if (!importContent.trim()) {
      alert('请输入要导入的内容');
      return;
    }

    if (importMode === 'replace' && !confirm('替换模式将删除所有现有频道，确定继续吗？')) {
      return;
    }

    setImporting(true);

    try {
      // 调用预览 API 解析频道
      const response = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: importContent,
          defaultCategory,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // 显示预览模态框
        setPreviewChannels(data.data);
        setTestResults(new Map());
        setShowPreviewModal(true);
      } else {
        alert(data.error || '解析失败');
      }
    } catch (error) {
      alert('网络错误');
    } finally {
      setImporting(false);
    }
  };

  // 测试所有预览频道
  const handleTestChannels = async () => {
    if (previewChannels.length === 0) return;

    setTesting(true);
    setTestProgress({ current: 0, total: previewChannels.length });
    const newResults = new Map<string, ChannelTestResult>();

    for (let i = 0; i < previewChannels.length; i++) {
      const channel = previewChannels[i];
      setTestProgress({ current: i + 1, total: previewChannels.length });

      try {
        // 调用 API 测试频道
        const response = await fetch('/api/import/test-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel }),
        });

        const data = await response.json();
        if (data.success && data.data) {
          newResults.set(channel.id, data.data);
          setTestResults(new Map(newResults));
        }
      } catch (error) {
        console.error(`测试频道 ${channel.name} 失败:`, error);
      }

      // 小延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setTesting(false);
  };

  // 导入选中的频道
  const handleImportSelected = async (onlineOnly: boolean) => {
    let channelsToImport = previewChannels;

    // 如果只导入在线频道
    if (onlineOnly) {
      channelsToImport = previewChannels.filter(ch => {
        const result = testResults.get(ch.id);
        return result?.status === 'online';
      });

      if (channelsToImport.length === 0) {
        alert('没有在线频道可导入');
        return;
      }
    }

    setImporting(true);

    try {
      // 构建导入内容
      const importData = channelsToImport.map(ch => `${ch.name},${ch.url}`).join('\n');

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: importData,
          mode: importMode,
          defaultCategory,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setImportResult(data.data);
        setShowPreviewModal(false);
        setImportContent('');
        setPreviewChannels([]);
        setTestResults(new Map());
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

      {/* 导入预览和测试模态框 */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">导入预览与测试</h3>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewChannels([]);
                  setTestResults(new Map());
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                共解析到 <span className="font-bold text-indigo-600">{previewChannels.length}</span> 个频道
                {testResults.size > 0 && (
                  <>
                    {' | '}
                    <span className="text-green-600 font-semibold">
                      {Array.from(testResults.values()).filter(r => r.status === 'online').length} 在线
                    </span>
                    {' / '}
                    <span className="text-red-600 font-semibold">
                      {Array.from(testResults.values()).filter(r => r.status === 'offline').length} 离线
                    </span>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                {!testing && testResults.size === 0 && (
                  <button
                    onClick={handleTestChannels}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                  >
                    开始测试
                  </button>
                )}

                {testing && (
                  <div className="px-4 py-2 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                    测试中... {testProgress.current}/{testProgress.total}
                  </div>
                )}

                {!testing && testResults.size > 0 && (
                  <>
                    <button
                      onClick={handleTestChannels}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      重新测试
                    </button>
                    <button
                      onClick={() => handleImportSelected(true)}
                      disabled={importing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                    >
                      {importing ? '导入中...' : '仅导入在线频道'}
                    </button>
                    <button
                      onClick={() => handleImportSelected(false)}
                      disabled={importing}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50"
                    >
                      {importing ? '导入中...' : '导入全部'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 频道列表 */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      频道名称
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewChannels.map((channel, index) => {
                    const testResult = testResults.get(channel.id);
                    return (
                      <tr key={channel.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{channel.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-500 truncate max-w-md" title={channel.url}>
                            {channel.url}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {!testResult && !testing && (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              未测试
                            </span>
                          )}
                          {testing && testProgress.current >= index + 1 && !testResult && (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              测试中...
                            </span>
                          )}
                          {testResult && (
                            <div className="flex flex-col">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                testResult.status === 'online'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {testResult.status === 'online' ? '✓ 在线' : '✗ 离线'}
                              </span>
                              {testResult.responseTime && (
                                <span className="text-xs text-gray-500 mt-1">
                                  {testResult.responseTime}ms
                                </span>
                              )}
                              {testResult.errorMessage && (
                                <span className="text-xs text-red-600 mt-1" title={testResult.errorMessage}>
                                  {testResult.errorMessage.length > 20
                                    ? testResult.errorMessage.substring(0, 20) + '...'
                                    : testResult.errorMessage}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewChannels([]);
                  setTestResults(new Map());
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
