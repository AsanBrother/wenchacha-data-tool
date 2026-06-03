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
}

export interface DetectionResult {
  testName: string;
  passed: boolean;
  pValue?: number;
  details: string;
  suspiciousIndices?: number[];
  chartData?: { labels: string[]; values: number[] };
}

interface AppState {
  language: 'zh' | 'en';
  currentData: number[] | null;
  detectionResults: DetectionResult[];
  repairedData: number[] | null;
  statsBefore: StatsData | null;
  statsAfter: StatsData | null;
  setLanguage: (lang: 'zh' | 'en') => void;
  setCurrentData: (data: number[] | null) => void;
  setDetectionResults: (results: DetectionResult[]) => void;
  setRepairedData: (data: number[] | null) => void;
  setStatsBefore: (stats: StatsData | null) => void;
  setStatsAfter: (stats: StatsData | null) => void;
}

export const useStore = create<AppState>((set) => ({
  language: 'zh',
  currentData: null,
  detectionResults: [],
  repairedData: null,
  statsBefore: null,
  statsAfter: null,
  setLanguage: (lang) => set({ language: lang }),
  setCurrentData: (data) => set({ currentData: data }),
  setDetectionResults: (results) => set({ detectionResults: results }),
  setRepairedData: (data) => set({ repairedData: data }),
  setStatsBefore: (stats) => set({ statsBefore: stats }),
  setStatsAfter: (stats) => set({ statsAfter: stats }),
}));
