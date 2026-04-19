import React, { useMemo, useState } from "react";
import { LayoutGrid, List, Printer } from "lucide-react";
import { StoryItem, StoryRatio } from "./types";

interface StoryViewerProps {
  items: StoryItem[];
  ratio: StoryRatio;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ items, ratio }) => {
  const [layout, setLayout] = useState<"grid" | "storyboard">("grid");

  const ratioClass = useMemo(() => {
    if (ratio === "16:9") return "aspect-video";
    if (ratio === "4:3") return "aspect-[4/3]";
    if (ratio === "1:1") return "aspect-square";
    if (ratio === "3:4") return "aspect-[3/4]";
    return "aspect-[9/16]";
  }, [ratio]);

  const handlePrint = () => window.print();

  return (
    <main className="flex-1 h-full overflow-auto">
      <section className="h-full bg-zinc-900/30 border border-white/5 rounded-[5px] p-4 overflow-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#050505] py-2 z-10">
          <div className="flex bg-black/40 border border-white/10 rounded-lg p-1">
            <button onClick={() => setLayout("grid")} className={`px-3 h-8 rounded text-[10px] font-black uppercase tracking-[0.16em] ${layout === "grid" ? "bg-[#40a5cd] text-white" : "text-zinc-400 hover:text-white"}`}>
              <span className="inline-flex items-center gap-1"><LayoutGrid size={12} />Grid</span>
            </button>
            <button onClick={() => setLayout("storyboard")} className={`px-3 h-8 rounded text-[10px] font-black uppercase tracking-[0.16em] ${layout === "storyboard" ? "bg-[#40a5cd] text-white" : "text-zinc-400 hover:text-white"}`}>
              <span className="inline-flex items-center gap-1"><List size={12} />Storyboard</span>
            </button>
          </div>
          <button onClick={handlePrint} className="h-8 px-3 rounded bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-200 hover:text-white hover:bg-white/20 inline-flex items-center gap-1">
            <Printer size={12} />Print
          </button>
        </div>

        {items.length === 0 ? (
          <div className="h-[260px] border border-dashed border-white/10 rounded-xl flex items-center justify-center text-zinc-500 text-[12px]">Story Builder에서 컷을 먼저 생성해 주세요.</div>
        ) : layout === "grid" ? (
          <div className="grid grid-cols-3 gap-3">
            {items.map((item) => (
              <article key={item.id} className="bg-zinc-900/40 border border-white/10 rounded-xl p-2">
                <div className={`${ratioClass} bg-black/50 border border-white/10 rounded-lg overflow-hidden`}>
                  {item.imageUrl ? <img src={item.imageUrl} alt={`cut-${item.cutNumber}`} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[11px]">No Image</div>}
                </div>
                <div className="mt-2 text-[10px] text-zinc-400">CUT {String(item.cutNumber).padStart(2, "0")}</div>
                <div className="text-[11px] text-zinc-300 line-clamp-3">{item.context || "설명 없음"}</div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <article key={item.id} className="grid grid-cols-[240px_1fr] gap-3 bg-zinc-900/40 border border-white/10 rounded-xl p-3">
                <div className={`${ratioClass} bg-black/50 border border-white/10 rounded-lg overflow-hidden`}>
                  {item.imageUrl ? <img src={item.imageUrl} alt={`cut-${item.cutNumber}`} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[11px]">No Image</div>}
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400 mb-1">CUT {String(item.cutNumber).padStart(2, "0")}</div>
                  <p className="text-[12px] leading-relaxed text-zinc-200 whitespace-pre-wrap">{item.context || "설명 없음"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default StoryViewer;
