/**
 * 数据修复模块
 *
 * 功能：将检测出的可疑数据替换为合理值，同时保持原有统计特征
 * 策略：
 *   1. 从正常数据中加权随机选取基准值
 *   2. 叠加正态分布噪声（标准差*10%），避免完全重复
 *   3. 保持原始数据的小数位数
 *   4. 若修复后均值偏移>1%标准差，做均值校正
 */

import jStat from 'jstat';
import { StatsData, calculateStats } from './dataGenerator';

interface RepairResult {
  repairedData: number[];
  statsBefore: StatsData;
  statsAfter: StatsData;
}

function generateReplacementValue(
  data: number[],
  stats: StatsData,
  decimalPlaces: number = 2
): number {
  const validData = [...data];
  if (validData.length < 10) {
    const value = jStat.normal.sample(stats.mean, stats.std);
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(value * factor) / factor;
  }

  const weights = validData.map(() => 1 / validData.length);
  const index = weightedRandomChoice(weights);
  const baseValue = validData[index];

  const noise = jStat.normal.sample(0, stats.std * 0.1);
  const value = baseValue + noise;
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(value * factor) / factor;
}

function weightedRandomChoice(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) return i;
  }
  return weights.length - 1;
}

function detectDecimalPlaces(data: number[]): number {
  let maxPlaces = 0;
  data.forEach(num => {
    const str = num.toString();
    const decimalIndex = str.indexOf('.');
    if (decimalIndex !== -1) {
      maxPlaces = Math.max(maxPlaces, str.length - decimalIndex - 1);
    }
  });
  return Math.min(maxPlaces, 4);
}

/**
 * 修复可疑数据
 *
 * @param data 原始数据数组
 * @param suspiciousIndices 可疑数据的索引数组（来自检测结果）
 * @param targetStats 目标统计特征（可选，默认使用原始数据的统计值）
 * @returns 修复结果：包含修复后数据、修复前后统计对比
 */
export function repairData(
  data: number[],
  suspiciousIndices: number[],
  targetStats?: StatsData
): RepairResult {
  const statsBefore = calculateStats(data);
  const decimalPlaces = detectDecimalPlaces(data);
  const repairedData = [...data];

  const toReplace = new Set(suspiciousIndices);

  toReplace.forEach(idx => {
    if (idx >= 0 && idx < data.length) {
      repairedData[idx] = generateReplacementValue(
        repairedData.filter((_, i) => !toReplace.has(i) || i === idx),
        targetStats || statsBefore,
        decimalPlaces
      );
    }
  });

  const currentStats = calculateStats(repairedData);
  const meanDiff = statsBefore.mean - currentStats.mean;

  if (Math.abs(meanDiff) > 0.01 * statsBefore.std) {
    toReplace.forEach(idx => {
      if (idx >= 0 && idx < repairedData.length) {
        repairedData[idx] += meanDiff * 0.5;
        const factor = Math.pow(10, decimalPlaces);
        repairedData[idx] = Math.round(repairedData[idx] * factor) / factor;
      }
    });
  }

  const statsAfter = calculateStats(repairedData);

  return { repairedData, statsBefore, statsAfter };
}
