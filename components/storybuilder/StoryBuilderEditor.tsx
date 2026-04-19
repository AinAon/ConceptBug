import React, { useRef } from "react";
import { Image as ImageIcon, Plus, Trash2, Wand2, Loader2, Upload } from "lucide-react";
import { StoryItem, StoryModel, StoryRatio } from "./types";

interface StoryBuilderEditorProps {
  items: StoryItem[];
  model: StoryModel;
  ratio: StoryRatio;
  isCredentialReady: boolean;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<StoryItem>) => void;
  onGenerate: (id: string) => Promise<void>;
}

const StoryBuilderEditor: React.FC<StoryBuilderEditorProps> = ({
  items,
  model,
  ratio,
  isCredentialReady,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onGenerate,
}) => {
  const getAspectClass = () => {
    if (ratio === "16:9") return "aspect-video";
    if (ratio === "4:3") return "aspect-[4/3]";
    if (ratio === "1:1") return "aspect-square";
    if (ratio === "3:4") return "aspect-[3/4]";
    return "aspect-[9/16]";
  };

  return (
    <main className="flex-1 h-full overflow-auto">
      <section className="h-full bg-zinc-900/30 border border-white/5 rounded-[5px] p-4 overflow-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[12px] font-black uppercase tracking-[0.22em] text-zinc-200">Story Builder</h1>
          <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">{model} / {ratio}</div>
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <StoryRow
              key={item.id}
              item={item}
              aspectClass={getAspectClass()}
              isCredentialReady={isCredentialReady}
              onRemove={() => onRemoveItem(item.id)}
              onUpdate={(updates) => onUpdateItem(item.id, updates)}
              onGenerate={() => onGenerate(item.id)}
            />
          ))}
        </div>

        <button
          onClick={onAddItem}
          className="mt-4 w-full h-[54px] rounded-xl border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30 transition-all flex items-center justify-center gap-2 text-zinc-400 hover:text-white"
        >
          <Plus size={16} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">Add Cut</span>
        </button>
      </section>
    </main>
  );
};

interface StoryRowProps {
  item: StoryItem;
  aspectClass: string;
  isCredentialReady: boolean;
  onRemove: () => void;
  onUpdate: (updates: Partial<StoryItem>) => void;
  onGenerate: () => Promise<void>;
}

const StoryRow: React.FC<StoryRowProps> = ({ item, aspectClass, isCredentialReady, onRemove, onUpdate, onGenerate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canGenerate = isCredentialReady && !item.isGenerating && item.context.trim().length > 0;

  const handleRefUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 5 - item.referenceImages.length);
    selected.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const next = (e.target?.result as string) || "";
        if (!next) return;
        onUpdate({ referenceImages: [...item.referenceImages, next] });
      };
      reader.readAsDataURL(f);
    });
  };

  return (
    <article className="grid grid-cols-[64px_260px_1fr] gap-3 bg-zinc-900/40 border border-white/5 rounded-xl p-3">
      <div className="flex flex-col items-center justify-between border-r border-white/5 pr-3">
        <div className="text-[24px] font-black text-zinc-200 leading-none">{String(item.cutNumber).padStart(2, "0")}</div>
        <button onClick={onRemove} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all" title="Remove">
          <Trash2 size={15} />
        </button>
      </div>

      <div className={`relative ${aspectClass} bg-black/50 border border-white/10 rounded-xl overflow-hidden`}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={`cut-${item.cutNumber}`} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
            {item.isGenerating ? <Loader2 size={20} className="animate-spin text-zinc-200" /> : <ImageIcon size={20} />}
            <span className="text-[10px] uppercase tracking-[0.16em]">No Image</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={item.context}
          onChange={(e) => onUpdate({ context: e.target.value })}
          placeholder="컷 설명 / 액션 / 화면 구도"
          className="w-full min-h-[84px] resize-y bg-black/40 border border-white/10 rounded-lg p-2 text-[12px] leading-relaxed outline-none focus:border-[#40a5cd]/70"
        />

        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleRefUpload(e.target.files)} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={item.referenceImages.length >= 5}
            className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-[0.16em] disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-1"><Upload size={12} />Ref {item.referenceImages.length}/5</span>
          </button>
          <button
            onClick={() => void onGenerate()}
            disabled={!canGenerate}
            className="h-9 px-4 rounded-lg bg-[#40a5cd] hover:bg-[#358eb0] text-white transition-all text-[10px] font-black uppercase tracking-[0.16em] disabled:opacity-40 inline-flex items-center gap-1"
          >
            {item.isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
            {item.isGenerating ? "Generating" : "Generate"}
          </button>
        </div>
      </div>
    </article>
  );
};

export default StoryBuilderEditor;
