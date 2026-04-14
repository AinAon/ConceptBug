
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Loader2, 
  Zap,
  Camera,
  Sparkles,
  Download,
  Key,
  Copy,
  Check,
  Languages,
  MapPin,
  Settings2,
  Scan,
  Sun,
  Maximize2,
  Minimize2,
  PlusCircle,
  Eye,
  Terminal,
  X,
  Star,
  UserCircle,
  Building2,
  Paintbrush,
  Target,
  Brush,
  Save,
  FolderOpen,
  Smartphone
} from 'lucide-react';
import { TabType, PromptParts, AspectRatio, Resolution, GenerationResult } from './types';
import { ASPECT_RATIOS, RESOLUTIONS } from './constants';
import { generateImage, translateText, extractPromptFromImages, extractExifPrompt, upscaleImage, validateApiCredential } from './services/geminiService';

/**
 * Enhanced Image Slot Component
 */
const ImageSlot = ({ 
  src, 
  onRemove, 
  onFiles, 
  aspectSquare = true 
}: { 
  src?: string, 
  onRemove?: () => void, 
  onFiles: (files: FileList | null) => void,
  aspectSquare?: boolean
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFiles(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className={`relative group w-full h-full overflow-hidden border-2 border-dashed rounded-xl transition-all cursor-pointer ${
        isDragOver 
          ? 'bg-white/10 border-white/20 scale-[0.98]' 
          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
      } ${aspectSquare ? 'aspect-square' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        accept="image/*" 
        onChange={(e) => onFiles(e.target.files)}
      />
      
      {src ? (
        <>
          <img src={src} className="w-full h-full object-cover" alt="Reference" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
              className="p-2 bg-red-500/80 rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center p-1">
          <Plus size={16} className={`${isDragOver ? 'text-white' : 'text-zinc-700'} mb-1 transition-colors`}/>
          <span className={`text-[8px] font-black uppercase tracking-widest ${isDragOver ? 'text-white' : 'text-zinc-700'} transition-colors block`}>
            Add
          </span>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const COL1_WIDTH = "15%";
  const COL2_WIDTH = "15%";
  const COL4_WIDTH = "12%"; 

  const APP_TABS = [
    { id: 'conceptbug', name: '컨셉충', description: '현재 작업 중인 이미지 생성 툴', icon: Sparkles },
    { id: 'photographer', name: 'AI포토그래퍼', description: '실사사진 촬영 앱 (준비 중)', icon: Camera },
    { id: 'storybuilder', name: '스토리빌더', description: '스토리보드 / 콘티 생성 툴 (준비 중)', icon: Building2 },
    { id: 'charactersheet', name: '캐릭터시트', description: '페이셜 턴어라운드 시트 (준비 중)', icon: UserCircle },
    { id: 'fittingroom', name: '피팅룸', description: '의상 교체 / 스타일링 툴 (준비 중)', icon: Paintbrush },
  ] as const;

  const [activeAppTab, setActiveAppTab] = useState<(typeof APP_TABS)[number]['id']>('conceptbug');
  const [appPassword, setAppPassword] = useState('');
  const [isPasswordConfirmed, setIsPasswordConfirmed] = useState(false);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [credentialDraft, setCredentialDraft] = useState('');
  const [isArchiveSide, setIsArchiveSide] = useState(false);
  // 초기 아카이브 창의 높이 비율을 67로 설정
  const [splitPercent, setSplitPercent] = useState(67);
  const col2ContainerRef = useRef<HTMLDivElement>(null);
  
  // 아카이브 크기 측정 및 Masonry 레이아웃 계산용
  const archiveContainerRef = useRef<HTMLDivElement>(null);
  const [archiveWidth, setArchiveWidth] = useState(0);

  useEffect(() => {
    try {
      const savedCredential = localStorage.getItem('conceptbug_api_credential');
      if (savedCredential) {
        setAppPassword(savedCredential);
        setCredentialDraft(savedCredential);
        setIsPasswordConfirmed(true);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    const el = archiveContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setArchiveWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeAppTab]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMove = (moveEvent: MouseEvent) => {
      if (!col2ContainerRef.current) return;
      const rect = col2ContainerRef.current.getBoundingClientRect();
      if (isArchiveSide) {
        const newWidth = ((moveEvent.clientX - rect.left) / rect.width) * 100;
        setSplitPercent(Math.min(Math.max(newWidth, 10), 90));
      } else {
        const newHeight = ((moveEvent.clientY - rect.top) / rect.height) * 100;
        setSplitPercent(Math.min(Math.max(newHeight, 10), 90));
      }
    };
    const stopResizing = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopResizing);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopResizing);
  };

  const [imagePrompt, setImagePrompt] = useState<PromptParts>({
    subject_main: '', background_context: '', camera_angle: '', 
    composition_layout: '', mood_atmosphere: '', art_style: '', 
  });
  const [imageSpecifics, setImageSpecifics] = useState('');
  const [imageConceptImages, setImageConceptImages] = useState<string[]>([]);
  const [imageRefImages, setImageRefImages] = useState<string[]>([]);
  const [imageRatio, setImageRatio] = useState<AspectRatio>('16:9');

  const [selectedRes, setSelectedRes] = useState<Resolution>('1K');
  
  const [isZoomed, setIsZoomed] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const selectedModel = 'gemini-3.1-flash-image-preview';
  const photographerFrameRef = useRef<HTMLIFrameElement>(null);
  const [photographerSubjectDetail, setPhotographerSubjectDetail] = useState('');
  const [photographerPrompt, setPhotographerPrompt] = useState('');
  const [isPhotoGenerating, setIsPhotoGenerating] = useState(false);
  const [photoResults, setPhotoResults] = useState<GenerationResult[]>([]);
  const [photoSelectedIndex, setPhotoSelectedIndex] = useState(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [translatingField, setTranslatingField] = useState<string | null>(null);
  const [extractingField, setExtractingField] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [isResultVisible, setIsResultVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const formatError = (err: any, fallback: string) => {
    const msg = err?.message || String(err);
    if (msg.includes("502") || msg.includes("<html>") || msg.includes("Bad Gateway")) {
      return "서버 일시적 오류 또는 사용량 한도 초과입니다. 잠시 후 다시 시도해주세요.";
    }
    if (msg.includes("safety") || msg.includes("Safety")) {
      return "안전 정책에 의해 생성이 거부되었습니다. 프롬프트를 수정해주세요.";
    }
    if (msg.includes("quota") || msg.includes("Quota") || msg.includes("429")) {
      return "API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.";
    }
    return msg || fallback;
  };

  const isBusy = useMemo(() => {
    return isGenerating || isExtracting || isUpscaling || extractingField !== null || translatingField !== null || !isPasswordConfirmed;
  }, [isGenerating, isExtracting, isUpscaling, extractingField, translatingField, isPasswordConfirmed]);

  // Masonry 레이아웃 계산: 최단 열 우선 배치 알고리즘
  const masonryColumns = useMemo(() => {
    const minColWidth = 140;
    const gap = 8;
    const count = Math.max(1, Math.floor((archiveWidth - 16) / (minColWidth + gap)));
    
    const cols: { res: GenerationResult; originalIdx: number }[][] = Array.from(
      { length: count }, 
      () => []
    );
    const heights = new Array(count).fill(0);

    results.forEach((res, originalIdx) => {
      // 가장 낮은 높이를 가진 열 찾기 (타이 발생 시 왼쪽 열 우선)
      let minHeight = Infinity;
      let targetCol = 0;
      for (let i = 0; i < count; i++) {
        if (heights[i] < minHeight) {
          minHeight = heights[i];
          targetCol = i;
        }
      }

      // 프롬프트에서 비율을 파싱하여 높이 가중치 계산 (프록시 높이)
      let ratioWeight = 1; // 기본은 정사각형
      const ratioMatch = res.prompt.match(/\[Ratio\]\n([\d:]+)/);
      if (ratioMatch) {
        const parts = ratioMatch[1].split(':');
        if (parts.length === 2) {
          const w = parseInt(parts[0]);
          const h = parseInt(parts[1]);
          if (w && h) ratioWeight = h / w; // height/width 비율
        }
      }

      cols[targetCol].push({ res, originalIdx });
      heights[targetCol] += ratioWeight;
    });

    return cols;
  }, [results, archiveWidth]);



  const fullPrompt = useMemo(() => {
    const mapping = [
      { label: '[Subject]', text: imagePrompt.subject_main },
      { label: '[Background]', text: imagePrompt.background_context },
      { label: '[Camera]', text: imagePrompt.camera_angle },
      { label: '[Layout]', text: imagePrompt.composition_layout },
      { label: '[Mood]', text: imagePrompt.mood_atmosphere },
      { label: '[Style]', text: imagePrompt.art_style },
      { label: '[Specifics]', text: imageSpecifics },
      { label: '[Ratio]', text: imageRatio },
      { label: '[Resolution]', text: selectedRes }
    ];
    const activeParts = mapping.filter(p => p.text && p.text.trim() !== '');
    return activeParts.map((p, index) => `${index === 0 ? '' : '\n\n'}${p.label}\n${p.text}`).join('');
  }, [imagePrompt, imageSpecifics, imageRatio, selectedRes]);

  const previewPrompt = useMemo(() => {
    if (!fullPrompt) return "";
    return fullPrompt
      .split('\n\n')
      .filter(section => {
        const s = section.trim();
        return !s.startsWith('[Ratio]') && !s.startsWith('[Resolution]');
      })
      .join('\n\n')
      .trim();
  }, [fullPrompt]);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleTranslateField = async (fieldId: string) => {
    if (!appPassword) { setError("API Key is required."); return; }
    let textToTranslate = '';
    textToTranslate = fieldId === 'specifics' ? imageSpecifics : (imagePrompt as any)[fieldId];
    if (!textToTranslate || !textToTranslate.trim()) return;
    setTranslatingField(fieldId);
    try {
      const translated = await translateText(appPassword, textToTranslate);
      if (fieldId === 'specifics') setImageSpecifics(translated);
      else setImagePrompt(prev => ({ ...prev, [fieldId]: translated }));
    } catch (e) {
      setError(formatError(e, "Translation failed."));
    } finally {
      setTranslatingField(null);
    }
  };

  const handleExtractField = async (fieldId: string) => {
    if (!appPassword) { setError("API Key is required."); return; }
    const targetImages = imageConceptImages;
    if (targetImages.length === 0) return;
    setExtractingField(fieldId);
    setError(null);
    try {
      const result = await extractPromptFromImages(appPassword, targetImages, 'gemini-2.5-flash');
      const mapping: Record<string, string> = {
        'subject_main': 'subject_main', 'background_context': 'background_context', 'camera_angle': 'camera_angle',
        'composition_layout': 'composition_layout', 'mood_atmosphere': 'mood_atmosphere', 'art_style': 'art_style'
      };
      const resultKey = mapping[fieldId];
      const extractedValue = result[resultKey];
      if (extractedValue) {
        setImagePrompt(prev => ({ ...prev, [fieldId]: extractedValue }));
      }
    } catch (e: any) {
      setError(formatError(e, "Individual extraction failed."));
    } finally {
      setExtractingField(null);
    }
  };

  const handleFiles = useCallback((files: FileList | null, setter: React.Dispatch<React.SetStateAction<string[]>>, replaceIndex?: number, isConceptSlot?: boolean) => {
    if (!files) return;
    const fileList = Array.from(files) as File[];
    fileList.forEach((file, i) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const result = e.target!.result as string;
          if (isConceptSlot && replaceIndex === 0 && i === 0) {
            const exifPromptStr = extractExifPrompt(result);
            if (exifPromptStr) {
              // 정규식을 사용하여 [헤더]와 다음 [헤더] 사이의 내용을 추출 (줄바꿈 보존 및 다음 [] 이전까지 캡처)
              const sectionRegex = /\[([^\]]+)\]\n([\s\S]*?)(?=\n\[|$)/g;
              let match;
              const parsed: Record<string, string> = {};
              while ((match = sectionRegex.exec(exifPromptStr)) !== null) {
                parsed[match[1]] = match[2].trim();
              }

              const newPrompt = { ...imagePrompt };
              if (parsed['Subject']) newPrompt.subject_main = parsed['Subject'];
              if (parsed['Background']) newPrompt.background_context = parsed['Background'];
              if (parsed['Camera']) newPrompt.camera_angle = parsed['Camera'];
              if (parsed['Layout']) newPrompt.composition_layout = parsed['Layout'];
              if (parsed['Mood']) newPrompt.mood_atmosphere = parsed['Mood'];
              if (parsed['Style']) newPrompt.art_style = parsed['Style'];
              if (parsed['Specifics']) setImageSpecifics(parsed['Specifics']);
              if (parsed['Ratio']) setImageRatio(parsed['Ratio'] as AspectRatio);
              setImagePrompt(newPrompt);
            }
          }
          setter(prev => {
            if (replaceIndex !== undefined && i === 0) {
              const next = [...prev];
              next[replaceIndex] = result;
              return next;
            }
            return [...prev, result];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  }, [imagePrompt, imageRatio]);

  const handleExtract = async () => {
    if (!appPassword) { setError("API Key is required."); return; }
    const targetImages = imageConceptImages;
    if (targetImages.length === 0) return;
    setIsExtracting(true);
    setError(null);
    try {
      const result = await extractPromptFromImages(appPassword, targetImages, 'gemini-2.5-flash');
      setImagePrompt(prev => ({
        ...prev,
        subject_main: result.subject_main || prev.subject_main,
        background_context: result.background_context || prev.background_context,
        camera_angle: result.camera_angle || prev.camera_angle,
        composition_layout: result.composition_layout || prev.composition_layout,
        mood_atmosphere: result.mood_atmosphere || prev.mood_atmosphere,
        art_style: result.art_style || prev.art_style,
      }));
    } catch (e: any) {
      setError(formatError(e, "Extraction failed."));
    } finally { setIsExtracting(false); }
  };

  const handleGenerate = async () => {
    if (isGenerating) {
      handleCancel();
      return;
    }
    if (!appPassword) { setError("API Key is required."); return; }
    if (!fullPrompt.trim()) { setError("Prompt is empty."); return; }
    setIsGenerating(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    const startTime = Date.now();
    try {
      const currentRatio = imageRatio;
      const currentRefs = imageRefImages;
      let url = await generateImage(appPassword, fullPrompt, selectedModel, currentRatio, selectedRes, currentRefs);
      if (abortControllerRef.current?.signal.aborted) return;
      const duration = (Date.now() - startTime) / 1000;
      const modelName = 'Gemini 3.1 Flash Image';
      setResults(prev => [{
        type: 'image', url, prompt: fullPrompt, model: modelName,
        duration: parseFloat(duration.toFixed(1)), timestamp: Date.now()
      }, ...prev]);
      setSelectedResultIndex(0);
      setIsResultVisible(true);
      setIsZoomed(false);
      setPanOffset({ x: 0, y: 0 });
    } catch (err: any) { 
      if (!abortControllerRef.current?.signal.aborted) {
        setError(formatError(err, "Generation failed.")); 
      }
    } finally { setIsGenerating(false); }
  };

  const handleUpscale = async () => {
    if (!appPassword) { setError("API Key is required."); return; }
    const selectedResult = results[selectedResultIndex];
    if (!selectedResult || selectedResult.type !== 'image' || isUpscaling) return;
    setIsUpscaling(true);
    setError(null);
    const startTime = Date.now();
    try {
      const upscaledUrl = await upscaleImage(appPassword, selectedResult.url, selectedResult.prompt, selectedModel);
      const duration = (Date.now() - startTime) / 1000;
      const modelName = 'Gemini 3.1 Flash Image (Upscale)';
      setResults(prev => [{
        type: 'image', url: upscaledUrl, prompt: selectedResult.prompt, model: modelName,
        duration: parseFloat(duration.toFixed(1)), timestamp: Date.now()
      }, ...prev]);
      setSelectedResultIndex(0);
      setIsResultVisible(true);
      setIsZoomed(false);
      setPanOffset({ x: 0, y: 0 });
    } catch (err: any) {
      setError(formatError(err, "Upscale failed."));
    } finally { setIsUpscaling(false); }
  };

  const handleSave = () => {
    const data = {
      imagePrompt,
      imageSpecifics,
      imageConceptImages,
      imageRefImages,
      imageRatio,
      selectedRes,
      results
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `concept_bug_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.imagePrompt) setImagePrompt(json.imagePrompt);
        if (json.imageSpecifics) setImageSpecifics(json.imageSpecifics);
        if (json.imageConceptImages) setImageConceptImages(json.imageConceptImages);
        if (json.imageRefImages) setImageRefImages(json.imageRefImages);
        if (json.imageRatio) setImageRatio(json.imageRatio);
        if (json.selectedRes) setSelectedRes(json.selectedRes);
        if (json.results) setResults(json.results);
      } catch (err) {
        setError("Failed to load file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleArchiveDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      files.forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const dataUrl = event.target.result as string;
            setResults(prev => [{
              type: 'image', url: dataUrl, prompt: `Uploaded: ${file.name}`,
              model: "Local Upload", duration: 0, timestamp: Date.now()
            }, ...prev]);
            setSelectedResultIndex(0);
            setIsResultVisible(true);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setError("Generation cancelled by user.");
    setTimeout(() => setError(null), 3000);
  };

  const toggleZoom = () => {
    const newZoom = !isZoomed;
    setIsZoomed(newZoom);
    if (!newZoom) setPanOffset({ x: 0, y: 0 });
  };

  const handleDeleteResult = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setResults(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (index === selectedResultIndex) {
        setSelectedResultIndex(0);
        if (next.length === 0) setIsResultVisible(false);
      }
      else if (index < selectedResultIndex) setSelectedResultIndex(curr => Math.max(0, curr - 1));
      return next;
    });
  };

  const handlePanStart = (e: React.MouseEvent) => {
    if (!isZoomed) return;
    setIsPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning || !isZoomed) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePanEnd = () => setIsPanning(false);

  const imageScenarioFields = [
    { id: 'subject_main', label: 'Subject', icon: <UserCircle size={14}/>, placeholder: 'Main subject description...' },
    { id: 'background_context', label: 'Background', icon: <Building2 size={14}/>, placeholder: 'Environmental context...' },
    { id: 'camera_angle', label: 'Camera Angle', icon: <Camera size={14}/>, placeholder: 'Lens, angle, view...' },
    { id: 'composition_layout', label: 'Composition', icon: <Scan size={14}/>, placeholder: 'Placement, framing...' },
    { id: 'mood_atmosphere', label: 'Mood', icon: <Sun size={14}/>, placeholder: 'Lighting mood, vibe...' },
    { id: 'art_style', label: 'Style', icon: <Paintbrush size={14}/>, placeholder: 'Style, medium, texture...' },
  ];

  const activeScenarioFields = imageScenarioFields;
  const currentPromptState = imagePrompt;
  const currentSpecifics = imageSpecifics;
  const setCurrentSpecifics = setImageSpecifics;
  const currentConceptImages = imageConceptImages;
  const setCurrentConceptImages = setImageConceptImages;
  const currentRefImages = imageRefImages;
  const setCurrentRefImages = setImageRefImages;
  const currentRatio = imageRatio;
  const setCurrentRatio = setImageRatio;

  const conceptSlotCount = Math.max(3, currentConceptImages.length + 1);
  const refSlotCount = Math.max(3, currentRefImages.length + 1);
  const selectedResult = results[selectedResultIndex];

  const CopyBtn = ({ text, id }: { text: string, id: string }) => (
    <button 
      onClick={() => handleCopy(text, id)} 
      className={`p-1.5 rounded-lg transition-all ${copiedField === id ? 'bg-green-500/10 text-green-500' : 'hover:bg-white/5 text-zinc-600'}`}
      title="Copy to clipboard"
    >
      {copiedField === id ? <Check size={14}/> : <Copy size={14}/>}
    </button>
  );

  const CleanBtn = ({ fieldId }: { fieldId: string }) => {
    const text = fieldId === 'specifics' 
      ? imageSpecifics
      : (imagePrompt as any)[fieldId];
    const isEmpty = !text || !text.trim();
    return (
      <button 
        onClick={() => {
          if (fieldId === 'specifics') {
            setImageSpecifics('');
          } else {
            setImagePrompt(prev => ({ ...prev, [fieldId]: '' }));
          }
        }} 
        disabled={isGenerating || isExtracting || isUpscaling || extractingField !== null || translatingField !== null || isEmpty}
        className="p-1.5 rounded-lg transition-all hover:bg-white/5 text-zinc-600 hover:text-red-400 disabled:opacity-20"
        title="Clear Field"
      >
        <Trash2 size={14} />
      </button>
    );
  };

  const TranslateBtn = ({ fieldId }: { fieldId: string }) => {
    let textToTranslate = '';
    textToTranslate = fieldId === 'specifics' ? imageSpecifics : (imagePrompt as any)[fieldId];
    const isEmpty = !textToTranslate || !textToTranslate.trim();

    return (
      <button 
        onClick={() => handleTranslateField(fieldId)} 
        disabled={isBusy || isEmpty}
        className={`p-1.5 rounded-lg transition-all hover:bg-white/5 text-zinc-600 hover:text-indigo-400 disabled:opacity-20`}
        title="Translate Field"
      >
        {translatingField === fieldId ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
      </button>
    );
  };

  const ExtractFieldBtn = ({ fieldId }: { fieldId: string }) => (
    <button 
      onClick={() => handleExtractField(fieldId)} 
      disabled={isBusy || currentConceptImages.length === 0}
      className={`p-1.5 rounded-lg transition-all hover:bg-white/5 text-zinc-600 hover:text-emerald-400 disabled:opacity-20`}
      title="Extract into this field"
    >
      {extractingField === fieldId ? <Loader2 size={14} className="animate-spin text-[#40a5cd]" /> : <Target size={14} />}
    </button>
  );

  const handleCredentialConfirm = async (rawValue?: string) => {
    const credential = (rawValue ?? appPassword).trim();
    if (!credential) return;

    if (/^\d{4}$/.test(credential)) {
      const isValid = await validateApiCredential(credential);
      if (!isValid) {
        setIsPasswordConfirmed(false);
        setError("API키가 유효하지 않습니다.");
        return;
      }
    }

    setAppPassword(credential);
    setCredentialDraft(credential);
    setError(null);
    setIsPasswordConfirmed(true);
    setIsCredentialModalOpen(false);
    try {
      localStorage.setItem('conceptbug_api_credential', credential);
    } catch {
    }
  };

  useEffect(() => {
    if (activeAppTab !== 'photographer') return;
    const timer = window.setInterval(() => {
      try {
        const frameDoc = photographerFrameRef.current?.contentDocument;
        const subjectNode = frameDoc?.getElementById('subjectDetail') as HTMLTextAreaElement | null;
        const promptNode = frameDoc?.getElementById('finalOutput') as HTMLTextAreaElement | null;
        const nextSubject = subjectNode?.value || '';
        const nextPrompt = promptNode?.value || '';
        setPhotographerSubjectDetail((prev) => (prev === nextSubject ? prev : nextSubject));
        setPhotographerPrompt((prev) => (prev === nextPrompt ? prev : nextPrompt));
      } catch {
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [activeAppTab]);

  const handlePhotographerFrameLoad = () => {
    try {
      const frameDoc = photographerFrameRef.current?.contentDocument;
      if (!frameDoc) return;
      if (!frameDoc.getElementById('conceptbug-embed-style')) {
        const style = frameDoc.createElement('style');
        style.id = 'conceptbug-embed-style';
        style.textContent = `
          header { display: none !important; }
          .creator-sig { display: none !important; }
          body { min-width: 0 !important; padding: 0 !important; margin: 0 !important; }
          #studioLayout { height: 100vh !important; padding: 0 !important; }
        `;
        frameDoc.head.appendChild(style);
      }
      const frameWindow = photographerFrameRef.current?.contentWindow;
      if (frameWindow) {
        const items = photoResults.map((res, idx) => ({
          url: res.url,
          duration: res.duration,
          index: idx,
          selected: idx === photoSelectedIndex,
        }));
        frameWindow.postMessage({ type: 'conceptbug_archive_sync', items }, '*');
      }
      window.setTimeout(() => {
        try {
          photographerFrameRef.current?.contentWindow?.dispatchEvent(new Event('resize'));
        } catch {
        }
      }, 60);
    } catch {
    }
  };

  const syncPhotographerSubjectToFrame = (text: string) => {
    try {
      const frameDoc = photographerFrameRef.current?.contentDocument;
      const subjectNode = frameDoc?.getElementById('subjectDetail') as HTMLTextAreaElement | null;
      if (!subjectNode) return;
      if (subjectNode.value !== text) {
        subjectNode.value = text;
        subjectNode.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch {
    }
  };

  const handlePhotographerSubjectChange = (text: string) => {
    setPhotographerSubjectDetail(text);
    syncPhotographerSubjectToFrame(text);
  };

  useEffect(() => {
    if (photoSelectedIndex < photoResults.length) return;
    setPhotoSelectedIndex(0);
  }, [photoResults, photoSelectedIndex]);

  useEffect(() => {
    const frameWindow = photographerFrameRef.current?.contentWindow;
    if (!frameWindow) return;
    const items = photoResults.map((res, idx) => ({
      url: res.url,
      duration: res.duration,
      index: idx,
      selected: idx === photoSelectedIndex,
    }));
    frameWindow.postMessage({ type: 'conceptbug_archive_sync', items }, '*');
  }, [photoResults, photoSelectedIndex, activeAppTab]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || typeof payload !== 'object') return;
      if (payload.type === 'conceptbug_archive_select') {
        const idx = Number(payload.index);
        if (Number.isNaN(idx) || idx < 0 || idx >= photoResults.length) return;
        setPhotoSelectedIndex(idx);
        setIsPhotoModalOpen(true);
      }
      if (payload.type === 'conceptbug_archive_delete') {
        const idx = Number(payload.index);
        if (Number.isNaN(idx) || idx < 0 || idx >= photoResults.length) return;
        setPhotoResults((prev) => prev.filter((_, pIdx) => pIdx !== idx));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [photoResults]);

  const handlePhotoCopyPrompt = () => {
    if (!photographerPrompt.trim()) return;
    navigator.clipboard.writeText(photographerPrompt);
  };

  const handlePhotoGenerate = async () => {
    if (!appPassword) {
      setPhotoError("API Key is required.");
      return;
    }
    if (!photographerPrompt.trim()) {
      setPhotoError("Prompt is empty.");
      return;
    }
    setIsPhotoGenerating(true);
    setPhotoError(null);
    const startTime = Date.now();
    try {
      const ratioFromFrame = (() => {
        try {
          return (photographerFrameRef.current?.contentWindow as any)?.state?.ar?.val || '16:9';
        } catch {
          return '16:9';
        }
      })();

      const generatedUrl = await generateImage(
        appPassword,
        photographerPrompt,
        selectedModel,
        ratioFromFrame as AspectRatio,
        selectedRes,
        []
      );
      const duration = (Date.now() - startTime) / 1000;
      const modelName = 'Gemini 3.1 Flash Image';
      setPhotoResults((prev) => [{
        type: 'image',
        url: generatedUrl,
        prompt: photographerPrompt,
        model: modelName,
        duration: parseFloat(duration.toFixed(1)),
        timestamp: Date.now(),
      }, ...prev]);
      setPhotoSelectedIndex(0);
      setIsPhotoModalOpen(true);
    } catch (e) {
      setPhotoError(formatError(e, "Generation failed."));
    } finally {
      setIsPhotoGenerating(false);
    }
  };

  const selectedPhotoResult = photoResults[photoSelectedIndex];

  const selectedTab = APP_TABS.find((tab) => tab.id === activeAppTab);

  return (
    <div className={`h-screen text-zinc-200 font-['Inter'] flex overflow-hidden p-[10px] gap-[10px] relative transition-colors duration-500 bg-[#050505]`}>
      <aside className="w-[68px] shrink-0 h-full bg-zinc-900/40 border border-white/5 rounded-[5px] p-2 flex flex-col gap-2">
        <button
          onClick={() => {
            setCredentialDraft(appPassword);
            setIsCredentialModalOpen(true);
          }}
          title="API Key / Passcode"
          className={`w-full h-[44px] rounded-xl border transition-all flex items-center justify-center ${
            isPasswordConfirmed
              ? 'bg-[#40a5cd]/30 border-[#40a5cd]/55 text-white'
              : 'bg-[#40a5cd]/18 border-[#40a5cd]/45 text-[#9adcf3] hover:text-white'
          }`}
        >
          {isPasswordConfirmed ? <Check size={18} /> : <Key size={18} />}
        </button>
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
          {APP_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveAppTab(tab.id)}
              title={tab.name}
              className={`w-full h-[44px] rounded-xl border transition-all flex items-center justify-center ${
                activeAppTab === tab.id
                  ? 'bg-[#40a5cd]/20 border-[#40a5cd]/40 text-white shadow-2xl'
                  : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:text-white hover:border-white/15'
              }`}
            >
              <tab.icon size={18} />
            </button>
          ))}
        </div>
      </aside>

      {isCredentialModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-zinc-900 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-200">API / PASSCODE</h2>
              <button
                onClick={() => setIsCredentialModalOpen(false)}
                className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-black/30 rounded-lg px-2 py-2 border border-white/10">
              <Key size={12} className="text-zinc-500 shrink-0" />
              <input
                type="password"
                value={credentialDraft}
                onChange={(e) => setCredentialDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && credentialDraft.trim()) {
                    void handleCredentialConfirm(credentialDraft);
                  }
                }}
                placeholder="Enter Gemini API Key or 4-digit passcode"
                className="w-full bg-transparent text-[11px] text-zinc-200 placeholder:text-zinc-600 outline-none font-mono"
              />
            </div>
            <button
              onClick={() => void handleCredentialConfirm(credentialDraft)}
              disabled={!credentialDraft.trim()}
              className="h-10 rounded-lg bg-[#40a5cd] hover:bg-[#358eb0] disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {activeAppTab === 'conceptbug' ? (
      <main className="flex-1 flex gap-[10px] h-full overflow-hidden">
        <div style={{ width: COL4_WIDTH }} className="flex flex-col gap-[10px] shrink-0 h-full">
          <section className="bg-zinc-900/40 border border-white/5 rounded-[5px] p-2 flex flex-col gap-2 relative">
            <div className="flex gap-2">
              <button 
                onClick={handleSave} 
                className="flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/5 rounded text-zinc-400 hover:text-white transition-all"
                title="Save Project"
              >
                <Save size={14} /> SAVE
              </button>
              <label 
                className="flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/5 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Open Project"
              >
                <FolderOpen size={14} /> OPEN
                <input type="file" accept=".json" onChange={handleOpen} className="hidden" />
              </label>
            </div>
          </section>
          <section className="h-auto bg-zinc-900/40 border border-white/5 rounded-[5px] p-3 space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">OUTPUT SETTINGS</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {ASPECT_RATIOS.map(ratio => (
                <button
                  key={ratio}
                  disabled={isGenerating || isExtracting || isUpscaling || extractingField !== null || translatingField !== null}
                  onClick={() => setCurrentRatio(ratio)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg border text-[10px] font-black transition-all ${currentRatio === ratio ? 'bg-[#40a5cd] border-[#40a5cd] text-white shadow-2xl scale-[1.02]' : 'bg-white/5 border-white/5 text-zinc-600 hover:border-white/20'} disabled:opacity-20`}
                >
                  <div className={`border-2 border-current rounded-[2px] mb-1.5 shadow-sm ${ratio === '21:9' ? 'w-6 h-[10px]' : ratio === '16:9' ? 'w-6 h-[14px]' : ratio === '4:3' ? 'w-6 h-[18px]' : ratio === '3:2' ? 'w-6 h-[16px]' : ratio === '1:1' ? 'w-[18px] h-[18px]' : ratio === '3:4' ? 'w-[18px] h-6' : ratio === '2:3' ? 'w-[16px] h-6' : ratio === '9:16' ? 'w-[14px] h-6' : 'w-[10px] h-6'}`} />
                  {ratio}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {RESOLUTIONS.map(res => (
                <button
                  key={res}
                  disabled={isGenerating || isExtracting || isUpscaling || extractingField !== null || translatingField !== null}
                  onClick={() => setSelectedRes(res)}
                  className={`py-1.5 rounded-lg text-[10px] font-black border transition-all ${selectedRes === res ? 'bg-[#40a5cd] border-[#40a5cd] text-white shadow-xl' : 'bg-white/5 border-white/5 text-zinc-600'} disabled:opacity-20`}
                >
                  {res}
                </button>
              ))}
            </div>
          </section>
          <section className="flex-1 bg-zinc-900/10 border border-white/5 rounded-[5px] p-3 flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">PROMPT PREVIEW</h2>
              </div>
              <CopyBtn text={fullPrompt} id="full_prompt" />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <p className="text-[10px] leading-[1.6] text-white/20 selection:bg-white/10 whitespace-pre-wrap">{previewPrompt || "No content synergy yet. Start building your scenario."}</p>
            </div>
          </section>
        </div>

        <div ref={col2ContainerRef} className={`flex-1 flex ${isArchiveSide ? 'flex-row h-full' : 'flex-col'} gap-0 overflow-hidden h-full relative`}>
          <section style={isArchiveSide ? { width: `${splitPercent}%` } : { height: `${splitPercent}%` }} className={`bg-zinc-900/30 border border-white/5 rounded-[5px] relative overflow-hidden flex items-center justify-center group select-none ${isZoomed ? 'cursor-grab active:cursor-grabbing' : ''}`} onMouseDown={handlePanStart} onMouseMove={handlePanMove} onMouseUp={handlePanEnd} onMouseLeave={handlePanEnd}>
            {isGenerating ? (
              <div className="flex flex-col items-center gap-6 text-zinc-500">
                <Loader2 className="animate-spin text-white" size={40} />
                <span className="text-[12px] font-black tracking-[0.5em] uppercase text-zinc-400">SYNERGIZING ELEMENTS...</span>
              </div>
            ) : isUpscaling ? (
              <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                {selectedResult && (
                  <img src={selectedResult.url} className="w-full h-full object-contain blur-lg opacity-40 scale-110" alt="Original" />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-10">
                  <Loader2 className="animate-spin text-white drop-shadow-2xl" size={48} />
                  <span className="text-[12px] font-black tracking-[0.5em] uppercase text-white drop-shadow-lg">ENHANCING RESOLUTION...</span>
                </div>
              </div>
            ) : (selectedResult && isResultVisible) ? (
              <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                <div className={`transition-transform duration-75 ease-out ${isZoomed ? 'scale-100' : 'w-full h-full object-contain p-4'}`} style={{ transform: isZoomed ? `translate(${panOffset.x}px, ${panOffset.y}px)` : 'none' }}>
                  {selectedResult.type === 'image' ? <img src={selectedResult.url} className={`${isZoomed ? 'max-w-none max-h-none object-none' : 'w-full h-full object-contain'}`} alt="Generated" draggable={false} /> : <video src={selectedResult.url} controls className="w-full h-full object-contain" />}
                </div>
                {/* 액션바: 배경 투명도 수정 (평상시 20%, 마우스오버 90%) */}
                <div className="absolute bottom-2 right-2 flex flex-col gap-0.5 z-20">
                  <button onClick={toggleZoom} className="p-3 bg-black/20 border border-white/5 rounded-xl text-white/40 hover:text-white hover:bg-black/90 hover:backdrop-blur-xl hover:border-white/10 transition-all flex items-center justify-center" title={isZoomed ? "Zoom Out" : "Zoom In"}>{isZoomed ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                  <a href={selectedResult.url} download={`${(() => { const d = new Date(selectedResult.timestamp); const ts = d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0') + d.getHours().toString().padStart(2, '0') + d.getMinutes().toString().padStart(2, '0'); const rnd = Math.random().toString(36).substring(2, 8); return `${ts}_generated_${rnd}`; })()}.${selectedResult.type === 'image' ? 'jpg' : 'mp4'}`} className="p-3 bg-black/20 border border-white/5 rounded-xl text-white/40 hover:text-white hover:bg-black/90 hover:backdrop-blur-xl hover:border-white/10 transition-all flex items-center justify-center" title="Download"><Download size={20}/></a>
                  {selectedResult.type === 'image' && <button onClick={handleUpscale} disabled={isBusy} className="p-3 bg-black/20 border border-white/5 rounded-xl text-white/40 hover:text-white hover:bg-black/90 hover:backdrop-blur-xl hover:border-white/10 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed" title="Upscale 2K"><span className="text-[14px] font-black">2K</span></button>}
                  <button 
                    onClick={() => setIsResultVisible(false)} 
                    className="p-3 bg-black/20 border border-white/5 rounded-xl text-white/40 hover:text-white hover:bg-red-500/90 hover:backdrop-blur-xl hover:border-white/10 transition-all flex items-center justify-center" 
                    title="Clear view"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 opacity-20 group-hover:opacity-30 transition-opacity">
                <ImageIcon size={80} strokeWidth={1} />
                <div className="text-white uppercase tracking-[0.8em] font-black text-2xl tracking-widest text-center px-8">FINAL RESULT</div>
              </div>
            )}
          </section>
          <div onMouseDown={startResizing} className={`z-30 transition-colors group relative flex items-center justify-center ${isArchiveSide ? 'w-[10px] h-full cursor-col-resize hover:bg-[#40a5cd]/20' : 'w-full h-[10px] cursor-row-resize hover:bg-[#40a5cd]/20'}`}>
            <div className={`${isArchiveSide ? 'w-[2px] h-12' : 'h-[2px] w-12'} bg-white/10 rounded-full group-hover:bg-[#40a5cd] transition-colors`} />
          </div>
          <section className={`${isArchiveSide ? 'flex-1 h-full' : 'flex-1'} bg-zinc-900/10 border border-white/5 rounded-[5px] p-3 flex flex-col gap-3 overflow-hidden`}>
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsArchiveSide(!isArchiveSide)} className={`p-1 rounded-md transition-all hover:bg-white/5 text-zinc-600 hover:text-white ${isArchiveSide ? 'text-indigo-400' : ''}`} title="Toggle Archive View"><Smartphone size={12} className={isArchiveSide ? 'rotate-90' : ''} /></button>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">Archive</h2>
              </div>
            </div>
            <div 
              ref={archiveContainerRef}
              onDragOver={(e) => e.preventDefault()} 
              onDrop={handleArchiveDrop} 
              className="flex-1 overflow-y-auto custom-scrollbar relative"
            >
              {results.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center opacity-5">
                  <span className="font-black uppercase text-3xl tracking-tighter">EMPTY</span>
                </div>
              ) : (
                <div className="flex gap-2 px-2 pt-2 items-start transition-all">
                  {masonryColumns.map((col, cIdx) => (
                    <div key={cIdx} className="flex flex-col gap-2 flex-1 min-w-0">
                      {col.map(({ res, originalIdx }) => (
                        <div key={res.timestamp} className="relative group overflow-hidden w-full">
                          <div 
                            onClick={() => { 
                              setSelectedResultIndex(originalIdx); 
                              setIsResultVisible(true); 
                              setIsZoomed(false); 
                              setPanOffset({x:0,y:0}); 
                            }} 
                            className={`bg-white/[0.03] border transition-all cursor-pointer relative shadow-2xl w-full ${selectedResultIndex === originalIdx && isResultVisible ? 'border-white/80 ring-2 ring-white/20 z-10' : 'border-white/5 hover:border-white/20'}`}
                          >
                            <button 
                              onClick={(e) => handleDeleteResult(e, originalIdx)} 
                              className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all z-20 backdrop-blur-sm shadow-lg active:scale-90" 
                              title="Delete from archive"
                            >
                              <X size={10} />
                            </button>
                            {res.type === 'image' ? (
                              <img src={res.url} className="w-full h-auto block" alt="" />
                            ) : (
                              <video src={res.url} className="w-full h-auto block" />
                            )}
                            {res.type === 'video' && (
                              <div className="absolute top-1 left-1 bg-black/40 p-1 rounded-sm backdrop-blur-xs">
                                <VideoIcon size={10} className="text-white/70" />
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1.5 py-0.5 text-right font-bold backdrop-blur-[2px]">
                              {res.duration}S
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div style={{ width: COL1_WIDTH }} className="flex flex-col gap-[10px] shrink-0 h-full overflow-hidden">
          <section className="flex-1 bg-zinc-900/40 border border-white/5 rounded-[5px] p-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
            <div className="flex-1 flex flex-col gap-2">
              {activeScenarioFields.map((f) => (
                <div key={f.id} className="flex-1 flex flex-col gap-1 group">
                  <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 group-focus-within:text-white transition-colors">{f.icon}</span>
                      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">{f.label}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <ExtractFieldBtn fieldId={f.id} />
                      <TranslateBtn fieldId={f.id} />
                      <CleanBtn fieldId={f.id} />
                    </div>
                  </div>
                  <textarea 
                    placeholder={f.placeholder} 
                    className="w-full flex-1 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2 text-xs focus:bg-white/[0.07] outline-none transition custom-scrollbar resize-none min-h-[32px] leading-relaxed" 
                    value={(imagePrompt as any)[f.id]} 
                    onChange={e => {
                      const val = e.target.value;
                      setImagePrompt(prev => ({ ...prev, [f.id]: val }));
                    }} 
                  />
                </div>
              ))}
            </div>
          </section>
          <section className="bg-zinc-900/30 border border-white/5 rounded-[5px] p-3 flex flex-col gap-2 shrink-0 overflow-hidden">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 shrink-0 h-[12px]">CONCEPT REFERENCES</h2>
            <div className="grid grid-cols-3 gap-1.5 shrink-0">
              {Array.from({ length: conceptSlotCount }).map((_, i) => (
                <div key={i} className="aspect-square">
                  <ImageSlot src={currentConceptImages[i]} onRemove={() => setCurrentConceptImages(prev => prev.filter((_, idx) => idx !== i))} onFiles={(files) => handleFiles(files, setCurrentConceptImages, i, true)} />
                </div>
              ))}
            </div>
          </section>
          <div className="shrink-0">
            <button onClick={handleExtract} disabled={isBusy || currentConceptImages.length === 0} className={`w-full h-10 rounded-xl text-[12px] font-black transition-all flex items-center justify-center gap-2 shadow-2xl active:scale-[0.98] tracking-[0.2em] uppercase ${isExtracting ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50' : 'bg-[#40a5cd] hover:bg-[#358eb0] text-white'} disabled:opacity-50`}>
              {isExtracting ? <Loader2 size={15} className="animate-spin"/> : <Scan size={15}/>} ANALYSIS
            </button>
          </div>
        </div>

        <div style={{ width: COL2_WIDTH }} className="flex flex-col gap-[10px] shrink-0 h-full overflow-hidden">
          <section className="flex-1 bg-zinc-900/40 border border-white/5 rounded-[5px] p-3 flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-zinc-500" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">SPECIFICS</h2>
              </div>
              <div className="flex items-center gap-0.5">
                <TranslateBtn fieldId="specifics" />
                <CleanBtn fieldId="specifics" />
              </div>
            </div>
            <textarea value={imageSpecifics} onChange={e => setImageSpecifics(e.target.value)} placeholder="Additional fine-tuning for image..." className="w-full flex-1 bg-black/40 border border-white/5 rounded-lg p-3 text-xs outline-none focus:border-white/10 transition custom-scrollbar resize-none font-medium leading-relaxed overflow-y-auto" />
          </section>
          <section className="bg-zinc-900/30 border border-white/5 rounded-[5px] p-3 flex flex-col gap-2 shrink-0">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 h-[12px]">IMAGE REFERENCES</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: refSlotCount }).map((_, i) => (
                <div key={i} className="aspect-square">
                  <ImageSlot src={currentRefImages[i]} onRemove={() => setCurrentRefImages(prev => prev.filter((_, idx) => idx !== i))} onFiles={(files) => handleFiles(files, setCurrentRefImages, i, false)} />
                </div>
              ))}
            </div>
          </section>
          <div className="shrink-0 flex flex-col gap-3">
            <button onClick={handleGenerate} disabled={isExtracting || !!extractingField || !!translatingField || isUpscaling || !isPasswordConfirmed} className={`w-full h-10 rounded-xl text-[12px] font-black transition-all flex items-center justify-center gap-2 shadow-2xl active:scale-[0.98] tracking-[0.2em] uppercase ${isGenerating ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30' : 'bg-[#40a5cd] hover:bg-[#358eb0] text-white'} disabled:opacity-50`}>
              {isGenerating ? <X size={15} /> : <Zap size={15} />} {isGenerating ? "CANCEL" : "GENERATE"}
            </button>
            {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] rounded-xl text-center font-black uppercase tracking-widest">{error}</div>}
          </div>
        </div>
      </main>
      ) : activeAppTab === 'photographer' ? (
      <main className="flex-1 h-full overflow-hidden">
        <iframe
          ref={photographerFrameRef}
          onLoad={handlePhotographerFrameLoad}
          title="AI Photographer"
          src={`${import.meta.env.BASE_URL}apps/ai-photographer.html`}
          className="w-full h-full border-0 bg-transparent"
        />
      </main>
      ) : (
      <main className="flex-1 h-full overflow-hidden">
        <section className="h-full bg-zinc-900/30 border border-white/5 rounded-[5px] p-6 flex items-center justify-center">
          <div className="max-w-xl w-full bg-zinc-900/40 border border-white/10 rounded-2xl p-8 text-center">
            <h1 className="text-[16px] font-black tracking-[0.2em] uppercase text-white mb-3">
              {selectedTab?.name}
            </h1>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              이 탭은 아직 비어 있습니다. 다음 단계에서 기능을 추가할 예정입니다.
            </p>
          </div>
        </section>
      </main>
      )}
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
    </div>
  );
};

export default App;
