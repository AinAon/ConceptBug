
import React, { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Wand2, Trash2, Download, ChevronUp, ChevronDown, Loader2, Image as ImageIcon, X, Plus, Upload, ZoomIn, Pen } from 'lucide-react';
import { StoryboardItem, AspectRatio, GeminiModel } from '../types';
import { generateSketchImage } from '../services/geminiService';
import DrawingModal from './DrawingModal';

interface StoryboardRowProps {
  item: StoryboardItem;
  index: number;
  total: number;
  onUpdate: (updates: Partial<StoryboardItem>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  model: GeminiModel;
  ratio: AspectRatio;
  allItems: StoryboardItem[];
  isAnyGenerating: boolean;
}

const StoryboardRow: React.FC<StoryboardRowProps> = ({ 
  item, index, total, onUpdate, onRemove, onMoveUp, onMoveDown, model, ratio, allItems, isAnyGenerating 
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const generationIdRef = useRef<number>(0);
  const [isZoomed, setIsZoomed] = React.useState(false);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [item.context]);

  // Dynamic height calculation based on fixed width (320px)
  const getPreviewHeight = () => {
    const width = 320;
    switch (ratio) {
      case '16:9': return (9 / 16) * width;
      case '4:3': return (3 / 4) * width;
      case '1:1': return width;
      case '3:4': return (4 / 3) * width;
      case '9:16': return (16 / 9) * width;
      default: return 240;
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (item.imageUrl || !e.target.files?.[0]) return;
    const file = e.target.files[0] as File;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onUpdate({ imageUrl: event.target?.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleThumbnailDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (item.imageUrl) return;

    const files = Array.from(e.dataTransfer.files) as File[];
    const imageFile = files.find(f => f.type.startsWith('image/'));
    if (!imageFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onUpdate({ imageUrl: event.target?.result as string });
    };
    reader.readAsDataURL(imageFile);
  };

  const handleCancel = () => {
    generationIdRef.current += 1;
    onUpdate({ isGenerating: false });
  };

  const handleGenerate = async () => {
    if (!item.context.trim()) return;
    const currentId = ++generationIdRef.current;
    onUpdate({ isGenerating: true });
    try {
      const url = await generateSketchImage(item.context, model, ratio, item.referenceImages, item.sketchImage);
      
      if (currentId === generationIdRef.current) {
        onUpdate({ imageUrl: url, isGenerating: false });
      }
    } catch (error: any) {
      if (currentId === generationIdRef.current) {
        onUpdate({ isGenerating: false });
        if (error.message === 'API_KEY_RESET_REQUIRED') {
          window.aistudio.openSelectKey();
        } else {
          alert("Failed to generate sketch. Please check your connection.");
        }
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    await processFiles(files);
    e.target.value = ''; // Reset input
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    
    const draggedImageUrl = e.dataTransfer.getData('text/plain');
    if (draggedImageUrl && draggedImageUrl.startsWith('data:image/')) {
      const currentRefs = item.referenceImages || [];
      if (currentRefs.length < 5) {
        onUpdate({ referenceImages: [...currentRefs, draggedImageUrl] });
      }
      return;
    }

    if (!e.dataTransfer.files) return;
    const files = Array.from(e.dataTransfer.files) as File[];
    await processFiles(files);
  };

  const handleReplaceDrop = async (e: React.DragEvent<HTMLDivElement>, indexToReplace: number) => {
    e.preventDefault();

    const draggedImageUrl = e.dataTransfer.getData('text/plain');
    if (draggedImageUrl && draggedImageUrl.startsWith('data:image/')) {
      const newRefs = [...(item.referenceImages || [])];
      newRefs[indexToReplace] = draggedImageUrl;
      onUpdate({ referenceImages: newRefs });
      return;
    }

    if (!e.dataTransfer.files) return;
    const files = Array.from(e.dataTransfer.files) as File[];
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const file = validFiles[0] as File;
    const reader = new FileReader();
    reader.onload = (event) => {
      const newBase64 = event.target?.result as string;
      const newRefs = [...(item.referenceImages || [])];
      newRefs[indexToReplace] = newBase64;
      onUpdate({ referenceImages: newRefs });
    };
    reader.readAsDataURL(file);
  };

  const processFiles = async (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    const currentRefs = item.referenceImages || [];
    const availableSlots = 5 - currentRefs.length;
    const filesToProcess = validFiles.slice(0, availableSlots);

    if (filesToProcess.length === 0) return;

    const newBase64Images = await Promise.all(filesToProcess.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }));

    onUpdate({ referenceImages: [...currentRefs, ...newBase64Images] });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group grid grid-cols-[80px_320px_1fr] gap-6 p-6 bg-[#1a1a1a] border rounded-3xl transition-all duration-300 ${
        isDragging ? 'opacity-40 shadow-2xl scale-[1.01] border-white/20' : 'shadow-sm border-white/5 hover:border-white/10 hover:shadow-xl'
      }`}
    >
      {/* Col 1: Number & Reorder */}
      <div className="flex flex-col items-center justify-between py-2 border-r border-white/5 pr-4">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 text-white/10 hover:text-white hover:bg-white/5 rounded-xl">
          <GripVertical size={24} />
        </div>
        <div className="text-3xl font-black text-white tabular-nums tracking-tighter">
          {item.cutNumber.toString().padStart(2, '0')}
        </div>
        <div className="flex flex-col gap-1">
          <button onClick={onMoveUp} disabled={index === 0} className={`p-1 rounded-lg ${index === 0 ? 'text-white/5' : 'text-white/20 hover:text-white'}`}>
            <ChevronUp size={24} />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} className={`p-1 rounded-lg ${index === total - 1 ? 'text-white/5' : 'text-white/20 hover:text-white'}`}>
            <ChevronDown size={24} />
          </button>
        </div>
      </div>

      {/* Col 2: Image Preview with Aspect Ratio */}
      <div 
        className={`relative bg-black rounded-2xl overflow-hidden shadow-inner border transition-all self-start ${
          !item.imageUrl ? 'cursor-pointer hover:border-white/20 hover:bg-white/[0.02]' : 'border-white/5'
        } group/image`}
        style={{ width: '320px', height: `${getPreviewHeight()}px` }}
        onClick={() => !item.imageUrl && !item.isGenerating && thumbnailInputRef.current?.click()}
        onDragOver={(e) => {
          if (!item.imageUrl) {
            e.preventDefault();
            e.currentTarget.classList.add('border-white/40', 'bg-white/[0.05]');
          }
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('border-white/40', 'bg-white/[0.05]');
        }}
        onDrop={(e) => {
          e.currentTarget.classList.remove('border-white/40', 'bg-white/[0.05]');
          handleThumbnailDrop(e);
        }}
      >
        <input 
          type="file" 
          ref={thumbnailInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleThumbnailUpload} 
        />
        {item.imageUrl ? (
          <>
            <img 
              src={item.imageUrl} 
              alt="Cut Visual" 
              className="w-full h-full object-contain cursor-grab active:cursor-grabbing" 
              style={{ objectPosition: 'top' }}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', item.imageUrl!);
                e.dataTransfer.effectAllowed = 'copy';
              }}
            />
            <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover/image:opacity-100 transition-opacity">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomed(true);
                }}
                className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-xl backdrop-blur-md transition-all"
                title="Zoom"
              >
                <ZoomIn size={16} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = item.imageUrl!;
                  link.download = `cut_${item.cutNumber.toString().padStart(4, '0')}.jpg`;
                  link.click();
                }}
                className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-xl backdrop-blur-md transition-all"
                title="Download"
              >
                <Download size={16} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ imageUrl: undefined });
                }}
                className="bg-black/50 hover:bg-red-500/80 text-white p-2 rounded-xl backdrop-blur-md transition-all"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/5">
            {item.isGenerating ? (
              <div className="flex flex-col items-center">
                <Loader2 className="animate-spin text-white mb-3" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Synthesizing...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImageIcon size={48} strokeWidth={1} />
                <div className="flex items-center gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                  <Upload size={12} className="text-white/20" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Upload or Drop</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Col 3: Description & Generation */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest px-1">Cut Narration / Action</label>
          <textarea
            ref={textareaRef}
            placeholder="Type your story beats here..."
            value={item.context}
            onChange={(e) => onUpdate({ context: e.target.value })}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
            className="w-full p-3 bg-white/[0.02] border border-white/5 rounded-xl resize-none focus:bg-white/[0.05] focus:border-white/20 outline-none text-white text-sm leading-relaxed font-medium transition-all overflow-hidden min-h-[100px]"
          />
        </div>
        
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            {/* Sketch Image Button */}
            <button
              onClick={() => setIsDrawingModalOpen(true)}
              disabled={isAnyGenerating}
              className={`relative w-12 h-12 rounded-xl border transition-all flex items-center justify-center overflow-hidden ${
                item.sketchImage 
                  ? 'border-white/20 bg-white/5' 
                  : 'border-dashed border-white/20 hover:bg-white/5 hover:border-white/40'
              } ${isAnyGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={item.sketchImage ? "Edit sketch" : "Draw sketch"}
            >
              {item.sketchImage ? (
                <>
                  <img src={item.sketchImage} className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Pen size={14} className="text-white shadow-lg" />
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({ sketchImage: undefined });
                    }}
                    className="absolute top-0 right-0 p-0.5 bg-black/50 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </>
              ) : (
                <Pen size={16} className="text-white/40" />
              )}
            </button>

            {(item.referenceImages || []).map((img, i) => (
              <div 
                key={i} 
                className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 group/ref"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleReplaceDrop(e, i)}
              >
                <img src={img} className="w-full h-full object-cover" />
                <button 
                  onClick={() => {
                    const newRefs = [...(item.referenceImages || [])];
                    newRefs.splice(i, 1);
                    onUpdate({ referenceImages: newRefs });
                  }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/ref:opacity-100 transition-opacity"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            ))}
            {(!item.referenceImages || item.referenceImages.length < 5) && (
              <label 
                onDragOver={(e) => e.preventDefault()}
                onDrop={isAnyGenerating ? undefined : handleDrop}
                className={`w-12 h-12 rounded-xl border border-dashed border-white/20 flex items-center justify-center transition-colors ${isAnyGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5 hover:border-white/40'}`}
                title="Upload reference image"
              >
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={isAnyGenerating} />
                <Plus size={16} className="text-white/40" />
              </label>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={item.isGenerating ? handleCancel : handleGenerate}
              disabled={(!item.isGenerating && isAnyGenerating) || (!item.isGenerating && !item.context.trim())}
              className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black uppercase tracking-tighter text-sm transition-all shadow-xl active:scale-[0.98] ${
                item.isGenerating 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-white hover:bg-white/90 disabled:bg-white/10 disabled:text-white/20 text-black'
              }`}
            >
              {item.isGenerating ? <X size={20} /> : <Wand2 size={20} />}
              {item.isGenerating ? 'Cancel' : (item.imageUrl ? 'Redesign' : 'Generate')}
            </button>
            <button
              onClick={onRemove}
              disabled={isAnyGenerating}
              className="flex items-center justify-center bg-white hover:bg-red-500 disabled:bg-white/10 disabled:text-white/20 text-black hover:text-white p-3.5 rounded-2xl transition-all shadow-xl active:scale-[0.98]"
              title="Discard"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center gap-4">
            <img 
              src={item.imageUrl} 
              alt="Zoomed Visual" 
              className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg"
            />
            <div className="bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10 text-center">
              <p className="text-white font-black text-xl tracking-tighter mb-1">Cut #{item.cutNumber.toString().padStart(2, '0')}</p>
              <p className="text-white/60 text-sm max-w-lg line-clamp-2 italic">{item.context}</p>
            </div>
            <button 
              className="absolute -top-12 -right-12 p-3 text-white/40 hover:text-white transition-colors"
              onClick={() => setIsZoomed(false)}
            >
              <X size={32} />
            </button>
          </div>
        </div>
      )}

      {/* Drawing Modal */}
      {isDrawingModalOpen && (
        <DrawingModal 
          initialImage={item.sketchImage}
          ratio={ratio}
          onClose={() => setIsDrawingModalOpen(false)}
          onSave={(imageData) => {
            onUpdate({ sketchImage: imageData });
            setIsDrawingModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default StoryboardRow;
