'use client';

import { useEffect, useState } from 'react';
import type { Channel, Category } from '@/types';

export default function DashboardPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchContent, setBatchContent] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    category: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [channelsRes, categoriesRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/categories'),
      ]);

      const channelsData = await channelsRes.json();
      const categoriesData = await categoriesRes.json();

      if (channelsData.success) setChannels(channelsData.data);
      if (categoriesData.success) setCategories(categoriesData.data);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();

    // 批量模式
    if (isBatchMode) {
      await handleBatchAdd();
      return;
    }

    // 单个添加
    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setChannels([...channels, data.data]);
        setShowAddModal(false);
        setFormData({ name: '', url: '', category: '' });
        alert('添加成功！');
      } else {
        alert(data.error || '添加失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleBatchAdd = async () => {
    if (!batchContent.trim()) {
      alert('请输入要添加的频道');
      return;
    }

    const defaultCategory = formData.category || '其他';

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: batchContent,
          mode: 'append',
          defaultCategory,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const result = data.data;
        let message = `批量添加完成！\n成功: ${result.imported} 个\n跳过: ${result.skipped} 个`;

        if (result.errors.length > 0 && result.errors.length <= 5) {
          message += '\n\n错误:\n' + result.errors.join('\n');
        } else if (result.errors.length > 5) {
          message += '\n\n部分错误:\n' + result.errors.slice(0, 5).join('\n') + `\n...还有 ${result.errors.length - 5} 个错误`;
        }

        alert(message);

        if (result.imported > 0) {
          setShowAddModal(false);
          setBatchContent('');
          setFormData({ name: '', url: '', category: '' });
          await fetchData(); // 刷新列表
        }
      } else {
        alert(data.error || '批量添加失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleUpdateChannel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingChannel) return;

    try {
      const response = await fetch('/api/channels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingChannel.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChannels(channels.map(ch => ch.id === editingChannel.id ? data.data : ch));
        setEditingChannel(null);
        setFormData({ name: '', url: '', category: '' });
        alert('更新成功！');
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm('确定要删除这个频道吗？')) return;

    try {
      const response = await fetch(`/api/channels?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setChannels(channels.filter(ch => ch.id !== id));
        alert('删除成功！');
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const openEditModal = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      url: channel.url,
      category: channel.category,
    });
  };

  const handleToggleChannel = (channelId: string) => {
    const newSelected = new Set(selectedChannels);
    if (newSelected.has(channelId)) {
      newSelected.delete(channelId);
    } else {
      newSelected.add(channelId);
    }
    setSelectedChannels(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedChannels.size === filteredChannels.length) {
      setSelectedChannels(new Set());
    } else {
      setSelectedChannels(new Set(filteredChannels.map(ch => ch.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedChannels.size === 0) {
      alert('请至少选择一个频道');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedChannels.size} 个频道吗？`)) return;

    try {
      // 使用批量删除 API，只消耗 1 次 GitHub API 配额
      const response = await fetch('/api/channels/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedChannels),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChannels(channels.filter(ch => !selectedChannels.has(ch.id)));
        setSelectedChannels(new Set());
        alert(data.message || `成功删除 ${selectedChannels.size} 个频道`);
      } else {
        alert(data.error || '批量删除失败');
        await fetchData();
      }
    } catch (error) {
      alert('网络错误');
      await fetchData();
    }
  };

  const filteredChannels = channels.filter(channel => {
    const matchesCategory = selectedCategory === 'all' || channel.category === selectedCategory;
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         channel.url.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">频道管理</h2>
          {selectedChannels.size > 0 && (
            <button
              onClick={handleBatchDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
            >
              删除选中 ({selectedChannels.size})
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          + 添加频道
        </button>
      </div>

      {/* 筛选和搜索 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分类筛选</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="all">全部分类</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">搜索</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索频道名称或 URL..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* 频道列表 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredChannels.length > 0 && selectedChannels.size === filteredChannels.length}
                    onChange={handleToggleAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  频道名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  分类
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredChannels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    暂无频道数据
                  </td>
                </tr>
              ) : (
                filteredChannels.map((channel) => (
                  <tr key={channel.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedChannels.has(channel.id)}
                        onChange={() => handleToggleChannel(channel.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{channel.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {channel.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 truncate max-w-md">{channel.url}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(channel)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteChannel(channel.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            共 <span className="font-medium">{filteredChannels.length}</span> 个频道
            {selectedCategory !== 'all' && ` (分类: ${selectedCategory})`}
          </p>
        </div>
      </div>

      {/* 添加/编辑模态框 */}
      {(showAddModal || editingChannel) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">
                {editingChannel ? '编辑频道' : '添加频道'}
              </h3>

              {/* 模式切换开关（仅在添加模式下显示） */}
              {!editingChannel && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">单个</span>
                  <button
                    type="button"
                    onClick={() => setIsBatchMode(!isBatchMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isBatchMode ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isBatchMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600">批量</span>
                </div>
              )}
            </div>

            <form onSubmit={editingChannel ? handleUpdateChannel : handleAddChannel} className="space-y-4">
              {/* 单个模式表单 */}
              {!isBatchMode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">频道名称</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">直播源 URL</label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                </>
              )}

              {/* 批量模式表单 */}
              {isBatchMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    批量添加频道
                    <span className="text-xs text-gray-500 ml-2">
                      (每行一个，格式：频道名称,URL 或 频道名称 URL)
                    </span>
                  </label>
                  <textarea
                    value={batchContent}
                    onChange={(e) => setBatchContent(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                    placeholder="示例：&#10;CCTV-1,http://example.com/cctv1.m3u8&#10;CCTV-2 http://example.com/cctv2.m3u8"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 支持格式：<br />
                    • 逗号分隔：CCTV-1,http://example.com/cctv1.m3u8<br />
                    • 空格分隔：CCTV-1 http://example.com/cctv1.m3u8
                  </p>
                </div>
              )}

              {/* 分类选择（两种模式都需要） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBatchMode ? '默认分类' : '分类'}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value="">选择分类</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingChannel(null);
                    setFormData({ name: '', url: '', category: '' });
                    setIsBatchMode(false);
                    setBatchContent('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingChannel ? '更新' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
