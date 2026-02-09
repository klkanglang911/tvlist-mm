'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Channel, Category, TestProgress, ScheduleConfig, WebhookConfig } from '@/types';

// 可排序的频道行组件
interface SortableChannelRowProps {
  channel: Channel;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getStatusBadge: (channel: Channel) => React.ReactNode;
  isDraggable: boolean;
}

function SortableChannelRow({
  channel,
  isSelected,
  onToggle,
  onEdit,
  onDelete,
  getStatusBadge,
  isDraggable,
}: SortableChannelRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: channel.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50 ${isDragging ? 'bg-indigo-50' : ''}`}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {isDraggable && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
              title="拖拽排序"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </button>
          )}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{channel.name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(channel)}
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
          onClick={onEdit}
          className="text-indigo-600 hover:text-indigo-900 mr-4"
        >
          编辑
        </button>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-900"
        >
          删除
        </button>
      </td>
    </tr>
  );
}

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

  // 测试相关状态
  const [testProgress, setTestProgress] = useState<TestProgress | null>(null);
  const [showTestProgress, setShowTestProgress] = useState(false);

  // 离线频道列表对话框
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  // 定时任务配置
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Webhook 配置
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [showWebhookModal, setShowWebhookModal] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    category: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  // 轮询测试进度
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (testProgress?.status === 'running') {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch('/api/channels/test');
          const data = await res.json();
          if (data.success) {
            setTestProgress(data.data);
            if (data.data.status !== 'running') {
              // 测试完成，刷新频道数据
              await fetchData();
            }
          }
        } catch (error) {
          console.error('获取测试进度失败:', error);
        }
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [testProgress?.status]);

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

  const handleStartTest = async (category?: string) => {
    const targetChannels = category
      ? channels.filter(ch => ch.category === category)
      : channels;

    if (targetChannels.length === 0) {
      alert(category ? `分类"${category}"下没有频道` : '没有频道可供测试');
      return;
    }

    try {
      const response = await fetch('/api/channels/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: category || null }),
      });

      const data = await response.json();

      if (data.success) {
        setTestProgress({
          total: data.total,
          completed: 0,
          results: [],
          status: 'running',
          startedAt: new Date().toISOString(),
        });
        setShowTestProgress(true);
      } else {
        alert(data.error || '启动测试失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleCancelTest = async () => {
    try {
      const response = await fetch('/api/channels/test', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || '取消测试失败');
      }
    } catch (error) {
      alert('网络错误');
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

  const getStatusBadge = (channel: Channel) => {
    const status = channel.status || 'unknown';
    const colors = {
      online: 'bg-green-100 text-green-800',
      offline: 'bg-red-100 text-red-800',
      unknown: 'bg-gray-100 text-gray-800',
      checking: 'bg-yellow-100 text-yellow-800',
    };
    const labels = {
      online: '在线',
      offline: '离线',
      unknown: '未检测',
      checking: '检测中',
    };

    return (
      <div className="flex flex-col">
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}>
          {labels[status]}
        </span>
        {channel.responseTime && status === 'online' && (
          <span className="text-xs text-gray-500 mt-1">{channel.responseTime}ms</span>
        )}
        {channel.lastCheckedAt && (
          <span className="text-xs text-gray-400 mt-1">
            {new Date(channel.lastCheckedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
          </span>
        )}
      </div>
    );
  };

  const filteredChannels = channels.filter(channel => {
    const matchesCategory = selectedCategory === 'all' || channel.category === selectedCategory;
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         channel.url.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 统计在线/离线数量
  const onlineCount = channels.filter(ch => ch.status === 'online').length;
  const offlineCount = channels.filter(ch => ch.status === 'offline').length;
  const offlineChannels = channels.filter(ch => ch.status === 'offline');

  // 拖拽排序相关
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 是否可以拖拽排序（只有选择具体分类且没有搜索词时才能排序）
  const canDragSort = selectedCategory !== 'all' && searchTerm === '';

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = filteredChannels.findIndex(ch => ch.id === active.id);
    const newIndex = filteredChannels.findIndex(ch => ch.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // 更新本地状态
    const newFilteredChannels = arrayMove(filteredChannels, oldIndex, newIndex);

    // 更新完整频道列表（只更新当前分类的频道顺序）
    const otherChannels = channels.filter(ch => ch.category !== selectedCategory);
    setChannels([...otherChannels, ...newFilteredChannels]);

    // 调用 API 保存排序
    try {
      const channelIds = newFilteredChannels.map(ch => ch.id);
      const response = await fetch('/api/channels/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory,
          channelIds,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        alert(data.error || '保存排序失败');
        // 恢复数据
        await fetchData();
      }
    } catch (error) {
      alert('网络错误');
      await fetchData();
    }
  };

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
        <div className="flex gap-3">
          <button
            onClick={() => handleStartTest()}
            disabled={testProgress?.status === 'running'}
            className={`px-4 py-2 rounded-lg transition ${
              testProgress?.status === 'running'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {testProgress?.status === 'running' ? '测试中...' : '测试所有频道'}
          </button>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => handleStartTest(selectedCategory)}
              disabled={testProgress?.status === 'running'}
              className={`px-4 py-2 rounded-lg transition ${
                testProgress?.status === 'running'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              测试当前分类
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            + 添加频道
          </button>
        </div>
      </div>

      {/* 状态统计 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{channels.length}</div>
            <div className="text-sm text-gray-500">总频道数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
            <div className="text-sm text-gray-500">在线</div>
          </div>
          <div
            className="text-center cursor-pointer hover:bg-red-50 rounded-lg transition p-2"
            onClick={() => offlineCount > 0 && setShowOfflineModal(true)}
            title={offlineCount > 0 ? "点击查看离线频道列表" : ""}
          >
            <div className="text-2xl font-bold text-red-600">{offlineCount}</div>
            <div className="text-sm text-gray-500">
              离线 {offlineCount > 0 && <span className="text-xs text-red-600">▸</span>}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {channels.length > 0 ? ((onlineCount / channels.length) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-gray-500">在线率</div>
          </div>
        </div>
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
        {canDragSort && (
          <div className="bg-indigo-50 px-6 py-2 border-b border-indigo-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <span className="text-sm text-indigo-700">拖拽排序已启用 - 拖动行可调整频道顺序</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <div className="flex items-center gap-2">
                      {canDragSort && <span className="w-4"></span>}
                      <input
                        type="checkbox"
                        checked={filteredChannels.length > 0 && selectedChannels.size === filteredChannels.length}
                        onChange={handleToggleAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    频道名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
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
              <SortableContext
                items={filteredChannels.map(ch => ch.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredChannels.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        暂无频道数据
                      </td>
                    </tr>
                  ) : (
                    filteredChannels.map((channel) => (
                      <SortableChannelRow
                        key={channel.id}
                        channel={channel}
                        isSelected={selectedChannels.has(channel.id)}
                        onToggle={() => handleToggleChannel(channel.id)}
                        onEdit={() => openEditModal(channel)}
                        onDelete={() => handleDeleteChannel(channel.id)}
                        getStatusBadge={getStatusBadge}
                        isDraggable={canDragSort}
                      />
                    ))
                  )}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>

        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            共 <span className="font-medium">{filteredChannels.length}</span> 个频道
            {selectedCategory !== 'all' && ` (分类: ${selectedCategory})`}
          </p>
        </div>
      </div>

      {/* 测试进度对话框 */}
      {showTestProgress && testProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold mb-4">频道测试进度</h3>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>进度: {testProgress.completed}/{testProgress.total}</span>
                <span>
                  {testProgress.status === 'running'
                    ? '测试中...'
                    : testProgress.status === 'completed'
                    ? '已完成'
                    : testProgress.status === 'cancelled'
                    ? '已取消'
                    : '空闲'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-indigo-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${(testProgress.completed / testProgress.total) * 100}%` }}
                />
              </div>
            </div>

            {testProgress.current && (
              <p className="text-sm text-gray-600 mb-4">
                正在测试: <span className="font-medium">{testProgress.current}</span>
              </p>
            )}

            {testProgress.status !== 'running' && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">测试结果:</h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {testProgress.results.filter(r => r.status === 'online').length}
                    </div>
                    <div className="text-sm text-green-700">在线</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <div className="text-2xl font-bold text-red-600">
                      {testProgress.results.filter(r => r.status === 'offline').length}
                    </div>
                    <div className="text-sm text-red-700">离线</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {testProgress.status === 'running' ? (
                <button
                  onClick={handleCancelTest}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  取消测试
                </button>
              ) : (
                <button
                  onClick={() => setShowTestProgress(false)}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  关闭
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
                    支持格式：<br />
                    逗号分隔：CCTV-1,http://example.com/cctv1.m3u8<br />
                    空格分隔：CCTV-1 http://example.com/cctv1.m3u8
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

      {/* 离线频道列表对话框 */}
      {showOfflineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">离线频道列表</h3>
              <button
                onClick={() => setShowOfflineModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-4 text-sm text-gray-600">
              共 <span className="font-bold text-red-600">{offlineChannels.length}</span> 个频道离线
            </div>

            <div className="flex-1 overflow-y-auto">
              {offlineChannels.length === 0 ? (
                <p className="text-center text-gray-500 py-8">暂无离线频道</p>
              ) : (
                <div className="space-y-3">
                  {offlineChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="border border-red-200 rounded-lg p-4 hover:bg-red-50 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">{channel.name}</h4>
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {channel.category}
                            </span>
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              离线
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1 break-all">
                            <span className="font-medium">URL:</span> {channel.url}
                          </p>
                          {channel.errorMessage && (
                            <p className="text-sm text-red-600 mb-1">
                              <span className="font-medium">错误:</span> {channel.errorMessage}
                            </p>
                          )}
                          {channel.lastCheckedAt && (
                            <p className="text-xs text-gray-400">
                              最后检测时间: {new Date(channel.lastCheckedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              openEditModal(channel);
                              setShowOfflineModal(false);
                            }}
                            className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded transition"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`确定要删除频道"${channel.name}"吗？`)) {
                                handleDeleteChannel(channel.id);
                                setShowOfflineModal(false);
                              }
                            }}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowOfflineModal(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
