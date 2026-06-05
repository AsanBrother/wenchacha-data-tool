import jStat from 'jstat';
import { StatsData, calculateStats } from './dataGenerator';

export interface RepairResult {
  repairedData: number[];
  statsBefore: StatsData;
  statsAfter: StatsData;
  repairRecords: RepairRecord[];
}

export interface RepairRecord {
  index: number;
  originalValue: number;
  repairedValue: number;
  reason: string;
  method: string;
}

export interface RepairStrategy {
  name: string;
  description: string;
  /** 生成替换值的核心函数 */
  generate: (
    data: number[],
    stats: StatsData,
    index: number,
    decimalPlaces: number
  ) => number;
  /** 修正整体统计特征的后置处理 */
  postProcess?: (
    repairedData: number[],
    indices: Set<number>,
    targetStats: StatsData,
    decimalPlaces: number
  ) => number[];
}

/**
 * 策略1：分布内插值（推荐）
 * 基于四分位数位置，从数据本身的分布特征生成合理值
 */
const strategyDistribution: RepairStrategy = {
  name: 'distribution',
  description: '基于数据分布特征生成替换值',
  generate: (data, stats, index, decimalPlaces) => {
    const sorted = [...data].sort((a, b) => a - b);
    const len = sorted.length;
    
    if (len < 20) {
      return strategySample.generate(data, stats, index, decimalPlaces);
    }
    
    const pos = Math.random();
    let targetIdx: number;
    if (pos < 0.1) {
      targetIdx = Math.floor(len * (0.05 + Math.random() * 0.05));
    } else if (pos < 0.25) {
      targetIdx = Math.floor(len * (0.1 + Math.random() * 0.15));
    } else if (pos < 0.75) {
      targetIdx = Math.floor(len * (0.25 + Math.random() * 0.5));
    } else if (pos < 0.9) {
      targetIdx = Math.floor(len * (0.75 + Math.random() * 0.15));
    } else {
      targetIdx = Math.floor(len * (0.9 + Math.random() * 0.05));
    }
    
    targetIdx = Math.max(0, Math.min(len - 1, targetIdx));
    const baseValue = sorted[targetIdx];
    const noise = jStat.normal.sample(0, stats.std * 0.08);
    
    const value = baseValue + noise;
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(value * factor) / factor;
  }
};

/**
 * 策略2：正常数据采样
 * 从非可疑数据中加权随机选取
 */
const strategySample: RepairStrategy = {
  name: 'sample',
  description: '从正常数据中采样替换',
  generate: (data, stats, index, decimalPlaces) => {
    const validData = [...data].filter(x => !Number.isNaN(x) && Number.isFinite(x));
    if (validData.length < 5) {
      const value = jStat.normal.sample(stats.mean, stats.std);
      const factor = Math.pow(10, decimalPlaces);
      return Math.round(Math.max(stats.min, Math.min(stats.max, value)) * factor) / factor;
    }
    
    const weights = validData.map((v, i) => {
      const distFromMean = Math.abs(v - stats.mean);
      const distWeight = Math.max(0.1, 1 - (distFromMean / (stats.std * 3)));
      const edgeBonus = (i === 0 || i === validData.length - 1) ? 0.8 : 1;
      return distWeight * edgeBonus;
    });
    
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let selectedIdx = 0;
    
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedIdx = i;
        break;
      }
    }
    
    const baseValue = validData[selectedIdx];
    const noise = jStat.normal.sample(0, stats.std * 0.05);
    
    const value = baseValue + noise;
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(value * factor) / factor;
  }
};

/**
 * 策略3：统计重采样
 * 保留整体统计特征的精细重采样
 */
const strategyStatistical: RepairStrategy = {
  name: 'statistical',
  description: '精细统计重采样，确保整体特征不变',
  generate: (data, stats, index, decimalPlaces) => {
    const sorted = [...data].sort((a, b) => a - b);
    const len = sorted.length;
    const p = Math.random();
    
    let sample: number;
    if (p < 0.02) {
      sample = jStat.uniform.sample(stats.min, stats.min + (stats.max - stats.min) * 0.1);
    } else if (p < 0.15) {
      const q1 = sorted[Math.floor(len * 0.25)];
      sample = jStat.uniform.sample(stats.min, q1);
    } else if (p < 0.85) {
      const q1 = sorted[Math.floor(len * 0.25)];
      const q3 = sorted[Math.floor(len * 0.75)];
      sample = jStat.uniform.sample(q1, q3);
    } else if (p < 0.98) {
      const q3 = sorted[Math.floor(len * 0.75)];
      sample = jStat.uniform.sample(q3, stats.max);
    } else {
      sample = jStat.uniform.sample(stats.max - (stats.max - stats.min) * 0.1, stats.max);
    }
    
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(sample * factor) / factor;
  },
  postProcess: (repairedData, indices, targetStats, decimalPlaces) => {
    const currentStats = calculateStats(repairedData);
    const result = [...repairedData];
    const factor = Math.pow(10, decimalPlaces);
    
    if (Math.abs(currentStats.mean - targetStats.mean) > targetStats.std * 0.02) {
      const meanAdjustment = targetStats.mean - currentStats.mean;
      const adjustAmount = meanAdjustment / (indices.size || 1);
      
      indices.forEach(idx => {
        if (idx >= 0 && idx < result.length) {
          result[idx] += adjustAmount;
          result[idx] = Math.round(result[idx] * factor) / factor;
        }
      });
    }
    
    return result;
  }
};

const defaultStrategy = strategyStatistical;

function detectDecimalPlaces(data: number[]): number {
  let maxPlaces = 0;
  data.forEach(num => {
    if (Number.isFinite(num)) {
      const str = num.toString();
      const decimalIndex = str.indexOf('.');
      if (decimalIndex !== -1) {
        maxPlaces = Math.max(maxPlaces, str.length - decimalIndex - 1);
      }
    }
  });
  return Math.min(maxPlaces, 6);
}

function getReasonForIndex(index: number, data: number[], detectionResults: any[]): string {
  const reasons: string[] = [];
  
  detectionResults.forEach(r => {
    if (r.suspiciousIndices?.includes(index)) {
      reasons.push(r.testName);
    }
  });
  
  if (reasons.length === 0) {
    return 'user selected';
  }
  
  return reasons.join(', ');
}

export function repairData(
  data: number[],
  indicesToRepair: Set<number>,
  detectionResults: any[],
  strategy: RepairStrategy = defaultStrategy
): RepairResult {
  const statsBefore = calculateStats(data);
  const decimalPlaces = detectDecimalPlaces(data);
  const repairedData = [...data];
  const repairRecords: RepairRecord[] = [];
  
  const indices = Array.from(indicesToRepair).sort((a, b) => a - b);
  
  indices.forEach(idx => {
    if (idx >= 0 && idx < data.length) {
      const originalValue = repairedData[idx];
      const repairedValue = strategy.generate(repairedData, statsBefore, idx, decimalPlaces);
      
      repairedData[idx] = repairedValue;
      
      repairRecords.push({
        index: idx,
        originalValue,
        repairedValue,
        reason: getReasonForIndex(idx, data, detectionResults),
        method: strategy.name
      });
    }
  });
  
  let finalData = repairedData;
  if (strategy.postProcess) {
    finalData = strategy.postProcess(finalData, indicesToRepair, statsBefore, decimalPlaces);
  }
  
  const currentStats = calculateStats(finalData);
  const meanDiff = statsBefore.mean - currentStats.mean;
  const factor = Math.pow(10, decimalPlaces);
  
  if (Math.abs(meanDiff) > statsBefore.std * 0.01 && indices.length > 0) {
    const adjustPerIndex = meanDiff / indices.length;
    indices.forEach(idx => {
      if (idx >= 0 && idx < finalData.length) {
        finalData[idx] += adjustPerIndex;
        finalData[idx] = Math.round(finalData[idx] * factor) / factor;
        
        const record = repairRecords.find(r => r.index === idx);
        if (record) {
          record.repairedValue = finalData[idx];
        }
      }
    });
  }
  
  const statsAfter = calculateStats(finalData);
  
  return {
    repairedData: finalData,
    statsBefore,
    statsAfter,
    repairRecords
  };
}

export function repairDataAutomatically(
  data: number[],
  detectionResults: any[]
): RepairResult {
  const suspiciousIndices = new Set<number>();
  detectionResults.forEach(r => {
    r.suspiciousIndices?.forEach(i => suspiciousIndices.add(i));
  });
  
  return repairData(data, suspiciousIndices, detectionResults, defaultStrategy);
}
