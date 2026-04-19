
import React from 'react';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, List } from 'lucide-react';
import { StoryboardItem, AspectRatio, GeminiModel } from '../types';
import StoryboardRow from './StoryboardRow';

interface EditorTabProps {
  items: StoryboardItem[];
  onUpdate: (items: StoryboardItem[]) => void;
  model: GeminiModel;
  ratio: AspectRatio;
  isAnyGenerating: boolean;
}

const EditorTab: React.FC<EditorTabProps> = ({ items, onUpdate, model, ratio, isAnyGenerating }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const reorderedItems = arrayMove(items, oldIndex, newIndex).map((item: StoryboardItem, idx: number) => ({
        ...item,
        cutNumber: idx + 1,
      }));
      onUpdate(reorderedItems);
    }
  };

  const addRow = () => {
    const newItem: StoryboardItem = {
      id: Math.random().toString(36).substr(2, 9),
      cutNumber: items.length + 1,
      context: '',
      isGenerating: false,
    };
    onUpdate([...items, newItem]);
  };

  const removeItem = (id: string) => {
    const filtered = items.filter(item => item.id !== id).map((item: StoryboardItem, idx: number) => ({
      ...item,
      cutNumber: idx + 1
    }));
    onUpdate(filtered);
  };

  const updateItem = (id: string, updates: Partial<StoryboardItem>) => {
    onUpdate(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    onUpdate(arrayMove(items, index, index - 1).map((item: StoryboardItem, idx: number) => ({ ...item, cutNumber: idx + 1 })));
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    onUpdate(arrayMove(items, index, index + 1).map((item: StoryboardItem, idx: number) => ({ ...item, cutNumber: idx + 1 })));
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-[80px_320px_1fr] gap-6 mb-4 px-6 py-4 bg-[#1e1e1e] border border-white/5 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-widest items-center sticky top-[56px] z-10 backdrop-blur-xl">
        <div className="flex items-center gap-2"><List size={14} /><span>Cut</span></div>
        <div>Visual Representation</div>
        <div>Story Details & Context</div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.map((item, index) => (
              <StoryboardRow 
                key={item.id} 
                item={item} 
                index={index}
                total={items.length}
                onUpdate={(updates) => updateItem(item.id, updates)}
                onRemove={() => removeItem(item.id)}
                onMoveUp={() => moveUp(index)}
                onMoveDown={() => moveDown(index)}
                model={model}
                ratio={ratio}
                allItems={items}
                isAnyGenerating={isAnyGenerating}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>

      <button
        onClick={addRow}
        disabled={isAnyGenerating}
        className="w-full py-10 border-2 border-dashed border-white/10 bg-white/2 rounded-3xl flex flex-col items-center justify-center gap-3 text-white/20 hover:text-white hover:border-white/40 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
      >
        <div className="p-4 bg-white/5 rounded-full group-hover:bg-white group-hover:text-black transition-all shadow-xl">
          <Plus size={32} />
        </div>
        <span className="font-bold tracking-tight uppercase text-xs">Insert Next Cut</span>
      </button>
    </div>
  );
};

export default EditorTab;
