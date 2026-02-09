'use client';

import { useEffect, useState } from 'react';
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
import type { Category } from '@/types';

// 可排序的分类项组件
interface SortableCategoryItemProps {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableCategoryItem({ category, onEdit, onDelete }: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition flex items-center gap-4 ${
        isDragging ? 'bg-indigo-50 shadow-lg' : 'bg-white'
      }`}
    >
      {/* 拖拽手柄 */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-2"
        title="拖拽排序"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      {/* 分类信息 */}
      <div className="flex-1 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-indigo-600 hover:text-indigo-900 text-sm px-3 py-1"
          >
            编辑
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-900 text-sm px-3 py-1"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');

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

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();

      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(cat => cat.id === active.id);
    const newIndex = categories.findIndex(cat => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // 更新本地状态
    const newCategories = arrayMove(categories, oldIndex, newIndex);
    // 更新 order 字段
    newCategories.forEach((cat, idx) => {
      cat.order = idx;
    });
    setCategories(newCategories);

    // 保存到后端
    try {
      const response = await fetch('/api/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: newCategories }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || '排序失败');
        fetchCategories();
      }
    } catch (error) {
      alert('网络错误');
      fetchCategories();
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName }),
      });

      const data = await response.json();

      if (data.success) {
        setCategories([...categories, data.data]);
        setShowAddModal(false);
        setFormName('');
        alert('添加成功！');
      } else {
        alert(data.error || '添加失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCategory) return;

    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCategory.id,
          name: formName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCategories(categories.map(cat => cat.id === editingCategory.id ? data.data : cat));
        setEditingCategory(null);
        setFormName('');
        alert('更新成功！');
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('确定要删除这个分类吗？该分类下的频道将被移到"其他"分类。')) return;

    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setCategories(categories.filter(cat => cat.id !== id));
        alert('删除成功！');
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">分类管理</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          + 添加分类
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {categories.length > 0 && (
          <div className="bg-indigo-50 px-6 py-2 border-b border-indigo-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <span className="text-sm text-indigo-700">拖拽排序已启用 - 拖动分类可调整顺序</span>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={categories.map(cat => cat.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-3 p-6">
              {categories.map((category) => (
                <SortableCategoryItem
                  key={category.id}
                  category={category}
                  onEdit={() => openEditModal(category)}
                  onDelete={() => handleDeleteCategory(category.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无分类，请添加
          </div>
        )}
      </div>

      {/* 添加/编辑模态框 */}
      {(showAddModal || editingCategory) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-6">
              {editingCategory ? '编辑分类' : '添加分类'}
            </h3>

            <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分类名称</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="例如：央视频道"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCategory(null);
                    setFormName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingCategory ? '更新' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
