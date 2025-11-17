'use client';

import { useEffect, useState } from 'react';
import type { ApiResponse } from '@/types';

interface AccessKeyDisplay {
  id: string;
  keyMasked: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string;
}

export default function AccessKeysPage() {
  const [keys, setKeys] = useState<AccessKeyDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'manual' | 'auto'>('auto');
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [createdKey, setCreatedKey] = useState<{ key: string; label: string } | null>(null);

  // 加载密钥列表
  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/access-keys');
      const data: ApiResponse = await response.json();

      if (data.success) {
        setKeys(data.data || []);
      } else {
        alert(data.error || '加载密钥失败');
      }
    } catch (error) {
      alert('网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  // 添加密钥
  const handleAddKey = async () => {
    if (!newLabel.trim()) {
      alert('请输入密钥备注');
      return;
    }

    if (addMode === 'manual' && (!newKeyInput.trim() || newKeyInput.trim().length < 6)) {
      alert('手动输入的密钥长度至少为 6 个字符');
      return;
    }

    try {
      const response = await fetch('/api/access-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: addMode === 'manual' ? newKeyInput.trim() : undefined,
          label: newLabel.trim(),
          autoGenerate: addMode === 'auto',
        }),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        // 显示完整密钥（仅在创建时显示一次）
        setCreatedKey({
          key: data.data.key,
          label: data.data.label,
        });

        // 重置表单
        setShowAddModal(false);
        setNewKeyInput('');
        setNewLabel('');
        setAddMode('auto');

        // 刷新列表
        await fetchKeys();
      } else {
        alert(data.error || '添加密钥失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 更新密钥备注
  const handleUpdateLabel = async (id: string) => {
    if (!editingLabel.trim()) {
      alert('请输入新备注');
      return;
    }

    try {
      const response = await fetch('/api/access-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          label: editingLabel.trim(),
        }),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        setEditingId(null);
        setEditingLabel('');
        await fetchKeys();
      } else {
        alert(data.error || '更新备注失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 删除密钥
  const handleDeleteKey = async (id: string, label: string) => {
    if (!confirm(`确定要删除密钥"${label}"吗？删除后该密钥将立即失效。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/access-keys?id=${id}`, {
        method: 'DELETE',
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        await fetchKeys();
      } else {
        alert(data.error || '删除密钥失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => alert('已复制到剪贴板'),
      () => alert('复制失败，请手动复制')
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题和说明 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">访问密钥管理</h1>
          <p className="text-gray-600 text-sm">
            管理 TV.TXT 访问密钥，用于保护直播源列表的访问权限
          </p>
        </div>

        {/* 说明卡片 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 每个密钥都有独立的访问权限，可用于不同设备或分享给不同的人</li>
            <li>• 密钥创建后仅显示一次完整内容，请务必保存</li>
            <li>• 删除密钥后，使用该密钥的访问将立即失效</li>
            <li>• 建议为每个设备或用户创建独立的密钥，便于管理</li>
          </ul>
        </div>

        {/* 添加按钮 */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            + 添加新密钥
          </button>
        </div>

        {/* 密钥列表 */}
        {keys.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">暂无访问密钥</p>
            <p className="text-sm text-gray-400">点击上方按钮添加第一个密钥</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    密钥（掩码）
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    备注
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最后使用
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {keys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {key.keyMasked}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === key.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="输入新备注"
                          />
                          <button
                            onClick={() => handleUpdateLabel(key.id)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingLabel('');
                            }}
                            className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900">{key.label}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(key.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString('zh-CN') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingId !== key.id && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingId(key.id);
                              setEditingLabel(key.label);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteKey(key.id, key.label)}
                            className="text-red-600 hover:text-red-900"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 添加密钥弹窗 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">添加新密钥</h2>

              {/* 模式选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密钥生成方式
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="auto"
                      checked={addMode === 'auto'}
                      onChange={(e) => setAddMode(e.target.value as 'auto')}
                      className="mr-2"
                    />
                    <span className="text-sm">自动生成（推荐）</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="manual"
                      checked={addMode === 'manual'}
                      onChange={(e) => setAddMode(e.target.value as 'manual')}
                      className="mr-2"
                    />
                    <span className="text-sm">手动输入</span>
                  </label>
                </div>
              </div>

              {/* 手动输入模式 */}
              {addMode === 'manual' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    密钥内容（至少 6 个字符）
                  </label>
                  <input
                    type="text"
                    value={newKeyInput}
                    onChange={(e) => setNewKeyInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="输入自定义密钥"
                  />
                </div>
              )}

              {/* 备注 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  备注（必填）
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：客厅电视、朋友张三"
                />
              </div>

              {/* 按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddKey}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  {addMode === 'auto' ? '生成并添加' : '添加'}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewKeyInput('');
                    setNewLabel('');
                    setAddMode('auto');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 新创建的密钥显示弹窗 */}
        {createdKey && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4 text-green-600">✓ 密钥创建成功</h2>

              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800 font-semibold mb-2">
                  ⚠️ 重要：密钥内容仅显示一次
                </p>
                <p className="text-xs text-yellow-700">
                  请立即复制并保存密钥，关闭此窗口后将无法再次查看完整密钥
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  备注
                </label>
                <p className="text-gray-900">{createdKey.label}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密钥内容
                </label>
                <div className="relative">
                  <code className="block bg-gray-100 px-3 py-2 pr-20 rounded font-mono text-sm break-all border border-gray-300">
                    {createdKey.key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdKey.key)}
                    className="absolute right-2 top-2 px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                  >
                    复制
                  </button>
                </div>
              </div>

              <button
                onClick={() => setCreatedKey(null)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                我已保存，关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
