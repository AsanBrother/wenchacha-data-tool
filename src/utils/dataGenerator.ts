/**
 * 数据生成模块
 *
 * 功能：根据用户指定的分布类型和参数，生成批量随机数据
 * 用于学习统计方法、模拟实验数据等场景
 *
 * 支持的分布：
 *   - normal: 正态分布（均值μ，标准差σ）
 *   - uniform: 均匀分布（最小值，最大值）
 *   - exponential: 指数分布（速率λ）
 *   - binomial: 二项分布（试验次数n，成功概率p）
 *
 * 同时提供基础统计量计算功能
 */

import jStat from 'jstat';

export interface StatsData {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  count: number;
  percentiles?: { p10: number; p25: number; p75: number; p90: number };
}

export interface GenerationConfig {
  distribution: 'normal' | 'uniform' | 'exponential' | 'binomial';
  sampleSize: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  rate?: number;
  trials?: number;
  probability?: number;
  decimalPlaces: number;
}

/** 计算数据的基本统计量：均值、中位数、标准差、极值、计数 */
export function calculateStats(data: number[]): StatsData {
  const validData = data.filter(x => !Number.isNaN(x) && Number.isFinite(x));
  const sorted = [...validData].sort((a, b) => a - b);
  const count = validData.length;
  const mean = jStat.mean(validData);
  const median = jStat.median(validData);
  const std = jStat.stdev(validData, true);
  const min = Math.min(...validData);
  const max = Math.max(...validData);

  let percentiles: { p10: number; p25: number; p75: number; p90: number } | undefined;
  if (count >= 10) {
    const p10 = sorted[Math.floor(count * 0.1)];
    const p25 = sorted[Math.floor(count * 0.25)];
    const p75 = sorted[Math.floor(count * 0.75)];
    const p90 = sorted[Math.floor(count * 0.9)];
    percentiles = { p10, p25, p75, p90 };
  }

  return { mean, median, std, min, max, count, percentiles };
}

function generateNormal(mean: number, std: number, size: number): number[] {
  return jStat.normal.sample(mean, std, size);
}

function generateUniform(min: number, max: number, size: number): number[] {
  return Array.from({ length: size }, () => jStat.uniform.sample(min, max));
}

function generateExponential(rate: number, size: number): number[] {
  return jStat.exponential.sample(rate, size);
}

function generateBinomial(trials: number, probability: number, size: number): number[] {
  return Array.from({ length: size }, () => jStat.binomial.sample(trials, probability));
}

/**
 * 根据配置生成数据
 *
 * @param config 包含分布类型、参数、样本量、小数位数的配置对象
 * @returns 生成的数值数组
 */
export function generateData(config: GenerationConfig): number[] {
  let data: number[] = [];

  switch (config.distribution) {
    case 'normal':
      data = generateNormal(config.mean || 0, config.std || 1, config.sampleSize);
      break;
    case 'uniform':
      data = generateUniform(config.min || 0, config.max || 100, config.sampleSize);
      break;
    case 'exponential':
      data = generateExponential(config.rate || 1, config.sampleSize);
      break;
    case 'binomial':
      data = generateBinomial(config.trials || 10, config.probability || 0.5, config.sampleSize);
      break;
  }

  const factor = Math.pow(10, config.decimalPlaces);
  return data.map(d => Math.round(d * factor) / factor);
}
