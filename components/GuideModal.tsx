import React from 'react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-[#1a1a1f] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-900/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="p-8">
          <div className="flex items-center space-x-4 mb-2">
            <div className="h-10 w-1 bg-white/30 rounded-full" />
            <h2 className="text-3xl font-bold text-white">功能導覽 v0.9</h2>
            <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold uppercase rounded">Shopee 版</span>
          </div>
          <p className="text-gray-400 text-sm mb-8">台灣蝦皮商品圖片生成器：從產品照片到完整 Listing 的一站式工作流。</p>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-lg border border-purple-600/30">1</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">產品資訊輸入</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  上傳產品圖片，填寫產品名稱、品牌背景、產品類型（護膚/美妝/髮品/身體護理）、規格、容量、產品特色、適用場景，並從 <strong>20 種視覺風格</strong>中選擇最適合的風格。進階選項支援 SKU 組合與自訂備註。
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-600/30">2</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Phase 1: 視覺策略制定</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  AI 總監分析產品圖片與資訊，生成 <strong>3 條差異化視覺行銷路線</strong>。每條路線包含策略名稱、主副標題、目標客群、視覺元素建議與對應的 20 種視覺風格。
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-600/20 text-pink-400 flex items-center justify-center font-bold text-lg border border-pink-600/30">3</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Phase 2: 素材預處理 + Listing 生成</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">選定策略路線後，系統會同步執行：</p>
                <ul className="list-disc list-inside text-xs text-gray-500 space-y-1 ml-1">
                  <li><strong>圖片文字識別</strong>：自動檢測產品圖片中的文字，風險分級（高/中/低），支援勾選後批量標記模糊區域</li>
                  <li><strong>Canvas 模糊工具</strong>：拖曳框選需遮蔽的敏感文字，匯出處理後的產品底圖</li>
                  <li><strong>5 個 SEO 標題</strong>：每個 ≥ 50 中文字，5 種不同切入點，台灣 Gen Z 語感</li>
                  <li><strong>產品描述 + CTA</strong>：親切大姐姐語氣，2-4 段手機友善段落</li>
                  <li><strong>6 張主圖 Prompt</strong>（1024×1024）+ <strong>4-6 張詳情圖 Prompt</strong>（1024×1536）</li>
                  <li><strong>合規檢查</strong>：50+ 禁用詞自動替換（美白→透亮感、抗皺→熟齡保養感 等）</li>
                </ul>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-600/20 text-green-400 flex items-center justify-center font-bold text-lg border border-green-600/30">4</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Phase 3: 圖片生產</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  逐一生成圖片。主圖（1:1，1024×1024）、詳情圖（2:3，1024×1536）、SKU 圖（可選）。每張圖片支援單獨重新生成、放大檢視、單張下載。使用處理後的產品底圖作為所有圖片的參考，確保一致性。
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-600/20 text-yellow-400 flex items-center justify-center font-bold text-lg border border-yellow-600/30">5</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">下載與匯出</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  下載完整的 <strong>Shopee Listing 報告</strong>（.txt），包含 SEO 標題、產品描述、所有圖片 Prompt、合規檢查結果。每張圖片可單獨下載為 PNG。
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex justify-end">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl active:scale-95"
            >
              開始體驗 v0.9
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
