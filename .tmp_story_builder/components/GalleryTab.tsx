
import React, { useState, useRef } from 'react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StoryboardItem, AspectRatio } from '../types';
import { ImageOff, Trash2, GripHorizontal, LayoutGrid, List, Printer } from 'lucide-react';

interface GalleryTabProps {
  items: StoryboardItem[];
  onUpdate: (items: StoryboardItem[]) => void;
  ratio: AspectRatio;
}

const SortableGalleryItem = ({ 
  item, 
  onRemove,
  ratio
}: { 
  item: StoryboardItem; 
  onRemove: () => void;
  ratio: AspectRatio;
  key?: string;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const getAspectClass = () => {
    switch(ratio) {
      case '16:9': return 'aspect-video';
      case '4:3': return 'aspect-[4/3]';
      case '1:1': return 'aspect-square';
      case '3:4': return 'aspect-[3/4]';
      case '9:16': return 'aspect-[9/16]';
      default: return 'aspect-video';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col gap-3 bg-[#1a1a1a] p-3 rounded-2xl border border-white/5 transition-all ${
        isDragging ? 'opacity-50 scale-105 shadow-2xl z-50' : 'hover:border-white/20'
      }`}
    >
      <div className={`relative ${getAspectClass()} bg-black border border-white/5 rounded-xl overflow-hidden flex items-start justify-center`}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="Cut" className="w-full h-full object-contain" style={{ objectPosition: 'top' }} />
        ) : (
          <div className="flex flex-col items-center justify-center text-white/10">
            <ImageOff size={32} />
          </div>
        )}

        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
          <div {...attributes} {...listeners} className="self-end p-2 bg-white/10 rounded-lg cursor-grab text-white hover:bg-white hover:text-black">
            <GripHorizontal size={18} />
          </div>
          <button onClick={onRemove} className="self-center bg-red-500 hover:bg-red-600 text-white p-3 rounded-2xl shadow-lg">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 px-1">
        <div className="flex justify-between items-center">
          <span className="text-sm font-black text-white">#{item.cutNumber.toString().padStart(2, '0')}</span>
          <div className="h-1.5 w-1.5 rounded-full bg-white/10 group-hover:bg-white" />
        </div>
        <p className="text-[11px] text-white/40 line-clamp-2 leading-tight h-8 font-medium italic">
          {item.context || 'Untitled Scene'}
        </p>
      </div>
    </div>
  );
};

const SortableStoryboardItem = ({ 
  item, 
  onRemove,
  ratio
}: { 
  item: StoryboardItem; 
  onRemove: () => void;
  ratio: AspectRatio;
  key?: string;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const getAspectClass = () => {
    switch(ratio) {
      case '16:9': return 'aspect-video';
      case '4:3': return 'aspect-[4/3]';
      case '1:1': return 'aspect-square';
      case '3:4': return 'aspect-[3/4]';
      case '9:16': return 'aspect-[9/16]';
      default: return 'aspect-video';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex gap-6 bg-[#1a1a1a] p-4 rounded-3xl border border-white/5 transition-all ${
        isDragging ? 'opacity-50 scale-[1.02] shadow-2xl z-50' : 'hover:border-white/20'
      }`}
    >
      <div className={`relative w-1/3 min-w-[200px] ${getAspectClass()} bg-black border border-white/5 rounded-2xl overflow-hidden flex items-start justify-center shrink-0 self-start`}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="Cut" className="w-full h-full object-contain" style={{ objectPosition: 'top' }} />
        ) : (
          <div className="flex flex-col items-center justify-center text-white/10">
            <ImageOff size={48} />
          </div>
        )}

        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
          <div {...attributes} {...listeners} className="self-end p-3 bg-white/10 rounded-xl cursor-grab text-white hover:bg-white hover:text-black">
            <GripHorizontal size={20} />
          </div>
          <button onClick={onRemove} className="self-center bg-red-500 hover:bg-red-600 text-white p-4 rounded-2xl shadow-lg">
            <Trash2 size={24} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 py-2 flex-1">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <span className="text-2xl font-black text-white tracking-tighter">Cut #{item.cutNumber.toString().padStart(2, '0')}</span>
        </div>
        <p className="text-base text-white/80 leading-relaxed whitespace-pre-wrap">
          {item.context || 'Untitled Scene'}
        </p>
      </div>
    </div>
  );
};

const GalleryTab: React.FC<GalleryTabProps> = ({ items, onUpdate, ratio }) => {
  const [layoutMode, setLayoutMode] = useState<'grid' | 'storyboard'>('grid');
  const [gridColumns, setGridColumns] = useState<number>(4);
  const printRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onUpdate(arrayMove(items, oldIndex, newIndex).map((item: StoryboardItem, idx: number) => ({ ...item, cutNumber: idx + 1 })));
    }
  };

  const removeItem = (id: string) => {
    onUpdate(items.filter(item => item.id !== id).map((item: StoryboardItem, idx: number) => ({ ...item, cutNumber: idx + 1 })));
  };

  const handlePrint = (includeText: boolean) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print the storyboard.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Storyboard Print</title>
          <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
          <style>
            @page { margin: 20px; }
            body { 
              font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
              padding: 20px; 
              background: white; 
              color: black; 
              margin: 0;
            }
            .grid { 
              display: grid; 
              gap: 20px; 
            }
            .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
            .grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
            .grid-cols-7 { grid-template-columns: repeat(7, minmax(0, 1fr)); }
            .grid-cols-8 { grid-template-columns: repeat(8, minmax(0, 1fr)); }
            
            .storyboard-row { 
              display: flex; 
              gap: 30px; 
              height: 30vh;
              min-height: 300px;
              margin-bottom: 20px; 
              page-break-inside: avoid; 
              border-bottom: 1px solid #ddd; 
              padding-bottom: 20px; 
              box-sizing: border-box;
            }
            .storyboard-img-container { 
              flex: 0 0 45%; 
              max-width: 45%; 
              background: #fff;
              border: 1px solid #000;
              border-radius: 0;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .storyboard-text { 
              flex: 1; 
            }
            img { 
              width: 100%; 
              height: 100%; 
              object-fit: contain; 
              display: block;
            }
            .item-container { 
              page-break-inside: avoid; 
              border: 1px solid #ddd; 
              padding: 15px; 
              border-radius: 8px; 
              background: #fff;
            }
            .img-wrapper {
              background: #f8f9fa;
              border: 1px solid #e9ecef;
              border-radius: 4px;
              margin-bottom: 12px;
              overflow: hidden;
              aspect-ratio: ${ratio === '16:9' ? '16/9' : ratio === '4:3' ? '4/3' : ratio === '1:1' ? '1/1' : ratio === '3:4' ? '3/4' : '9/16'};
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .cut-number { 
              font-weight: 800; 
              font-size: 1.1em; 
              margin-bottom: 4px; 
              color: #000;
              letter-spacing: -0.02em;
            }
            .context { 
              white-space: pre-wrap; 
              font-size: 0.9em;
              color: #444;
              line-height: 1.5;
            }
            .no-image {
              padding: 40px;
              color: #adb5bd;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          ${layoutMode === 'grid' ? `
            <div class="grid grid-cols-${gridColumns}">
              ${items.map(item => `
                <div class="item-container">
                  <div class="img-wrapper">
                    ${item.imageUrl ? `<img src="${item.imageUrl}" />` : `<div class="no-image">No Image</div>`}
                  </div>
                  <div class="cut-number">Cut #${item.cutNumber.toString().padStart(2, '0')}</div>
                  ${includeText ? `<div class="context">${item.context || 'Untitled Scene'}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : `
            <div>
              ${items.map(item => `
                <div class="storyboard-row">
                  <div class="storyboard-img-container" style="aspect-ratio: ${ratio === '16:9' ? '16/9' : ratio === '4:3' ? '4/3' : ratio === '1:1' ? '1/1' : ratio === '3:4' ? '3/4' : '9/16'};">
                    ${item.imageUrl ? `<img src="${item.imageUrl}" />` : `<div class="no-image">No Image</div>`}
                  </div>
                  <div class="storyboard-text">
                    <div class="cut-number">Cut #${item.cutNumber.toString().padStart(2, '0')}</div>
                    ${includeText ? `<div class="context">${item.context || 'Untitled Scene'}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 800);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
        <ImageOff size={48} className="mb-4" />
        <p className="text-lg font-bold text-white/40 uppercase tracking-widest">Story empty</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 sticky top-[56px] z-10 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex bg-black/50 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-2 rounded-lg flex items-center gap-2 transition-all ${layoutMode === 'grid' ? 'bg-white text-black shadow-sm' : 'text-white/40 hover:text-white'}`}
            >
              <LayoutGrid size={16} />
              <span className="text-sm font-bold">Grid</span>
            </button>
            <button
              onClick={() => setLayoutMode('storyboard')}
              className={`p-2 rounded-lg flex items-center gap-2 transition-all ${layoutMode === 'storyboard' ? 'bg-white text-black shadow-sm' : 'text-white/40 hover:text-white'}`}
            >
              <List size={16} />
              <span className="text-sm font-bold">Storyboard</span>
            </button>
          </div>

          {layoutMode === 'grid' && (
            <div className="flex items-center gap-3 px-4 border-l border-white/10">
              <span className="text-sm font-bold text-white/60 w-20">Cols: {gridColumns}</span>
              <input 
                type="range" 
                min="1" 
                max="8" 
                value={gridColumns} 
                onChange={(e) => setGridColumns(Number(e.target.value))}
                className="w-32 accent-white"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePrint(false)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20 rounded-xl text-sm font-bold transition-all active:scale-95"
          >
            <Printer size={16} />
            Images Only
          </button>
          <button
            onClick={() => handlePrint(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-white/90 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
          >
            <Printer size={16} />
            With Text
          </button>
        </div>
      </div>

      <div ref={printRef}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={rectSortingStrategy}>
            {layoutMode === 'grid' ? (
              <div 
                className="grid gap-6 transition-all duration-300" 
                style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
              >
                {items.map((item) => (
                  <SortableGalleryItem key={item.id} item={item} onRemove={() => removeItem(item.id)} ratio={ratio} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {items.map((item) => (
                  <SortableStoryboardItem key={item.id} item={item} onRemove={() => removeItem(item.id)} ratio={ratio} />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default GalleryTab;
