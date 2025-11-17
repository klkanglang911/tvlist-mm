'use client';

import { useEffect, useState } from 'react';
import type { ScheduleConfig, WebhookConfig } from '@/types';

export default function SettingsPage() {
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // 对话框状态
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);

  // 表单状态
  const [scheduleForm, setScheduleForm] = useState({
    enabled: false,
    scheduleTime: '13:00',
    timezone: 'Asia/Shanghai',
  });

  const [webhookForm, setWebhookForm] = useState({
    type: 'wechat' as WebhookConfig['type'],
    url: '',
    enabled: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [scheduleRes, webhooksRes] = await Promise.all([
        fetch('/api/schedule'),
        fetch('/api/webhook'),
      ]);

      const scheduleData = await scheduleRes.json();
      const webhooksData = await webhooksRes.json();

      if (scheduleData.success) {
        setScheduleConfig(scheduleData.data);
        setScheduleForm({
          enabled: scheduleData.data.enabled,
          scheduleTime: scheduleData.data.scheduleTime,
          timezone: scheduleData.data.timezone,
        });
      }

      if (webhooksData.success) {
        setWebhooks(webhooksData.data);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm),
      });

      const data = await response.json();

      if (data.success) {
        setScheduleConfig(data.data);
        setShowScheduleModal(false);
        alert('定时任务配置已更新！');
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookForm),
      });

      const data = await response.json();

      if (data.success) {
        setWebhooks([...webhooks, data.data]);
        setShowWebhookModal(false);
        setWebhookForm({ type: 'wechat', url: '', enabled: true });
        alert('Webhook 添加成功！');
      } else {
        alert(data.error || '添加失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleUpdateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingWebhook) return;

    try {
      const response = await fetch('/api/webhook', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingWebhook.id,
          ...webhookForm,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchData();
        setShowWebhookModal(false);
        setEditingWebhook(null);
        setWebhookForm({ type: 'wechat', url: '', enabled: true });
        alert('Webhook 更新成功！');
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('确定要删除这个 Webhook 吗？')) return;

    try {
      const response = await fetch(`/api/webhook?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setWebhooks(webhooks.filter(w => w.id !== id));
        alert('删除成功！');
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      const response = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (data.success) {
        alert('测试消息已发送！请查看对应平台');
      } else {
        alert(data.error || '测试失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const openEditWebhookModal = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setWebhookForm({
      type: webhook.type,
      url: webhook.url,
      enabled: webhook.enabled,
    });
    setShowWebhookModal(true);
  };

  const getWebhookTypeName = (type: WebhookConfig['type']): string => {
    const names = {
      wechat: '企业微信',
      dingtalk: '钉钉',
      feishu: '飞书',
      custom: '自定义',
    };
    return names[type];
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">系统设置</h2>

      {/* 定时任务配置 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">定时任务配置</h3>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
          >
            编辑配置
          </button>
        </div>

        {scheduleConfig && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">状态:</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                scheduleConfig.enabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {scheduleConfig.enabled ? '✓ 已启用' : '✗ 已禁用'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">执行时间:</span>
              <span className="text-sm text-gray-900">
                每天 {scheduleConfig.scheduleTime} ({scheduleConfig.timezone})
              </span>
            </div>
            {scheduleConfig.lastRunAt && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">上次运行:</span>
                <span className="text-sm text-gray-600">
                  {new Date(scheduleConfig.lastRunAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                </span>
              </div>
            )}
            {scheduleConfig.nextRunAt && scheduleConfig.enabled && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">下次运行:</span>
                <span className="text-sm text-gray-600">
                  {new Date(scheduleConfig.nextRunAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Webhook 配置 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Webhook 通知配置</h3>
          <button
            onClick={() => {
              setEditingWebhook(null);
              setWebhookForm({ type: 'wechat', url: '', enabled: true });
              setShowWebhookModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
          >
            + 添加 Webhook
          </button>
        </div>

        {webhooks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无 Webhook 配置</p>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-gray-900">
                      {getWebhookTypeName(webhook.type)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      webhook.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {webhook.enabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate max-w-md">
                    {webhook.url}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTestWebhook(webhook.id)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                  >
                    测试
                  </button>
                  <button
                    onClick={() => openEditWebhookModal(webhook)}
                    className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded transition"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(webhook.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 定时任务配置对话框 */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-6">定时任务配置</h3>

            <form onSubmit={handleUpdateSchedule} className="space-y-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={scheduleForm.enabled}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, enabled: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">启用定时任务</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  执行时间
                </label>
                <input
                  type="time"
                  value={scheduleForm.scheduleTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduleTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">每天在此时间自动测试所有频道</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  时区
                </label>
                <select
                  value={scheduleForm.timezone}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, timezone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Asia/Shanghai">中国标准时间 (Asia/Shanghai)</option>
                  <option value="Asia/Hong_Kong">香港时间 (Asia/Hong_Kong)</option>
                  <option value="Asia/Taipei">台北时间 (Asia/Taipei)</option>
                  <option value="UTC">UTC 时间</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Webhook 配置对话框 */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-6">
              {editingWebhook ? '编辑 Webhook' : '添加 Webhook'}
            </h3>

            <form onSubmit={editingWebhook ? handleUpdateWebhook : handleAddWebhook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  类型
                </label>
                <select
                  value={webhookForm.type}
                  onChange={(e) => setWebhookForm({ ...webhookForm, type: e.target.value as WebhookConfig['type'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value="wechat">企业微信</option>
                  <option value="dingtalk">钉钉</option>
                  <option value="feishu">飞书</option>
                  <option value="custom">自定义</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookForm.url}
                  onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="https://..."
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={webhookForm.enabled}
                    onChange={(e) => setWebhookForm({ ...webhookForm, enabled: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">启用此 Webhook</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowWebhookModal(false);
                    setEditingWebhook(null);
                    setWebhookForm({ type: 'wechat', url: '', enabled: true });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingWebhook ? '更新' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
