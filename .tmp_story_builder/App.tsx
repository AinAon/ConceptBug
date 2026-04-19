
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, Grid, Edit3, Key, Cpu, Maximize, Save, Upload, FileSpreadsheet, Download } from 'lucide-react';
import { AppTab, StoryboardItem, AspectRatio, GeminiModel } from './types';
import EditorTab from './components/EditorTab';
import GalleryTab from './components/GalleryTab';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

declare global {
  var aistudio: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.EDITOR);
  const [items, setItems] = useState<StoryboardItem[]>([
    { id: '1', cutNumber: 1, context: '', isGenerating: false }
  ]);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-3.1-flash-image-preview');
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>('16:9');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [checkingKey, setCheckingKey] = useState<boolean>(true);
  const [manualKey, setManualKey] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkApiKey = useCallback(async () => {
    // 1. Check localStorage first
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      setHasApiKey(true);
      setCheckingKey(false);
      return;
    }

    // 2. Check process.env.API_KEY (if injected by platform)
    if (process.env.API_KEY) {
      setHasApiKey(true);
      setCheckingKey(false);
      return;
    }

    // 3. Fallback to platform dialog check
    try {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    } catch (err) {
      console.error("Error checking API key:", err);
    } finally {
      setCheckingKey(false);
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    } else {
      alert("Platform key selector is not available in this environment. Please use manual entry below.");
    }
  };

  const handleSaveManualKey = () => {
    if (!manualKey.trim()) {
      alert("Please enter a valid API key.");
      return;
    }
    localStorage.setItem('GEMINI_API_KEY', manualKey.trim());
    setHasApiKey(true);
    alert("API Key saved locally.");
  };

  const handleUpdateItems = (newItems: StoryboardItem[]) => {
    setItems(newItems);
  };

  const isAnyGenerating = items.some(item => item.isGenerating);

  // --- SAVE/LOAD LOGIC ---
  const exportProject = () => {
    const projectData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      model: selectedModel,
      ratio: selectedRatio,
      items: items
    };
    
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `storyboard_project_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    // Generate simple CSV for spreadsheet use (without images as they are too large for CSV)
    const headers = ['Cut Number', 'Narration/Context', 'Has Image'];
    const rows = items.map(item => [
      item.cutNumber,
      `"${item.context.replace(/"/g, '""')}"`,
      item.imageUrl ? 'Yes' : 'No'
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `storyboard_list_${new Date().getTime()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllImages = async () => {
    const imagesToDownload = items.filter(item => item.imageUrl);
    if (imagesToDownload.length === 0) {
      alert('No images to download.');
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder("storyboard_images");

    imagesToDownload.forEach((item) => {
      const base64Data = item.imageUrl!.split(',')[1];
      const fileName = `cut_${item.cutNumber.toString().padStart(3, '0')}.png`;
      folder?.file(fileName, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `storyboard_images_${new Date().getTime()}.zip`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.items && Array.isArray(data.items)) {
          setItems(data.items);
          if (data.model) setSelectedModel(data.model);
          if (data.ratio) setSelectedRatio(data.ratio);
          alert('Project loaded successfully!');
        }
      } catch (err) {
        alert('Failed to parse project file.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  if (checkingKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121212]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-6">
        <div className="bg-[#1a1a1a] p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-white/5">
          <div className="bg-white p-5 rounded-3xl w-20 h-20 flex items-center justify-center mx-auto mb-8">
            <Key className="text-black w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">System Locked</h1>
          <p className="text-white/40 mb-8 leading-relaxed text-sm">
            To generate AI storyboard sketches, please connect your Gemini API key from a paid GCP project.
          </p>
          <button
            onClick={handleOpenKeyDialog}
            className="w-full bg-white text-black font-black py-4 px-8 rounded-2xl transition-all shadow-xl hover:bg-white/90 active:scale-95 mb-6"
          >
            CONNECT VIA PLATFORM
          </button>

          <div className="pt-8 border-t border-white/5">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">Or Enter Manually</p>
            <div className="flex flex-col gap-3">
              <input 
                type="password"
                placeholder="Paste your Gemini API Key here..."
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/40 transition-all text-white"
              />
              <button 
                onClick={handleSaveManualKey}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-xs font-bold transition-all border border-white/5"
              >
                SAVE KEY TO BROWSER
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#121212] text-white">
      {/* Hidden File Input for Loading */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={importProject} 
        accept=".json" 
        className="hidden" 
      />

      {/* Sidebar */}
      <nav className="w-14 bg-[#0a0a0a] flex flex-col border-r border-white/5 sticky top-0 h-screen shrink-0 items-center py-6 z-30">
        <div className="mb-10 bg-white/10 p-2 rounded-xl flex items-center justify-center">
          <Layout className="text-white" size={18} />
        </div>
        
        <div className="flex-1 flex flex-col items-center space-y-6">
          <button
            onClick={() => setActiveTab(AppTab.EDITOR)}
            title="Editor Mode"
            className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
              activeTab === AppTab.EDITOR 
                ? 'bg-white text-black shadow-lg scale-110' 
                : 'text-white/40 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Edit3 size={18} strokeWidth={2.5} />
          </button>
          
          <button
            onClick={() => setActiveTab(AppTab.GALLERY)}
            title="Gallery Mode"
            className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
              activeTab === AppTab.GALLERY 
                ? 'bg-white text-black shadow-lg scale-110' 
                : 'text-white/40 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Grid size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-auto flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-[#121212]">
        <header className="bg-[#121212]/90 backdrop-blur-xl border-b border-white/5 px-10 py-3 sticky top-0 z-20 flex flex-col xl:flex-row gap-6 justify-between items-center">
          <div className="flex items-center gap-6 w-full xl:w-auto">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              {activeTab === AppTab.EDITOR ? 'Editor' : 'Visuals'}
              <span className="text-[10px] bg-white/5 text-white/40 px-2 py-1 rounded-md uppercase tracking-widest">{items.length} Cuts</span>
            </h2>
            
            {/* Project Actions */}
            <div className="flex items-center gap-2 ml-4">
              <button 
                onClick={handleImportClick}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold transition-all text-white/80"
              >
                <Upload size={14} /> Open
              </button>
              <button 
                onClick={exportProject}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold transition-all text-white/80"
              >
                <Save size={14} /> Save Project
              </button>
              <button 
                onClick={downloadAllImages}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold transition-all text-white/80"
                title="Download All Images as ZIP"
              >
                <Download size={14} /> Download All
              </button>
              <button 
                onClick={exportCSV}
                title="Export as CSV for Spreadsheet"
                className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white/40 hover:text-green-400 transition-all"
              >
                <FileSpreadsheet size={16} />
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('GEMINI_API_KEY');
                  setHasApiKey(false);
                }}
                title="Change/Reset API Key"
                className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white/40 hover:text-white transition-all"
              >
                <Key size={16} />
              </button>
            </div>
          </div>

          {/* Settings Bar */}
          <div className="flex items-center gap-3 bg-white/5 p-1 rounded-xl border border-white/5 ml-auto">
            <div className="flex items-center gap-2 px-2 border-r border-white/10">
              <Cpu size={14} className="text-white/40" />
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
                className="bg-transparent text-white text-[10px] font-bold focus:outline-none cursor-pointer"
              >
                <option value="gemini-3.1-flash-image-preview" className="bg-[#1a1a1a] text-white">Gemini 3.1 Flash</option>
                <option value="gemini-3-pro-image-preview" className="bg-[#1a1a1a] text-white">Gemini 3 Pro</option>
                <option value="gemini-2.5-flash-image" className="bg-[#1a1a1a] text-white">Gemini 2.5 Flash</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-2">
              <Maximize size={14} className="text-white/40" />
              <select 
                value={selectedRatio}
                onChange={(e) => setSelectedRatio(e.target.value as AspectRatio)}
                className="bg-transparent text-white text-[10px] font-bold focus:outline-none cursor-pointer"
              >
                <option value="16:9" className="bg-[#1a1a1a] text-white">16:9 Wide</option>
                <option value="4:3" className="bg-[#1a1a1a] text-white">4:3 TV</option>
                <option value="1:1" className="bg-[#1a1a1a] text-white">1:1 Square</option>
                <option value="3:4" className="bg-[#1a1a1a] text-white">3:4 Portrait</option>
                <option value="9:16" className="bg-[#1a1a1a] text-white">9:16 Vertical</option>
              </select>
            </div>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto pb-32">
          {activeTab === AppTab.EDITOR ? (
            <EditorTab 
              items={items} 
              onUpdate={handleUpdateItems} 
              model={selectedModel} 
              ratio={selectedRatio}
              isAnyGenerating={isAnyGenerating}
            />
          ) : (
            <GalleryTab 
              items={items} 
              onUpdate={handleUpdateItems} 
              ratio={selectedRatio}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
