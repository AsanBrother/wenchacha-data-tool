/**
 * 核心统计检验算法模块
 *
 * 提供5种数据造假检测方法，参考"耿同学"数据打假方法：
 * 1. 末位数字分布检验 - 检测末位数字是否均匀分布（人为编造数据常偏好0和5）
 * 2. 卡方拟合优度检验 - 检测数据整体分布是否异常
 * 3. Benford定律检验 - 检测首位数字是否符合Benford分布（自然数据特征）
 * 4. 重复数据检测 - 检测是否存在大量重复值
 * 5. 等差数列检测 - 检测是否存在明显的等差模式
 */

import jStat from 'jstat';

export interface DetectionResult {
  testName: string;
  passed: boolean;
  pValue?: number;
  details: string;
  suspiciousIndices?: number[];
  chartData?: { labels: string[]; values: number[] };
}

function getLastDigit(num: number): number {
  const str = Math.abs(num).toString();
  const decimalIndex = str.indexOf('.');
  if (decimalIndex !== -1 && decimalIndex < str.length - 1) {
    return parseInt(str[str.length - 1], 10);
  }
  const lastChar = str[str.length - 1];
  return lastChar >= '0' && lastChar <= '9' ? parseInt(lastChar, 10) : 0;
}

function getFirstDigit(num: number): number {
  if (num === 0) return 0;
  const str = Math.abs(num).toString().replace(/[^0-9]/g, '');
  for (let i = 0; i < str.length; i++) {
    if (str[i] !== '0') return parseInt(str[i], 10);
  }
  return 0;
}

/**
 * 末位数字分布检验
 *
 * 原理：真实随机数据的末位数字(0-9)应近似均匀分布，各占约10%
 * 人为编造的数据往往偏好某些数字（如0、5），导致分布不均
 *
 * 方法：卡方拟合优度检验，df=9，显著性水平α=0.05
 * 额外规则：若0和5合计占比>30%，标记这些位置为可疑
 */
export function lastDigitTest(data: number[]): DetectionResult {
  if (data.length < 10) {
    return { testName: 'lastDigit', passed: true, details: '数据量不足，无法进行检验' };
  }

  const lastDigits = data.map(getLastDigit);
  const counts = new Array(10).fill(0);
  lastDigits.forEach(d => { if (d >= 0 && d <= 9) counts[d]++; });

  const expected = data.length / 10;
  let chiSquare = 0;
  counts.forEach(count => { chiSquare += Math.pow(count - expected, 2) / expected; });
  const pValue = 1 - jStat.chisquare.cdf(chiSquare, 9);
  const passed = pValue > 0.05;

  const suspiciousIndices: number[] = [];
  const zeroFiveCount = counts[0] + counts[5];
  const zeroFiveRatio = zeroFiveCount / data.length;
  if (zeroFiveRatio > 0.3) {
    data.forEach((num, idx) => {
      const d = getLastDigit(num);
      if (d === 0 || d === 5) suspiciousIndices.push(idx);
    });
  }

  return {
    testName: 'lastDigit',
    passed,
    pValue,
    details: passed
      ? `末位数字分布符合随机预期 (p=${pValue.toFixed(4)})`
      : `末位数字分布异常 (p=${pValue.toFixed(4)})，0和5出现${zeroFiveCount}次，占比${(zeroFiveRatio * 100).toFixed(1)}%`,
    suspiciousIndices: suspiciousIndices.length > 0 ? suspiciousIndices : undefined,
    chartData: { labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], values: counts }
  };
}

/**
 * 卡方拟合优度检验
 *
 * 原理：将数据按值域等分为10个区间，检验各区间的观测频数与期望频数差异
 * 若差异过大(p<0.05)，说明数据分布不符合均匀或正态预期
 *
 * 方法：将[min,max]分为bins个区间，卡方检验，df=bins-1
 */
export function chiSquareTest(data: number[], bins = 10): DetectionResult {
  if (data.length < 20) {
    return { testName: 'chiSquare', passed: true, details: '数据量不足，无法进行检验' };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / bins;

  const observed = new Array(bins).fill(0);
  data.forEach(d => {
    let binIndex = Math.floor((d - min) / binWidth);
    if (binIndex === bins) binIndex--;
    binIndex = Math.max(0, Math.min(bins - 1, binIndex));
    observed[binIndex]++;
  });

  const expected = data.length / bins;
  let chiSquare = 0;
  observed.forEach(count => { chiSquare += Math.pow(count - expected, 2) / expected; });

  const pValue = 1 - jStat.chisquare.cdf(chiSquare, bins - 1);
  const passed = pValue > 0.05;

  return {
    testName: 'chiSquare',
    passed,
    pValue,
    details: passed
      ? `数据分布符合预期 (p=${pValue.toFixed(4)})`
      : `数据分布异常 (p=${pValue.toFixed(4)})`,
    chartData: {
      labels: Array.from({ length: bins }, (_, i) =>
        `${(min + i * binWidth).toFixed(1)}-${(min + (i + 1) * binWidth).toFixed(1)}`
      ),
      values: observed
    }
  };
}

/**
 * Benford定律检验
 *
 * 原理：自然产生的数值数据中，首位数字服从Benford分布：
 *   P(d)=log10(1+1/d)，即1出现约30.1%，2约17.6%，...，9约4.6%
 * 人为编造的数据通常不满足此规律
 *
 * 适用条件：仅对正值有效，建议样本量>=50
 * 方法：卡方检验，df=8（首位数字1-9共9类）
 */
export function benfordTest(data: number[]): DetectionResult {
  const positiveData = data.filter(d => d > 0);
  if (positiveData.length < 50) {
    return { testName: 'benford', passed: true, details: '正数据量不足，无法进行Benford检验' };
  }

  const benfordExpected = [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];
  const firstDigits = positiveData.map(getFirstDigit).filter(d => d >= 1 && d <= 9);

  const counts = new Array(10).fill(0);
  firstDigits.forEach(d => { counts[d]++; });

  const total = firstDigits.length;
  let chiSquare = 0;
  for (let d = 1; d <= 9; d++) {
    const observed = counts[d];
    const expected = total * benfordExpected[d];
    chiSquare += Math.pow(observed - expected, 2) / expected;
  }

  const pValue = 1 - jStat.chisquare.cdf(chiSquare, 8);
  const passed = pValue > 0.05;

  return {
    testName: 'benford',
    passed,
    pValue,
    details: passed
      ? `符合Benford定律 (p=${pValue.toFixed(4)})`
      : `不符合Benford定律 (p=${pValue.toFixed(4)})，数据可能存在异常`,
    chartData: { labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], values: counts.slice(1) }
  };
}

/**
 * 重复数据检测
 *
 * 原理：真实实验数据中，同一精确值重复出现超过3次的概率很低
 * 大量高精度重复值暗示数据可能是复制粘贴生成的
 *
 * 阈值：某值出现次数>3时标记为可疑；可疑数据占比>20%则判定异常
 */
export function duplicateDetection(data: number[]): DetectionResult {
  const valueCounts = new Map<number, number>();
  const suspiciousIndices: number[] = [];

  data.forEach((num, idx) => {
    const count = valueCounts.get(num) || 0;
    valueCounts.set(num, count + 1);
  });

  let duplicateCount = 0;
  data.forEach((num, idx) => {
    if (valueCounts.get(num)! > 3) {
      duplicateCount++;
      suspiciousIndices.push(idx);
    }
  });

  const duplicateRatio = duplicateCount / data.length;
  const passed = duplicateRatio < 0.2;

  return {
    testName: 'duplicate',
    passed,
    details: passed
      ? `重复数据比例正常 (${(duplicateRatio * 100).toFixed(1)}%)`
      : `重复数据异常 (${(duplicateRatio * 100).toFixed(1)}%)，共有${duplicateCount}个数据出现3次以上`,
    suspiciousIndices: suspiciousIndices.length > 0 ? suspiciousIndices : undefined
  };
}

/**
 * 等差数列检测
 *
 * 原理：人为编造的连续数据常呈现固定步长（如每次+0.5）
 * 计算相邻元素的差值，检测是否有过多相同的差值
 *
 * 判定标准（满足任一即异常）：
 *   1. 最大相同差值占比>50%
 *   2. 存在连续>=5个相同差值的序列
 */
export function arithmeticProgressionTest(data: number[]): DetectionResult {
  if (data.length < 10) {
    return { testName: 'arithmetic', passed: true, details: '数据量不足，无法进行检验' };
  }

  const differences: number[] = [];
  for (let i = 1; i < data.length; i++) {
    differences.push(data[i] - data[i - 1]);
  }

  const diffCounts = new Map<number, number>();
  differences.forEach(d => {
    const key = Math.round(d * 1000) / 1000;
    diffCounts.set(key, (diffCounts.get(key) || 0) + 1);
  });

  let maxCount = 0;
  let maxDiff = 0;
  diffCounts.forEach((count, diff) => {
    if (count > maxCount) { maxCount = count; maxDiff = diff; }
  });

  const suspiciousIndices: number[] = [];
  let consecutiveSame = 1;
  for (let i = 1; i < differences.length; i++) {
    if (Math.abs(differences[i] - differences[i - 1]) < 0.001) {
      consecutiveSame++;
      if (consecutiveSame >= 5) {
        for (let j = i - consecutiveSame + 1; j <= i + 1; j++) {
          if (!suspiciousIndices.includes(j)) suspiciousIndices.push(j);
        }
      }
    } else {
      consecutiveSame = 1;
    }
  }

  const sameDiffRatio = maxCount / differences.length;
  const passed = sameDiffRatio < 0.5 && suspiciousIndices.length === 0;

  return {
    testName: 'arithmetic',
    passed,
    details: passed
      ? '未发现明显的等差数列模式'
      : `检测到可能的等差数列模式，差异${maxDiff}出现${maxCount}次，占比${(sameDiffRatio * 100).toFixed(1)}%`,
    suspiciousIndices: suspiciousIndices.length > 0 ? suspiciousIndices : undefined
  };
}

/** 执行全部5种检验，返回结果数组 */
export function runAllTests(data: number[]): DetectionResult[] {
  return [
    lastDigitTest(data),
    chiSquareTest(data),
    benfordTest(data),
    duplicateDetection(data),
    arithmeticProgressionTest(data)
  ];
}
