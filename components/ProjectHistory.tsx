import React, { useState, useCallback } from 'react';
import { deleteProjectFromDB } from '../services/storageService';
import type { ShopeeProject, ShopeeAppState } from '../types/shopee';

const STORAGE_KEY = 'shopee-projects-v1';
const MAX_PROJECTS = 20;

// ============================================================================
// Helpers
// ============================================================================

export function loadProjects(): ShopeeProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProject(project: ShopeeProject): void {
  const projects = loadProjects().filter((p) => p.id !== project.id);
  projects.unshift({ ...project, updatedAt: Date.now() });
  if (projects.length > MAX_PROJECTS) projects.length = MAX_PROJECTS;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function deleteProject(id: string): ShopeeProject[] {
  const projects = loadProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return projects;
}

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  material_pending: '素材處理中',
  listing_ready: 'Listing 就緒',
  generating: '生成中',
  completed: '已完成',
  partial: '部分完成',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-500/20 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-500/30',
  material_pending: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30',
  listing_ready: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500/30',
  generating: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-500/30',
  completed: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-500/30',
  partial: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/30',
};

// ============================================================================
// Props
// ============================================================================

interface ProjectHistoryProps {
  projects: ShopeeProject[];
  activeProjectId: string | null;
  onSelect: (project: ShopeeProject) => void;
  onDelete: (id: string) => void;
  onNewProject: () => void;
  onProjectsChange: (projects: ShopeeProject[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export const ProjectHistory: React.FC<ProjectHistoryProps> = ({
  projects,
  activeProjectId,
  onSelect,
  onDelete,
  onNewProject,
  onProjectsChange,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = useCallback(
    (id: string) => {
      if (confirmDelete === id) {
        const updated = deleteProject(id);
        deleteProjectFromDB(id).catch(() => {});
        onProjectsChange(updated);
        onDelete(id);
        setConfirmDelete(null);
      } else {
        setConfirmDelete(id);
        setTimeout(() => setConfirmDelete(null), 3000);
      }
    },
    [confirmDelete, onDelete, onProjectsChange],
  );

  const hasActive = activeProjectId && projects.some((p) => p.id === activeProjectId);

  return (
    <div
      className={`flex-shrink-0 transition-all duration-300 border-r border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0d10] flex flex-col sticky top-0 h-screen overflow-y-auto ${
        expanded ? 'w-[280px]' : 'w-[40px]'
      }`}
    >
      {/* Toggle + Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-white/5">
        {expanded && (
          <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">歷史項目</h3>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors p-1"
          title={expanded ? '折疊' : '展開'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <>
          {/* New Project Button */}
          <button
            onClick={onNewProject}
            className="mx-3 mt-3 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建項目
          </button>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto mt-2">
            {projects.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-gray-400 dark:text-gray-600">尚無歷史項目</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-700 mt-1">上傳產品並開始分析後，項目會自動保存在此</p>
              </div>
            ) : (
              projects.map((project) => {
                const isActive = project.id === activeProjectId;
                return (
                  <div
                    key={project.id}
                    className={`mx-2 mb-1 rounded-lg border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-purple-100 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/30'
                        : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-white/[0.03] hover:border-gray-200 dark:hover:border-white/5'
                    }`}
                    onClick={() => onSelect(project)}
                  >
                    <div className="flex items-center gap-3 p-2">
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-[#15151a] border border-gray-300 dark:border-white/5 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {project.products?.[0]?.imageBase64 ? (
                          <img
                            src={project.products[0].imageBase64}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-4 h-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {project.projectName || project.products?.[0]?.name || '未命名'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[9px] px-1.5 py-0 rounded-full border font-bold ${
                              STATUS_COLORS[project.status] || STATUS_COLORS.draft
                            }`}
                          >
                            {STATUS_LABELS[project.status] || project.status}
                          </span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-600">
                            {new Date(project.updatedAt).toLocaleDateString('zh-TW')}
                          </span>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                        className={`text-[10px] p-1 rounded transition-colors flex-shrink-0 ${
                          confirmDelete === project.id
                            ? 'text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-500/10'
                            : 'text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10'
                        }`}
                        title={confirmDelete === project.id ? '再點一次確認刪除' : '刪除'}
                      >
                        {confirmDelete === project.id ? '確認?' : '✕'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 dark:border-white/5">
            <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">
              {projects.length} / {MAX_PROJECTS} 個項目 · 自動保存
            </p>
          </div>
        </>
      )}
    </div>
  );
};
