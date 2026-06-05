/**
 * 全局状态管理（Zustand Store）
 *
 * 管理应用的核心状态：
 *   - 语言设置（中/英切换）
 *   - 当前操作的数据
 *   - 检测结果、修复数据、修复前后统计对比
 *
 * 所有页面组件共享此Store，通过useStore hook访问
 */

import { create } from 'zustand';

export interface StatsData {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  count: number;
  percentiles?: { p10: number; p25: number; p75: number; p90: number };
}

export interface DetectionResult {
  testName: string;
  passed: boolean;
  pValue?: number;
  details: string;
  suspiciousIndices?: number[];
  chartData?: { labels: string[]; values: number[] };
}

export interface RepairRecord {
  index: number;
  originalValue: number;
  repairedValue: number;
  reason: string;
}

interface AppState {
  language: 'zh' | 'en';
  currentData: number[] | null;
  detectionResults: DetectionResult[];
  suspiciousIndices: number[];
  selectedIndices: Set<number>;
  repairedData: number[] | null;
  repairRecords: RepairRecord[];
  statsBefore: StatsData | null;
  statsAfter: StatsData | null;
  setLanguage: (lang: 'zh' | 'en') => void;
  setCurrentData: (data: number[] | null) => void;
  setDetectionResults: (results: DetectionResult[]) => void;
  setSuspiciousIndices: (indices: number[]) => void;
  setSelectedIndices: (indices: Set<number>) => void;
  toggleSelectedIndex: (index: number) => void;
  selectAllSuspicious: () => void;
  clearSelection: () => void;
  setRepairedData: (data: number[] | null, records?: RepairRecord[]) => void;
  setStatsBefore: (stats: StatsData | null) => void;
  setStatsAfter: (stats: StatsData | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  language: 'zh',
  currentData: null,
  detectionResults: [],
  suspiciousIndices: [],
  selectedIndices: new Set(),
  repairedData: null,
  repairRecords: [],
  statsBefore: null,
  statsAfter: null,
  setLanguage: (lang) => set({ language: lang }),
  setCurrentData: (data) => set({ 
    currentData: data,
    suspiciousIndices: [],
    selectedIndices: new Set(),
    repairedData: null,
    repairRecords: []
  }),
  setDetectionResults: (results) => {
    const suspicious = new Set<number>();
    results.forEach(r => r.suspiciousIndices?.forEach(i => suspicious.add(i)));
    set({ 
      detectionResults: results, 
      suspiciousIndices: Array.from(suspicious)
    });
  },
  setSuspiciousIndices: (indices) => set({ suspiciousIndices: indices }),
  setSelectedIndices: (indices) => set({ selectedIndices: indices }),
  toggleSelectedIndex: (index) => {
    const current = get().selectedIndices;
    const next = new Set(current);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    set({ selectedIndices: next });
  },
  selectAllSuspicious: () => {
    const indices = new Set(get().suspiciousIndices);
    set({ selectedIndices: indices });
  },
  clearSelection: () => set({ selectedIndices: new Set() }),
  setRepairedData: (data, records = []) => set({ 
    repairedData: data,
    repairRecords: records
  }),
  setStatsBefore: (stats) => set({ statsBefore: stats }),
  setStatsAfter: (stats) => set({ statsAfter: stats }),
}));
