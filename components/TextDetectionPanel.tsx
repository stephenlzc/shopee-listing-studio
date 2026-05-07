import React, { useState, useMemo } from 'react';
import type { VisionAnalysisResult, BlurRegion, RiskLevel } from '../types/shopee';

// ============================================================================
// Props
// ============================================================================

interface TextDetectionPanelProps {
  visionResult: VisionAnalysisResult;
  onSelectionChange?: (regions: BlurRegion[]) => void;
}

// ============================================================================
// Risk Badge
// ============================================================================

const RiskBadge: React.FC<{ level: RiskLevel }> = ({ level }) => {
  const colors: Record<string, string> = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  const labels: Record<string, string> = { high: '高風險', medium: '中風險', low: '低風險' };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${colors[level]}`}>
      {labels[level]}
    </span>
  );
};

// ============================================================================
// Component
// ============================================================================

export const TextDetectionPanel: React.FC<TextDetectionPanelProps> = ({
  visionResult,
  onSelectionChange,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [filterLevel, setFilterLevel] = useState<'all' | RiskLevel>('all');

  // Filter texts by risk level
  const filteredTexts = useMemo(() => {
    if (filterLevel === 'all') return visionResult.detectedTexts;
    return visionResult.detectedTexts.filter((t) => t.riskLevel === filterLevel);
  }, [visionResult.detectedTexts, filterLevel]);

  // Count by risk
  const counts = useMemo(() => {
    let high = 0, medium = 0, low = 0;
    for (const t of visionResult.detectedTexts) {
      if (t.riskLevel === 'high') high++;
      else if (t.riskLevel === 'medium') medium++;
      else low++;
    }
    return { high, medium, low };
  }, [visionResult.detectedTexts]);

  // Toggle selection
  const toggleIndex = (globalIndex: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(globalIndex)) next.delete(globalIndex);
      else next.add(globalIndex);

      // Convert to BlurRegion array
      const regions: BlurRegion[] = [];
      next.forEach((idx) => {
        const text = visionResult.detectedTexts[idx];
        if (text?.boundingBox) {
          // Normalize to 0-1 (assume ~512px reference)
          regions.push({
            x: Math.max(0, (text.boundingBox.x - 10) / 512),
            y: Math.max(0, (text.boundingBox.y - 5) / 512),
            width: Math.min(1, (text.boundingBox.width + 20) / 512),
            height: Math.min(1, (text.boundingBox.height + 10) / 512),
          });
        }
      });
      onSelectionChange?.(regions);
      return next;
    });
  };

  // Select all high risk
  const selectAllHigh = () => {
    const newSet = new Set<number>();
    visionResult.detectedTexts.forEach((t, i) => {
      if (t.riskLevel === 'high') newSet.add(i);
    });
    setSelectedIndices(newSet);
    const regions: BlurRegion[] = [];
    newSet.forEach((idx) => {
      const text = visionResult.detectedTexts[idx];
      if (text?.boundingBox) {
        regions.push({
          x: Math.max(0, (text.boundingBox.x - 10) / 512),
          y: Math.max(0, (text.boundingBox.y - 5) / 512),
          width: Math.min(1, (text.boundingBox.width + 20) / 512),
          height: Math.min(1, (text.boundingBox.height + 10) / 512),
        });
      }
    });
    onSelectionChange?.(regions);
  };

  // No detection results
  if (visionResult.detectedTexts.length === 0) {
    return (
      <div className="bg-[#15151a] border border-white/10 rounded-xl p-6 text-center">
        <p className="text-gray-400 text-sm">未檢測到圖片文字，無需模糊處理。</p>
        {visionResult.rawResponse && (
          <details className="mt-2 text-left">
            <summary className="text-xs text-gray-500 cursor-pointer">原始回應</summary>
            <pre className="text-[10px] text-gray-600 mt-2 whitespace-pre-wrap">{visionResult.rawResponse.substring(0, 500)}</pre>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with counts and filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-bold text-white">文字識別結果</span>
        <div className="flex gap-1">
          <button
            onClick={() => setFilterLevel('all')}
            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold transition-colors ${
              filterLevel === 'all' ? 'bg-white/10 text-white border-white/20' : 'text-gray-500 border-white/5 hover:text-gray-300'
            }`}
          >
            全部 ({visionResult.detectedTexts.length})
          </button>
          {counts.high > 0 && (
            <button
              onClick={() => setFilterLevel('high')}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-bold transition-colors ${
                filterLevel === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'text-gray-500 border-white/5 hover:text-red-400'
              }`}
            >
              高風險 ({counts.high})
            </button>
          )}
          {counts.medium > 0 && (
            <button
              onClick={() => setFilterLevel('medium')}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-bold transition-colors ${
                filterLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'text-gray-500 border-white/5 hover:text-yellow-400'
              }`}
            >
              中風險 ({counts.medium})
            </button>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={selectAllHigh}
            disabled={counts.high === 0}
            className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            全選高風險
          </button>
        </div>
      </div>

      {/* Text list */}
      <div className="bg-[#15151a] border border-white/10 rounded-xl overflow-hidden">
        <div className="max-h-[320px] overflow-y-auto">
          {filteredTexts.map((text, filteredIndex) => {
            // Find global index
            const globalIndex = visionResult.detectedTexts.indexOf(text);
            const isSelected = selectedIndices.has(globalIndex);
            return (
              <label
                key={globalIndex}
                className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 cursor-pointer transition-colors ${
                  isSelected ? 'bg-purple-500/10' : 'hover:bg-white/[0.02]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleIndex(globalIndex)}
                  className="rounded border-gray-600 bg-black/30 text-purple-600 focus:ring-purple-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{text.text}</p>
                  {text.reason && (
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{text.reason}</p>
                  )}
                </div>
                <RiskBadge level={text.riskLevel} />
              </label>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-500">
        選取的文字將作為模糊區域的參考位置。
        {selectedIndices.size > 0 && (
          <span className="text-purple-400 ml-2">{selectedIndices.size} 個已選取</span>
        )}
      </div>
    </div>
  );
};
