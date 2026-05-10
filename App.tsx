import React, { useState, useEffect } from 'react';
import { analyzeProductAndGenerateStrategy, generateShopeeListing } from './services/listingService';
import { analyzeImageText } from './services/visionService';
import { generateProductBase } from './services/baseImageService';
import { mergeProjectToDB, loadProjectFromDB } from './services/storageService';
import { GuideModal } from './components/GuideModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ProductCard } from './components/ProductCard';
import { ErrorBanner } from './components/ErrorBanner';
import { LoadingOverlay } from './components/LoadingOverlay';
import { InputForm } from './components/InputForm';
import { Phase2Section } from './components/Phase2Section';
import { ShopeeImageGrid } from './components/ShopeeImageGrid';
import { ProjectHistory, loadProjects, saveProject } from './components/ProjectHistory';
import { DebugPromptModal } from './components/DebugPromptModal';
import { AppError, ErrorType } from './utils/errorHandler';
import { validateProductName, validateBrandContext } from './utils/validators';
import { generateShopeeListingReport } from './utils/reportGenerator';
import { downloadTextFile } from './utils/downloadHelper';
import { FILE_LIMITS } from './utils/constants';
import { ShopeeAppState } from './types/shopee';
import type {
  DirectorOutput,
  ShopeeListing,
  ShopeeProject,
  ShopeeVisualStyle,
  SkuOption,
  VisionAnalysisResult,
  BlurRegion,
} from './types/shopee';

// ============================================================================
// Constants
// ============================================================================

const LS_KEY = 'openai_api_key';

// ============================================================================
// App
// ============================================================================

const App: React.FC = () => {
  // --- Core State ---
  const [appState, setAppState] = useState<ShopeeAppState>(ShopeeAppState.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // --- Inputs ---
  const [productName, setProductName] = useState('');
  const [brandContext, setBrandContext] = useState('');
  const [productType, setProductType] = useState('護膚');
  const [specs, setSpecs] = useState('');
  const [capacity, setCapacity] = useState('');
  const [features, setFeatures] = useState<string[]>(['', '', '']);
  const [scenario, setScenario] = useState('');
  const [visualStyle, setVisualStyle] = useState<ShopeeVisualStyle>('gen-z-impact');
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([]);
  const [customNotes, setCustomNotes] = useState('');

  // --- Phase 1 Results ---
  const [directorOutput, setDirectorOutput] = useState<DirectorOutput | null>(null);
  const [activeRouteIndex, setActiveRouteIndex] = useState<number>(0);

  // --- Phase 2 Results ---
  const [shopeeListing, setShopeeListing] = useState<ShopeeListing | null>(null);
  const [visionResult, setVisionResult] = useState<VisionAnalysisResult | null>(null);

  // --- Preprocessing (P2) ---
  const [processedImageBase64, setProcessedImageBase64] = useState<string | null>(null);
  const [blurRegions, setBlurRegions] = useState<BlurRegion[]>([]);
  const [baseImageBase64, setBaseImageBase64] = useState<string | null>(null);
  const [baseImageGenerating, setBaseImageGenerating] = useState(false);

  // --- Theme ---
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : false; // default: light
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // --- UI State ---
  const [debugModalPhase, setDebugModalPhase] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [inputErrors, setInputErrors] = useState<Record<string, string | undefined>>({});
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  // --- Project History ---
  const [projects, setProjects] = useState<ShopeeProject[]>(() => loadProjects());
  const [currentProjectId, setCurrentProjectId] = useState<string>(() => {
    const saved = localStorage.getItem('current-project-id');
    return saved || `proj_${Date.now()}`;
  });

  // Persist project ID
  useEffect(() => {
    localStorage.setItem('current-project-id', currentProjectId);
  }, [currentProjectId]);

  // Auto-save after phase completion
  // Accept listing param because React state is stale in the same render
  function autoSave(status: ShopeeProject['status'], listing?: ShopeeListing | null) {
    if (!imagePreview) return;
    const project: ShopeeProject = {
      id: currentProjectId,
      projectName: productName || '未命名',
      status,
      visualStyle,
      products: [{ id: 'prod-1', imageBase64: imagePreview, name: productName }],
      skuOptions,
      listing: listing ?? shopeeListing,
      taskMap: {},
      generationHistory: [],
      processedImageUrl: processedImageBase64 || baseImageBase64 || undefined,
      blurRegions: blurRegions.length > 0 ? blurRegions : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveProject(project);
    mergeProjectToDB(project).catch(() => {});
    setProjects(loadProjects());
  }

  // --- Check for API Key on mount ---
  useEffect(() => {
    const key = localStorage.getItem(LS_KEY);
    // Always ensure APIMart key is set
    if (!key || key.startsWith('sk-sfLf')) {
      localStorage.setItem(LS_KEY, 'sk-9Ngi0kKF5aqdFzNzWVihFXDdAdFWyUUB2hYt1GcjoNInlDCC');
    }
    setHasKey(true);
  }, []);

  // --- Error & Reset ---
  const handleError = (e: unknown, fallbackMsg: string) => {
    console.error(e);
    if (e instanceof AppError) {
      setErrorMsg(e.userMessage);
      setErrorType(e.type);
      if (e.type === ErrorType.AUTH) setIsKeyModalOpen(true);
    } else {
      setErrorMsg(fallbackMsg);
      setErrorType(ErrorType.UNKNOWN);
    }
    setAppState(ShopeeAppState.ERROR);
  };

  const handleReset = () => {
    setAppState(ShopeeAppState.IDLE);
    setErrorMsg('');
    setErrorType(null);
  };

  // --- File Handler ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
        setErrorMsg(`檔案大小超過限制（最大 ${FILE_LIMITS.MAX_IMAGE_SIZE_MB}MB），請壓縮圖片後再試。`);
        setErrorType(ErrorType.VALIDATION);
        return;
      }

      if (!(FILE_LIMITS.ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
        setErrorMsg('不支援的檔案類型。請上傳 JPG、PNG 或 WebP 格式的圖片。');
        setErrorType(ErrorType.VALIDATION);
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setImagePreview(ev.target.result as string);
      };
      reader.onerror = () => {
        setErrorMsg('圖片讀取失敗，請稍候再試。');
        setErrorType(ErrorType.VALIDATION);
      };
      reader.readAsDataURL(file);
      setDirectorOutput(null);
      setShopeeListing(null);
      setVisionResult(null);
      setAppState(ShopeeAppState.IDLE);
      setErrorMsg('');
      setErrorType(null);
    }
  };

  // --- Phase 1: Analyze ---
  const handleAnalyze = async () => {
    if (!selectedFile || !imagePreview) return;
    if (!hasKey) { setIsKeyModalOpen(true); return; }

    const nameValidation = validateProductName(productName);
    const contextValidation = validateBrandContext(brandContext);
    if (!nameValidation.valid || !contextValidation.valid) {
      setInputErrors({
        productName: nameValidation.error,
        brandContext: contextValidation.error,
      });
      return;
    }

    setInputErrors({});
    setErrorMsg('');
    setErrorType(null);
    setAppState(ShopeeAppState.PHASE1_ANALYZING);

    try {
      const activeFeatures = features.filter((f) => f.trim());
      const result = await analyzeProductAndGenerateStrategy({
        imageBase64: imagePreview,
        productName,
        brandContext,
        productType,
        features: activeFeatures.length > 0 ? activeFeatures : undefined,
      });
      setDirectorOutput(result);
      setActiveRouteIndex(0);
      setShopeeListing(null);
      setVisionResult(null);
      setAppState(ShopeeAppState.PHASE1_READY);
      autoSave('material_pending');
    } catch (e) {
      handleError(e, '分析過程中發生了意外錯誤，請稍候再試。');
    }
  };

  // --- Phase 2: Generate Listing ---
  const handleGenerateListing = async () => {
    if (!directorOutput || !imagePreview) return;

    setInputErrors({});
    setErrorMsg('');
    setErrorType(null);
    setAppState(ShopeeAppState.PHASE2_PROCESSING);

    try {
      const strategy = directorOutput.visualStrategies[activeRouteIndex];

      // Run listing generation and vision analysis in parallel
      const [listing, vision] = await Promise.all([
        generateShopeeListing({
          productName,
          brand: brandContext,
          productType,
          specs,
          capacity,
          features: features.filter((f) => f.trim()),
          scenario: scenario || '日常使用',
          visualStyle,
          selectedStrategy: {
            strategyName: strategy.strategyName,
            headlineZh: strategy.headlineZh,
            styleBriefZh: strategy.styleBriefZh,
            targetAudienceZh: strategy.targetAudienceZh,
          },
          skuOptions: skuOptions.length > 0 ? skuOptions : undefined,
        }),
        analyzeImageText({ imageBase64: imagePreview }).catch((e) => {
          console.warn('Vision analysis failed (non-blocking):', e);
          return null;
        }),
      ]);

      setShopeeListing(listing);
      setVisionResult(vision);
      setAppState(ShopeeAppState.PHASE2_READY);
      autoSave('listing_ready', listing);
    } catch (e) {
      handleError(e, 'Listing 生成失敗，請稍候再試。');
    }
  };

  // --- Base Image Generation ---
  const handleGenerateBaseImage = async () => {
    if (!processedImageBase64) return;
    setBaseImageGenerating(true);
    try {
      const result = await generateProductBase({
        imageBase64: processedImageBase64,
        productName,
      });
      setBaseImageBase64(result.baseImageBase64);
    } catch (e) {
      console.error('Base image generation failed:', e);
    } finally {
      setBaseImageGenerating(false);
    }
  };

  // --- Project History Handlers ---
  const handleSelectProject = async (project: ShopeeProject) => {
    setCurrentProjectId(project.id);

    // Restore from IndexedDB for full data (including images)
    let fullProject = await loadProjectFromDB(project.id);

    // If project doesn't exist in IndexedDB yet (migrated from old localStorage),
    // seed it now so subsequent image saves work
    if (!fullProject) {
      fullProject = { ...project, images: project.images || {} };
      mergeProjectToDB(fullProject).catch(() => {});
    }

    setProductName(fullProject.projectName);
    setVisualStyle(fullProject.visualStyle);
    setSkuOptions(fullProject.skuOptions);
    if (fullProject.products?.[0]?.imageBase64) {
      setImagePreview(fullProject.products[0].imageBase64);
      setSelectedFile(null);
    }
    if (fullProject.blurRegions) setBlurRegions(fullProject.blurRegions);
    if (fullProject.processedImageUrl) setProcessedImageBase64(fullProject.processedImageUrl);

    const resolvedListing = fullProject.listing;
    const hasImages = !!(fullProject.images && Object.keys(fullProject.images).length > 0);

    switch (fullProject.status) {
      case 'completed':
      case 'generating':
      case 'partial':
        if (resolvedListing) setShopeeListing(resolvedListing);
        setAppState(ShopeeAppState.PHASE3_GENERATING);
        break;
      case 'listing_ready': {
        if (resolvedListing) setShopeeListing(resolvedListing);
        setAppState(hasImages ? ShopeeAppState.PHASE3_GENERATING : ShopeeAppState.PHASE2_READY);
        break;
      }
      case 'material_pending':
      default:
        setAppState(ShopeeAppState.IDLE);
    }
  };

  const handleNewProject = () => {
    setCurrentProjectId(`proj_${Date.now()}`);
    setAppState(ShopeeAppState.IDLE);
    setProductName('');
    setBrandContext('');
    setImagePreview(null);
    setSelectedFile(null);
    setDirectorOutput(null);
    setShopeeListing(null);
    setVisionResult(null);
    setProcessedImageBase64(null);
    setBaseImageBase64(null);
    setBlurRegions([]);
    setErrorMsg('');
    setErrorType(null);
  };

  // --- Download ---
  const handleDownloadListing = () => {
    if (!shopeeListing) return;
    const report = generateShopeeListingReport(shopeeListing, productName, directorOutput);
    downloadTextFile(report, `Shopee_Listing_${productName.replace(/\s+/g, '_')}.txt`);
  };

  // --- Visual Style Display Name ---
  const visualStyleLabels: Record<ShopeeVisualStyle, string> = {
    'fresh-watery': '清新水感',
    'creamy-soft': '奶油柔潤',
    'clean-refreshing': '清爽潔淨',
    'botanical-natural': '植萃自然',
    'premium-minimal': '高級極簡',
    'girly-sweet': '少女甜感',
    'gentle-elegant': '溫柔優雅',
    'bold-playful': '大膽活潑',
    'calm-serene': '沉靜舒緩',
    'luxury-golden': '奢華金屬',
    'lifestyle-home': '生活居家',
    'office-professional': '都市職場',
    'dorm-young': '宿舍青春',
    'gym-active': '運動活力',
    'spa-resort': '溫泉度假',
    'tech-transparent': '科技透明',
    'gift-box': '禮盒質感',
    'gen-z-impact': 'Z世代衝擊',
    'retro-vintage': '文青復古',
    'tropical-island': '熱帶島嶼',
  };

  // --- Phase Visibility ---
  const showPhase1Results = appState === ShopeeAppState.PHASE1_READY
    || appState === ShopeeAppState.PHASE2_PROCESSING
    || appState === ShopeeAppState.PHASE2_READY
    || appState === ShopeeAppState.PHASE3_GENERATING
    || appState === ShopeeAppState.PHASE3_COMPLETE;

  const showPhase2 = appState === ShopeeAppState.PHASE2_READY
    || appState === ShopeeAppState.PHASE3_GENERATING
    || appState === ShopeeAppState.PHASE3_COMPLETE;

  const showPhase3 = appState === ShopeeAppState.PHASE3_GENERATING
    || appState === ShopeeAppState.PHASE3_COMPLETE;

  // --- Render ---
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f12] text-gray-900 dark:text-slate-200 selection:bg-purple-500 selection:text-white font-sans flex">
      {/* Left Sidebar: Project History */}
      <ProjectHistory
        projects={projects}
        activeProjectId={currentProjectId}
        onSelect={handleSelectProject}
        onDelete={() => setProjects(loadProjects())}
        onNewProject={handleNewProject}
        onProjectsChange={setProjects}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        <ApiKeyModal isOpen={isKeyModalOpen} onSave={(_key: string) => { setIsKeyModalOpen(false); setHasKey(true); }} />

        {/* Header */}
      <header className="w-full py-6 border-b border-gray-200 dark:border-white/5 bg-white/90 dark:bg-[#0f0f12]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setAppState(ShopeeAppState.IDLE)}>
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-600/50">
              <span className="text-white font-bold">PM</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white hidden md:block">
              AI Product Marketing Designer <span className="text-purple-500 text-xs align-top ml-1">SHOPEE</span>
            </h1>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setDarkMode((v) => !v)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
              title={darkMode ? '切換白天模式' : '切換夜間模式'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={() => setIsGuideOpen(true)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors">
              功能導覽 v0.9
            </button>
            <button onClick={() => setIsKeyModalOpen(true)} className="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 text-sm font-bold">
              {hasKey ? '更換 API Key' : '設定 API Key'}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 flex flex-col">
        {/* Global Error */}
        <ErrorBanner errorMsg={errorMsg} errorType={errorType} onReset={handleReset} />

        {/* Loading States */}
        {appState === ShopeeAppState.PHASE1_ANALYZING && (
          <LoadingOverlay title="AI 總監正在分析產品" description="正在解讀視覺特徵與生成行銷策略..." colorClass="purple" timeEstimate="預計需要 30-60 秒" />
        )}
        {appState === ShopeeAppState.PHASE2_PROCESSING && (
          <LoadingOverlay title="正在生成蝦皮 Listing" description="正在生成 SEO 標題、產品描述、圖片 Prompt 與合規檢查..." colorClass="blue" timeEstimate="預計需要 1-2 分鐘，請耐心等候" />
        )}

        {/* Idle View */}
        {appState === ShopeeAppState.IDLE && (
          <div className="flex-1 flex flex-col items-center mt-8 text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-500/30 text-purple-600 dark:text-purple-300 text-xs font-bold uppercase tracking-widest mb-6">
              v0.9 — Shopee Edition
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
              台灣蝦皮<br />商品圖片生成器
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-8 text-lg">
              一鍵生成 <span className="text-purple-600 dark:text-purple-400 font-bold">6 張主圖</span> + <span className="text-purple-600 dark:text-purple-400 font-bold">4-6 張詳情圖</span> + SKU 圖。
              <br />包含 SEO 標題、產品描述、合規檢查。
            </p>
            <InputForm
              productName={productName}
              brandContext={brandContext}
              productType={productType}
              specs={specs}
              capacity={capacity}
              features={features}
              scenario={scenario}
              visualStyle={visualStyle}
              skuOptions={skuOptions}
              customNotes={customNotes}
              selectedFile={selectedFile}
              imagePreview={imagePreview}
              inputErrors={inputErrors}
              hasFile={!!selectedFile}
              onProductNameChange={(v) => { setProductName(v); if (inputErrors.productName) setInputErrors({ ...inputErrors, productName: undefined }); }}
              onBrandContextChange={(v) => { setBrandContext(v); if (inputErrors.brandContext) setInputErrors({ ...inputErrors, brandContext: undefined }); }}
              onProductTypeChange={setProductType}
              onSpecsChange={setSpecs}
              onCapacityChange={setCapacity}
              onFeaturesChange={setFeatures}
              onScenarioChange={setScenario}
              onVisualStyleChange={setVisualStyle}
              onSkuOptionsChange={setSkuOptions}
              onCustomNotesChange={setCustomNotes}
              onFileChange={handleFileChange}
              onAnalyze={handleAnalyze}
            />
          </div>
        )}

        {/* Phase 1 Results */}
        {showPhase1Results && directorOutput && imagePreview && (
          <div className="w-full max-w-6xl mx-auto px-4 pb-20">
            {/* Product Card */}
            <ProductCard analysis={directorOutput.productAnalysis} imageSrc={imagePreview} />

            {/* Strategy Route Selection */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-white/10 pb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">1</div>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 flex-1">
                  Phase 1: 視覺策略選擇
                </h2>
                {directorOutput._debugPrompt && (
                  <button
                    onClick={() => setDebugModalPhase(1)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-white/5"
                  >
                    檢視提示詞
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {directorOutput.visualStrategies.map((route, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveRouteIndex(idx);
                      setShopeeListing(null);
                      setVisionResult(null);
                    }}
                    className={`p-5 rounded-xl border text-left transition-all duration-300 ${
                      activeRouteIndex === idx
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-gray-900 dark:border-white scale-[1.02] shadow-lg'
                        : 'bg-gray-50 dark:bg-[#15151a] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-[#1a1a1f]'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase opacity-70 mb-1">
                      路線 {String.fromCharCode(65 + idx)} · {visualStyleLabels[route.styleCategory] || route.styleCategory}
                    </div>
                    <div className="font-bold text-lg mb-1">{route.headlineZh}</div>
                    <div className="text-xs opacity-70">{route.subheadZh}</div>
                    <div className="text-xs mt-2 opacity-50">{route.targetAudienceZh}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Phase 1 Visual Concept Previews */}
            {directorOutput.visualStrategies[activeRouteIndex] && (
              <div className="mb-12">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">視覺策略預覽</h3>
                <div className="bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-white/10 rounded-xl p-6">
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                    <span className="text-gray-500">視覺風格：</span>
                    {visualStyleLabels[directorOutput.visualStrategies[activeRouteIndex].styleCategory]}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                    <span className="text-gray-500">視覺元素：</span>
                    {directorOutput.visualStrategies[activeRouteIndex].visualElementsZh}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    <span className="text-gray-500">風格簡述：</span>
                    {directorOutput.visualStrategies[activeRouteIndex].styleBriefZh}
                  </p>
                </div>
              </div>
            )}

            {/* Proceed to Phase 2 */}
            {appState === ShopeeAppState.PHASE1_READY && (
              <div className="border-t border-gray-200 dark:border-white/10 pt-12">
                <div className="bg-gray-50 dark:bg-[#1e1e24] rounded-2xl p-8 border border-purple-300 dark:border-purple-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">2</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Phase 2: 生成蝦皮 Listing</h3>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    根據「{directorOutput.visualStrategies[activeRouteIndex].headlineZh}」策略，生成完整蝦皮 Listing：
                    SEO 標題、產品描述、主圖 Prompt、詳情圖 Prompt、合規檢查。
                  </p>
                  <button
                    onClick={handleGenerateListing}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-purple-900/50"
                  >
                    生成 Listing
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Phase 2: Listing Review (independent of Phase 1 results) */}
        {showPhase2 && shopeeListing && (
          <div className="w-full max-w-6xl mx-auto px-4 pb-20">
            <Phase2Section
              listing={shopeeListing}
              visionResult={visionResult}
              productName={productName}
              imagePreview={imagePreview}
              processedImageBase64={processedImageBase64}
              blurRegions={blurRegions}
              baseImageBase64={baseImageBase64}
              baseImageGenerating={baseImageGenerating}
              onImageProcessed={(base64, regions) => {
                setProcessedImageBase64(base64);
                setBlurRegions(regions);
                setBaseImageBase64(null);
              }}
              onGenerateBaseImage={handleGenerateBaseImage}
              onDownloadReport={handleDownloadListing}
              onProceedToPhase3={() => { setAppState(ShopeeAppState.PHASE3_GENERATING); autoSave('generating', shopeeListing); }}
              appState={appState}
            />
          </div>
        )}

        {/* Phase 3: Image Production (independent of Phase 1 results) */}
        {showPhase3 && shopeeListing && (
          <div className="w-full max-w-6xl mx-auto px-4 pb-20">
            <div className="border-t border-gray-200 dark:border-white/10 pt-12">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center font-bold">3</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Phase 3: 圖片生產</h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                逐張生成圖片。主圖 1024×1024，詳情圖 1024×1536。圖片生成需 30-90 秒，請耐心等候。
              </p>
              <ShopeeImageGrid
                listing={shopeeListing}
                productName={productName}
                imagePreview={baseImageBase64 || processedImageBase64 || imagePreview}
                projectId={currentProjectId}
                onComplete={() => { setAppState(ShopeeAppState.PHASE3_COMPLETE); autoSave('completed', shopeeListing); }}
                isComplete={appState === ShopeeAppState.PHASE3_COMPLETE}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="w-full py-6 text-center border-t border-gray-200 dark:border-white/5 text-xs text-gray-500 dark:text-gray-600">
        AI Product Marketing Designer · Shopee Edition
      </footer>

      <DebugPromptModal
        isOpen={debugModalPhase !== null}
        promptContent={
          debugModalPhase === 1 ? directorOutput?._debugPrompt || null :
          debugModalPhase === 2 ? shopeeListing?.seoTitles[0]?.title || null :
          null
        }
        phaseName={`Phase ${debugModalPhase}`}
        onClose={() => setDebugModalPhase(null)}
      />
      </div>
    </div>
  );
};

export default App;
