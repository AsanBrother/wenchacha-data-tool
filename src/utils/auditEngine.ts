/**
 * 耿同学学术打假方法论 - 完整审计引擎
 *
 * 基于 research-integrity-auditor (https://github.com/cylqwe7855-alt/research-integrity-auditor)
 * 和虎嗅网文章"我Skill化了耿同学的'学术打假方法论'"实现
 *
 * 7大检查维度（来自 geng-methodology.md）：
 *   1. 图片造假识别：同一底片，不同结果
 *   2. 数据重复识别：复制粘贴和低级改写痕迹
 *   3. 末位数字分析：人脑编数痕迹
 *   4. 数学关系检查：生成方向是否反了
 *   5. 分布和趋势检查：曲线是否过于同款
 *   6. 实验常识检查：数据是否像实验产生的
 *   7. 作者回应反查：解释压力测试
 *
 * 风险分级（来自 SKILL.md）：
 *   Low: 无强异常，仅弱或可解释信号
 *   Medium: 多个弱-中等异常需人工复核
 *   High: 多条独立证据线一致
 *   Critical: 图像身份冲突 + 数字生成伪影 + 反推数据关系
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface EvidenceEntry {
  id: string;
  category: AuditCategory;
  testName: string;
  riskLevel: RiskLevel;
  evidence: string;
  method: string;
  suspiciousIndices?: number[];
  benignExplanation?: string;
  pressureTestResult?: string;
  confidence: number;
  recommendation: string;
}

export type AuditCategory =
  | 'image_identity'
  | 'data_duplication'
  | 'terminal_digit'
  | 'math_consistency'
  | 'distribution'
  | 'domain_sanity'
  | 'defense_test';

export interface AuditReport {
  overallRiskLevel: RiskLevel;
  summary: string;
  findings: EvidenceEntry[];
  evidenceLedger: EvidenceEntry[];
  timestamp: string;
  dataSummary: {
    totalNumbers: number;
    tableCount: number;
    sampleSize: number;
  };
  limitations: string[];
}

const CATEGORY_LABELS: Record<AuditCategory, { zh: string; en: string }> = {
  image_identity: { zh: '图片身份冲突', en: 'Image Identity Conflict' },
  data_duplication: { zh: '数据重复检测', en: 'Data Duplication' },
  terminal_digit: { zh: '末位数字分析', en: 'Terminal Digit Analysis' },
  math_consistency: { zh: '数学一致性检查', en: 'Math Consistency Check' },
  distribution: { zh: '分布趋势分析', en: 'Distribution Analysis' },
  domain_sanity: { zh: '实验常识检验', en: 'Domain Sanity Check' },
  defense_test: { zh: '良性解释压力测试', en: 'Defense Pressure Test' },
};

const RISK_LABELS: Record<RiskLevel, { zh: string; en: string; color: string }> = {
  low: { zh: '低风险', en: 'Low Risk', color: '#22c55e' },
  medium: { zh: '中风险', en: 'Medium Risk', color: '#f59e0b' },
  high: { zh: '高风险', en: 'High Risk', color: '#ef4444' },
  critical: { zh: '严重风险', en: 'Critical Risk', color: '#991b1b' },
};

function generateId(): string {
  return `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getTerminalDigit(num: number): number | null {
  const str = Math.abs(num).toString();
  const decimalIndex = str.indexOf('.');
  if (decimalIndex !== -1 && decimalIndex < str.length - 1) {
    const lastChar = str[str.length - 1];
    return lastChar >= '0' && lastChar <= '9' ? parseInt(lastChar, 10) : null;
  }
  const lastChar = str[str.length - 1];
  return lastChar >= '0' && lastChar <= '9' ? parseInt(lastChar, 10) : null;
}

function getFirstDigit(num: number): number | null {
  if (num === 0) return null;
  const str = Math.abs(num).toString().replace(/[^0-9]/g, '');
  for (let i = 0; i < str.length; i++) {
    if (str[i] !== '0') return parseInt(str[i], 10);
  }
  return null;
}

interface DuplicateAnalysis {
  repeatedValues: { value: string; count: number }[];
  repeatedFractionalParts: { fractionalPart: string; count: number }[];
  maxRepeatCount: number;
  duplicateRatio: number;
}

function analyzeDuplicates(data: number[]): DuplicateAnalysis {
  const valueMap = new Map<string, number>();
  const fractionalMap = new Map<string, number>();

  data.forEach(num => {
    const strVal = num.toString();
    valueMap.set(strVal, (valueMap.get(strVal) || 0) + 1);

    const str = num.toString();
    if (str.includes('.')) {
      const frac = str.split('.')[1];
      fractionalMap.set(frac, (fractionalMap.get(frac) || 0) + 1);
    }
  });

  const repeatedValues = Array.from(valueMap.entries())
    .filter(([, count]) => count >= 3)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const repeatedFractionalParts = Array.from(fractionalMap.entries())
    .filter(([, count]) => count >= 3)
    .map(([fractionalPart, count]) => ({ fractionalPart, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const maxRepeatCount = repeatedValues.length > 0 ? repeatedValues[0].count : 0;
  const duplicateRatio = data.length > 0 ? maxRepeatCount / data.length : 0;

  return { repeatedValues, repeatedFractionalParts, maxRepeatCount, duplicateRatio };
}

interface DigitAnalysis {
  terminalCounts: Record<string, number>;
  zeroFiveRate: number;
  firstDigitCounts: Record<string, number>;
  chiSquareStat: number;
  chiSquarePValue: number;
  sampleSize: number;
}

function analyzeDigits(data: number[], minSampleSize = 10): DigitAnalysis {
  const terminals: (number | null)[] = data.map(getTerminalDigit);
  const validTerminals = terminals.filter((d): d is number => d !== null);
  const terminalCounts: Record<string, number> = {};
  validTerminals.forEach(d => { terminalCounts[String(d)] = (terminalCounts[String(d)] || 0) + 1; });

  const n = validTerminals.length;
  const zero05Count = (terminalCounts['0'] || 0) + (terminalCounts['5'] || 0);
  const zeroFiveRate = n > 0 ? zero05Count / n : 0;

  const firstDigits: (number | null)[] = data.map(getFirstDigit);
  const validFirstDigits = firstDigits.filter((d): d is number => d !== null);
  const firstDigitCounts: Record<string, number> = {};
  validFirstDigits.forEach(d => { firstDigitCounts[String(d)] = (firstDigitCounts[String(d)] || 0) + 1; });

  let chiSquare = 0;
  for (let d = 0; d <= 9; d++) {
    const observed = terminalCounts[String(d)] || 0;
    const expected = n / 10;
    chiSquare += Math.pow(observed - expected, 2) / expected;
  }

  const pValue = n >= minSampleSize
    ? 1 - chiSquareCDF(chiSquare, 9)
    : NaN;

  return { terminalCounts, zeroFiveRate, firstDigitCounts, chiSquareStat: chiSquare, chiSquarePValue: pValue, sampleSize: n };
}

interface BenfordAnalysis {
  applicable: boolean;
  reason: string;
  sampleSize: number;
  ordersOfMagnitude: number;
  observed: Record<string, number>;
  expected: Record<string, number>;
  meanAbsoluteDeviation: number;
  pValue?: number;
}

function benfordAnalysis(data: number[]): BenfordAnalysis {
  const positiveData = data.filter(d => d > 0);
  if (positiveData.length < 50) {
    return {
      applicable: false,
      reason: `正数据量不足 (${positiveData.length} < 50)`,
      sampleSize: positiveData.length,
      ordersOfMagnitude: 0,
      observed: {},
      expected: {},
      meanAbsoluteDeviation: 0,
    };
  }

  const minVal = Math.min(...positiveData);
  const maxVal = Math.max(...positiveData);
  const ratio = minVal > 0 ? maxVal / minVal : Infinity;
  const orders = ratio > 0 ? Math.log10(ratio) : 0;

  const applicable = positiveData.length >= 100 && orders >= 2;

  const benfordExpected: Record<string, number> = {};
  for (let d = 1; d <= 9; d++) {
    benfordExpected[String(d)] = Math.log10(1 + 1 / d);
  }

  const counts: Record<string, number> = {};
  positiveData.forEach(num => {
    const digit = getFirstDigit(num);
    if (digit !== null) counts[String(digit)] = (counts[String(digit)] || 0) + 1;
  });

  const n = positiveData.length;
  const observed: Record<string, number> = {};
  for (let d = 1; d <= 9; d++) {
    observed[String(d)] = (counts[String(d)] || 0) / n;
  }

  let mad = 0;
  for (let d = 1; d <= 9; d++) {
    mad += Math.abs((observed[String(d)] || 0) - (benfordExpected[String(d)] || 0));
  }
  mad /= 9;

  let chiSquare = 0;
  for (let d = 1; d <= 9; d++) {
    const obs = counts[String(d)] || 0;
    const exp = n * benfordExpected[String(d)];
    chiSquare += Math.pow(obs - exp, 2) / exp;
  }

  const pValue = applicable ? 1 - chiSquareCDF(chiSquare, 8) : undefined;

  return {
    applicable,
    reason: `n=${n}, max/min=${ratio.toExponential(1)}, orders=${orders.toFixed(2)}`,
    sampleSize: n,
    ordersOfMagnitude: orders,
    observed,
    expected: benfordExpected,
    meanAbsoluteDeviation: mad,
    pValue,
  };
}

interface TableRelationshipFinding {
  tableIndex: number;
  columnPair: [number, number];
  relationship: 'fixed_difference_candidate' | 'fixed_ratio_candidate';
  difference?: string;
  ratio?: string;
  support: string;
  supportRate: number;
}

function findTableRelationships(tables: number[][][]): TableRelationshipFinding[] {
  const findings: TableRelationshipFinding[] = [];

  tables.forEach((table, tableIndex) => {
    if (!table || table.length === 0) return;
    const width = Math.max(...table.map(row => row.length));

    const columns: number[][] = [];
    for (let col = 0; col < width; col++) {
      columns.push([]);
      for (let row = 0; row < table.length; row++) {
        if (col < table[row].length && !isNaN(table[row][col])) {
          columns[col].push(table[row][col]);
        }
      }
    }

    for (let i = 0; i < width; i++) {
      for (let j = i + 1; j < width; j++) {
        const a = columns[i] || [];
        const b = columns[j] || [];
        if (a.length < 8 || a.length !== b.length) continue;

        const diffs = a.map((x, idx) => x - b[idx]);
        const diffRounded = diffs.map(d => parseFloat(d.toFixed(4)));
        const diffCountMap = new Map<number, number>();
        diffRounded.forEach(d => diffCountMap.set(d, (diffCountMap.get(d) || 0) + 1));

        let topDiff = 0;
        let topDiffCount = 0;
        diffCountMap.forEach((count, diff) => {
          if (count > topDiffCount) { topDiffCount = count; topDiff = diff; }
        });

        if (topDiffCount / diffs.length >= 0.8 && topDiff !== 0) {
          findings.push({
            tableIndex,
            columnPair: [i + 1, j + 1],
            relationship: 'fixed_difference_candidate',
            difference: String(topDiff),
            support: `${topDiffCount}/${diffs.length}`,
            supportRate: topDiffCount / diffs.length,
          });
        }

        const ratios: number[] = [];
        a.map((x, idx) => {
          if (b[idx] !== 0) ratios.push(x / b[idx]);
        });
        if (ratios.length >= 8) {
          const ratiosRounded = ratios.map(r => parseFloat(r.toFixed(4)));
          const ratioCountMap = new Map<number, number>();
          ratiosRounded.forEach(r => ratioCountMap.set(r, (ratioCountMap.get(r) || 0) + 1));

          let topRatio = 0;
          let topRatioCount = 0;
          ratioCountMap.forEach((count, r) => {
            if (count > topRatioCount) { topRatioCount = count; topRatio = r; }
          });

          if (topRatioCount / ratios.length >= 0.8 && topRatio !== 1) {
            findings.push({
              tableIndex,
              columnPair: [i + 1, j + 1],
              relationship: 'fixed_ratio_candidate',
              ratio: String(topRatio),
              support: `${topRatioCount}/${ratios.length}`,
              supportRate: topRatioCount / ratios.length,
            });
          }
        }
      }
    }
  });

  return findings.slice(0, 100);
}

interface ArithmeticProgressionFinding {
  startIndex: number;
  length: number;
  commonDifference: number;
  supportRate: number;
  indices: number[];
}

function detectArithmeticProgression(data: number[]): ArithmeticProgressionFinding[] {
  if (data.length < 10) return [];

  const differences: number[] = [];
  for (let i = 1; i < data.length; i++) {
    differences.push(data[i] - data[i - 1]);
  }

  const diffCountMap = new Map<number, number>();
  differences.forEach(d => {
    const key = Math.round(d * 10000) / 10000;
    diffCountMap.set(key, (diffCountMap.get(key) || 0) + 1);
  });

  let maxCount = 0;
  let maxDiff = 0;
  diffCountMap.forEach((count, diff) => {
    if (count > maxCount) { maxCount = count; maxDiff = diff; }
  });

  const findings: ArithmeticProgressionFinding[] = [];

  if (maxCount / differences.length >= 0.5) {
    findings.push({
      startIndex: -1,
      length: maxCount,
      commonDifference: maxDiff,
      supportRate: maxCount / differences.length,
      indices: [],
    });
  }

  let consecutiveSame = 1;
  for (let i = 1; i < differences.length; i++) {
    if (Math.abs(differences[i] - differences[i - 1]) < 0.001) {
      consecutiveSame++;
      if (consecutiveSame >= 5) {
        const startIdx = i - consecutiveSame + 1;
        const indices: number[] = [];
        for (let j = startIdx; j <= i + 1; j++) indices.push(j);
        findings.push({
          startIndex: startIdx,
          length: consecutiveSame,
          commonDifference: differences[i],
          supportRate: 1.0,
          indices,
        });
      }
    } else {
      consecutiveSame = 1;
    }
  }

  return findings;
}

function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0;
  if (df <= 0) return 1;

  const a = df / 2;
  const b = x / 2;

  if (b < a + 1) {
    return gammaSeries(a, b);
  } else {
    return 1 - gammaCF(a, b);
  }
}

function gammaSeries(a: number, x: number): number {
  const MAX_ITERATIONS = 200;
  const EPSILON = 1e-12;
  
  if (x === 0) return 0;
  
  const gln = gammaLn(a);
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  
  for (let n = 1; n <= MAX_ITERATIONS; n++) {
    ap++;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPSILON) break;
  }
  
  const result = sum * Math.exp(-x + a * Math.log(x) - gln);
  return Math.min(1, Math.max(0, result));
}

function gammaCF(a: number, x: number): number {
  const MAX_ITERATIONS = 200;
  const EPSILON = 3e-14;
  const FPMIN = 1e-30;
  
  const gln = gammaLn(a);
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  
  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPSILON) break;
  }
  
  const result = Math.exp(-x + a * Math.log(x) - gln) * h;
  return Math.min(1, Math.max(0, result));
}

function incompleteGamma(a: number, x: number): number {
  return gammaSeries(a, x);
}

function gammaLn(z: number): number {
  const COEFFICIENTS = [
    76.18009172947146, -86.50532032941677,
    24.01409824083091, -1.231739572450155,
    0.120865097386617e-2, -0.5395239384953e-5,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaLn(1 - z);
  }

  z -= 1;
  let x = COEFFICIENTS[0];

  for (let i = 1; i < 6; i++) {
    x += COEFFICIENTS[i] / (z + i);
  }

  const t = z + 5.5;
  return (0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x));
}

function gamma(z: number): number {
  return Math.exp(gammaLn(z));
}

export function runFullAudit(data: number[]): AuditReport {
  const startTime = Date.now();

  const evidenceLedger: EvidenceEntry[] = [];
  const allFindings: EvidenceEntry[] = [];

  const n = data.length;
  if (n < 5) {
    return {
      overallRiskLevel: 'low',
      summary: n === 0 ? '无数据进行审计' : '数据量不足，无法进行有效审计',
      findings: [],
      evidenceLedger: [],
      timestamp: new Date().toISOString(),
      dataSummary: { totalNumbers: n, tableCount: 0, sampleSize: n },
      limitations: ['样本量不足'],
    };
  }

  const duplicates = analyzeDuplicates(data);
  const digits = analyzeDigits(data);
  const benford = benfordAnalysis(data);
  const arithmeticProgressions = detectArithmeticProgression(data);

  const tables: number[][][] = [data.map(d => [d])];
  const relationships = findTableRelationships(tables);

  allFindings.push(...checkDataDuplication(duplicates, n));
  allFindings.push(...checkTerminalDigits(digits, data, n));
  allFindings.push(...checkBenford(benford, n));
  allFindings.push(...checkArithmeticProgression(arithmeticProgressions, n));
  allFindings.push(...checkTableRelationships(relationships, n));
  allFindings.push(...checkMathConsistency(data, n));
  allFindings.push(...checkDistribution(data, n));
  allFindings.push(...checkDomainSanity(data, n));

  const highRiskFindings = allFindings.filter(f =>
    f.riskLevel === 'high' || f.riskLevel === 'critical'
  );
  const mediumRiskFindings = allFindings.filter(f => f.riskLevel === 'medium');

  let overallRiskLevel: RiskLevel = 'low';
  if (highRiskFindings.length >= 2) {
    const hasCritical = highRiskFindings.some(f => f.riskLevel === 'critical');
    const hasMultipleCategories = new Set(highRiskFindings.map(f => f.category)).size >= 2;
    overallRiskLevel = hasCritical && hasMultipleCategories ? 'critical' : 'high';
  } else if (mediumRiskFindings.length >= 3 || highRiskFindings.length >= 1) {
    overallRiskLevel = highRiskFindings.length >= 1 ? 'high' : 'medium';
  } else if (allFindings.some(f => f.riskLevel !== 'low')) {
    overallRiskLevel = 'medium';
  }

  const defenseResults = runDefenseTest(allFindings);

  const finalFindings = [...allFindings, ...defenseResults];
  finalFindings.forEach(f => evidenceLedger.push({ ...f, id: generateId() }));

  const summaryLines: string[] = [
    `共审查 ${n} 个数值`,
    `发现 ${finalFindings.filter(f => f.riskLevel !== 'low').length} 条异常线索`,
    `其中高风险 ${finalFindings.filter(f => f.riskLevel === 'high' || f.riskLevel === 'critical').length} 条`,
  ];
  if (overallRiskLevel !== 'low') {
    summaryLines.push(`综合风险等级：${RISK_LABELS[overallRiskLevel].zh}`);
  }

  return {
    overallRiskLevel,
    summary: summaryLines.join('；'),
    findings: finalFindings.sort((a, b) => riskOrder(b.riskLevel) - riskOrder(a.riskLevel)),
    evidenceLedger,
    timestamp: new Date().toISOString(),
    dataSummary: { totalNumbers: n, tableCount: 1, sampleSize: n },
    limitations: [
      '本工具仅提供异常线索，不构成造假判定结论',
      '部分异常可能有合理解释（如仪器精度、实验设计等）',
      '最终结论需要领域专家人工复核',
    ],
  };
}

function riskOrder(level: RiskLevel): number {
  switch (level) {
    case 'low': return 0;
    case 'medium': return 1;
    case 'high': return 2;
    case 'critical': return 3;
  }
}

function checkDataDuplication(dup: DuplicateAnalysis, n: number): EvidenceEntry[] {
  const entries: EvidenceEntry[] = [];

  if (dup.duplicateRatio >= 0.2) {
    entries.push({
      id: generateId(),
      category: 'data_duplication',
      testName: '重复值检测',
      riskLevel: dup.duplicateRatio >= 0.4 ? 'high' : 'medium',
      evidence: `发现 ${dup.repeatedValues.length} 组重复值，最高出现 ${dup.maxRepeatCount} 次，占总量 ${(dup.duplicateRatio * 100).toFixed(1)}%`,
      method: '频率统计：同一精确值出现>=3次标记为可疑',
      suspiciousIndices: [],
      confidence: Math.min(0.95, dup.duplicateRatio * 2),
      recommendation: '检查是否为复制粘贴或批量填充的数据',
    });
  }

  if (dup.repeatedFractionalParts.length > 0) {
    const topFrac = dup.repeatedFractionalParts[0];
    entries.push({
      id: generateId(),
      category: 'data_duplication',
      testName: '小数部分重复检测',
      riskLevel: topFrac.count >= 10 ? 'medium' : 'low',
      evidence: `小数部分 "${topFrac.fractionalPart}" 出现 ${topFrac.count} 次`,
      method: '提取每个数值的小数部分进行频率统计',
      suspiciousIndices: [],
      confidence: 0.75,
      recommendation: '不同整数但相同小数的模式可能暗示人为构造',
    });
  }

  return entries;
}

function checkTerminalDigits(digits: DigitAnalysis, data: number[], n: number): EvidenceEntry[] {
  const entries: EvidenceEntry[] = [];

  if (digits.zeroFiveRate > 0.3) {
    const suspiciousIndices: number[] = [];
    data.forEach((num, idx) => {
      const d = getTerminalDigit(num);
      if (d === 0 || d === 5) suspiciousIndices.push(idx);
    });

    entries.push({
      id: generateId(),
      category: 'terminal_digit',
      testName: '末位数字0/5集中度',
      riskLevel: digits.zeroFiveRate > 0.5 ? 'high' : digits.zeroFiveRate > 0.35 ? 'medium' : 'low',
      evidence: `末位为0或5的数字占比 ${((digits.zeroFiveRate) * 100).toFixed(1)}%（正常应约20%）`,
      method: '频率分析：真实数据末位应近似均匀分布，0和5合计约占20%',
      suspiciousIndices,
      confidence: Math.min(0.98, digits.zeroFiveRate * 1.5),
      benignExplanation: '可能原因：测量精度限制、四舍五入习惯、特定仪器读数规律',
      pressureTestResult: '若全部数据来自同一次校准的同一台仪器且精度有限，可能解释',
      recommendation: '耿同学核心指标：真实实验数据的末位应近似随机分布',
    });
  }

  if (!isNaN(digits.chiSquarePValue)) {
    const cramersV = Math.sqrt(digits.chiSquareStat / (digits.sampleSize * 9));
    
    let riskLevel: RiskLevel;
    let shouldReport = false;

    if (n >= 100) {
      shouldReport = digits.chiSquarePValue < 0.05 || cramersV > 0.2;
      riskLevel = cramersV > 0.4 ? 'critical' : cramersV > 0.3 ? 'high' : cramersV > 0.2 ? 'medium' : 'low';
    } else if (n >= 50) {
      shouldReport = cramersV > 0.3;
      riskLevel = cramersV > 0.45 ? 'critical' : cramersV > 0.35 ? 'high' : 'medium';
    } else {
      shouldReport = cramersV > 0.4;
      riskLevel = cramersV > 0.5 ? 'high' : 'medium';
    }

    if (shouldReport && riskLevel !== 'low') {
      entries.push({
        id: generateId(),
        category: 'terminal_digit',
        testName: '末位数字分布均匀性检验',
        riskLevel,
        evidence: `Cramér's V=${cramersV.toFixed(3)}（${n < 100 ? '小样本' : ''}${cramersV > 0.3 ? '强' : cramersV > 0.2 ? '中' : '弱'}效应量），分布偏离均匀`,
        method: `χ²检验 + Cramér's V效应量校正（n=${digits.sampleSize}）`,
        confidence: Math.min(0.95, cramersV * 1.8),
        benignExplanation: n < 50 
          ? '样本量较小时，即使完全随机也可能出现明显波动，属正常统计涨落'
          : '某些实验类型可能因测量精度或取值范围限制导致末位非完全随机',
        recommendation: cramersV > 0.3 
          ? '强烈建议人工复核原始数据记录过程'
          : '可接受范围内的轻微偏差，结合其他证据综合判断',
      });
    }
  }

  const expectedPerDigit = digits.sampleSize / 10;
  const activeDigitCount = Object.keys(digits.terminalCounts).length;

  if (activeDigitCount >= 7 && digits.sampleSize >= 30) {
    let mostMissingDigit = -1;
    let lowestRatio = 1;
    let missingCount = 0;

    for (let d = 0; d <= 9; d++) {
      const count = digits.terminalCounts[String(d)] || 0;
      const ratio = count / expectedPerDigit;
      
      if (ratio < lowestRatio) {
        lowestRatio = ratio;
        mostMissingDigit = d;
      }
      if (count === 0) missingCount++;
    }

    const isLargeSample = digits.sampleSize >= 100;
    const isMediumSample = digits.sampleSize >= 60;
    
    if (isLargeSample && lowestRatio < 0.2) {
      entries.push({
        id: generateId(),
        category: 'terminal_digit',
        testName: '末位数字单频缺失检测',
        riskLevel: lowestRatio < 0.05 ? 'critical' : 'high',
        evidence: `末位数字${mostMissingDigit}仅出现${digits.terminalCounts[String(mostMissingDigit)] || 0}次（期望≈${Math.round(expectedPerDigit)}，占比${(lowestRatio*100).toFixed(1)}%）`,
        method: '二项分布检验：大样本(n≥100)下某数字完全缺失极不可能',
        confidence: Math.min(0.95, (0.2 - lowestRatio) * 3),
        benignExplanation: '若测量仪器或记录方式有系统性偏差可能导致',
        pressureTestResult: '检查原始实验记录本，确认该数字是否被有意避免',
        recommendation: '耿同学指出：人脑编数时容易无意识地避开某些数字',
      });
    } else if (isMediumSample && missingCount >= 2 && lowestRatio < 0.15) {
      entries.push({
        id: generateId(),
        category: 'terminal_digit',
        testName: '末位数字多频缺失检测',
        riskLevel: 'high',
        evidence: `${missingCount}个末位数字完全缺失（含数字${mostMissingDigit}），样本量${digits.sampleSize}时概率较低`,
        method: '多项式分布：多个数字同时缺失的概率随样本量增加而降低',
        confidence: Math.min(0.88, missingCount * 0.35),
        benignExplanation: '可能存在测量精度限制（如仪器只显示特定末位）',
        pressureTestResult: '若缺失的数字是连续的或有规律性，造假可能性上升',
        recommendation: '结合其他异常信号综合判断',
      });
    } else if (digits.sampleSize >= 150 && lowestRatio < 0.3) {
      entries.push({
        id: generateId(),
        category: 'terminal_digit',
        testName: '末位数字单频缺失检测',
        riskLevel: 'medium',
        evidence: `末位数字${mostMissingDigit}频率偏低(${(lowestRatio*100).toFixed(1)}%，期望10%)`,
        method: '频率分析 + 样本量校正',
        confidence: Math.min(0.75, (0.3 - lowestRatio) * 1.5),
        benignExplanation: '统计波动范围内，但值得关注',
        recommendation: '建议关注但不单独作为判定依据',
      });
    }
  }

  return entries;
}

function checkCrossColumnIdentity(tables: number[][]): EvidenceEntry[] {
  const entries: EvidenceEntry[] = [];

  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const colA = tables[i];
      const colB = tables[j];

      if (colA.length !== colB.length || colA.length === 0) continue;

      let identicalCount = 0;
      let maxDiff = 0;

      for (let k = 0; k < colA.length; k++) {
        const diff = Math.abs(colA[k] - colB[k]);
        if (diff < 0.0001) identicalCount++;
        if (diff > maxDiff) maxDiff = diff;
      }

      const identityRate = identicalCount / colA.length;

      if (identityRate >= 0.95) {
        entries.push({
          id: generateId(),
          category: 'image_identity',
          testName: '跨列数据身份冲突检测',
          riskLevel: identityRate === 1 ? 'critical' : 'high',
          evidence: `列${i+1}与列${j+1}有${identicalCount}/${colA.length}个数据点${identityRate === 1 ? '完全相同' : '几乎相同'}（相似度${(identityRate*100).toFixed(1)}%）`,
          method: '逐元素比较：真实独立实验的两列数据不应高度一致',
          confidence: identityRate,
          benignExplanation: '可能是数据录入错误或使用了相同的计算公式',
          pressureTestResult: '若两列代表不同实验条件但数据完全相同，无法用善意解释',
          recommendation: '耿同学第1维度核心指标：同一底片不应产生不同结果',
        });
      } else if (identityRate >= 0.8 && colA.length >= 10) {
        entries.push({
          id: generateId(),
          category: 'data_duplication',
          testName: '跨列高相似度检测',
          riskLevel: 'medium',
          evidence: `列${i+1}与列${j+1}相似度${(identityRate*100).toFixed(1)}%（${identicalCount}/${colA.length}个相同）`,
          method: '相关性分析：独立测量结果通常不会高度相关',
          confidence: identityRate * 0.8,
          benignExplanation: '可能存在真实的生物学相关性或共享上游处理步骤',
          recommendation: '检查两列是否来自独立的实验批次和操作者',
        });
      }
    }
  }

  return entries;
}

function checkCrossColumnArithmetic(tables: number[][]): EvidenceEntry[] {
  const entries: EvidenceEntry[] = [];

  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const colA = tables[i];
      const colB = tables[j];

      if (colA.length !== colB.length || colA.length < 10) continue;

      const differences: number[] = [];
      const ratios: number[] = [];

      for (let k = 0; k < colA.length; k++) {
        if (colB[k] !== 0) {
          differences.push(colA[k] - colB[k]);
          ratios.push(colA[k] / colB[k]);
        }
      }

      if (differences.length < 10) continue;

      const diffMap = new Map<number, number>();
      differences.forEach(d => {
        const key = Math.round(d * 1000) / 1000;
        diffMap.set(key, (diffMap.get(key) || 0) + 1);
      });

      let maxDiffCount = 0;
      let commonDiff = 0;
      diffMap.forEach((count, diff) => {
        if (count > maxDiffCount) { maxDiffCount = count; commonDiff = diff; }
      });

      const diffSupportRate = maxDiffCount / differences.length;

      if (diffSupportRate >= 0.8 && Math.abs(commonDiff) > 0.01) {
        entries.push({
          id: generateId(),
          category: 'math_consistency',
          testName: '跨列固定差值检测',
          riskLevel: diffSupportRate >= 0.95 ? 'critical' : 'high',
          evidence: `列${i+1} - 列${j+1} ≈ ${commonDiff.toFixed(4)}（支持率${(diffSupportRate*100).toFixed(1)}%，${maxDiffCount}/${differences.length}个数据点）`,
          method: '差值一致性分析：如果两列差值恒定，暗示其中一列由另一列生成',
          confidence: diffSupportRate,
          benignExplanation: '可能是校准曲线转换或标准化处理的副产品',
          pressureTestResult: '如果两列声称是独立测量，固定差值无法合理解释',
          recommendation: '耿同学第4维度：检查数据生成方向是否反了',
        });
      }

      if (ratios.length >= 10) {
        const ratioMap = new Map<number, number>();
        ratios.forEach(r => {
          const key = Math.round(r * 1000) / 1000;
          ratioMap.set(key, (ratioMap.get(key) || 0) + 1);
        });

        let maxRatioCount = 0;
        let commonRatio = 0;
        ratioMap.forEach((count, r) => {
          if (count > maxRatioCount) { maxRatioCount = count; commonRatio = r; }
        });

        const ratioSupportRate = maxRatioCount / ratios.length;

        if (ratioSupportRate >= 0.8 && Math.abs(commonRatio - 1) > 0.05) {
          entries.push({
            id: generateId(),
            category: 'math_consistency',
            testName: '跨列固定比例检测',
            riskLevel: ratioSupportRate >= 0.95 ? 'critical' : 'high',
            evidence: `列${i+1} / 列${j+1} ≈ ${commonRatio.toFixed(4)}（支持率${(ratioSupportRate*100).toFixed(1)}%）`,
            method: '比例一致性分析：恒定比例暗示线性变换关系',
            confidence: ratioSupportRate,
            benignExplanation: '单位换算或归一化处理可能导致固定比例',
            pressureTestResult: '独立实验数据间不应存在精确数学关系',
            recommendation: '验证是否为合理的单位转换或数据处理步骤',
          });
        }
      }
    }
  }

  return entries;
}

function checkBenford(benford: BenfordAnalysis, n: number): EvidenceEntry[] {
  const entries: EvidenceEntry[] = [];

  if (benford.applicable) {
    const deviationThreshold = 0.08;
    if (benford.meanAbsoluteDeviation > deviationThreshold) {
      entries.push({
        id: generateId(),
        category: 'distribution',
        testName: 'Benford定律首位数字检验',
        riskLevel: benford.meanAbsoluteDeviation > 0.15 ? 'high' : 'medium',
        evidence: `MAD=${benford.meanAbsoluteDeviation.toFixed(4)}（阈值${deviationThreshold}），偏离Benford预期`,
        method: 'Benford定律：自然数据首位数字 P(d)=log10(1+1/d)',
        confidence: Math.min(0.95, benford.meanAbsoluteDeviation * 5),
        benignExplanation: 'Benford不适用于所有数据类型（如受限范围、预定义类别等）',
        recommendation: '适用于大范围、多来源的自然产生数据（如财务、人口统计数据）',
      });
    }
  }

  return entries;
}

function checkArithmeticProgression(progressions: ArithmeticProgressionFinding[], n: number): EvidenceEntry[] {
  return progressions.map(prog => ({
    id: generateId(),
    category: 'data_duplication',
    testName: '等差数列检测',
    riskLevel: prog.supportRate >= 0.8 ? 'critical' : prog.supportRate >= 0.5 ? 'high' : 'medium',
    evidence: `发现 ${prog.length} 个连续数据点具有固定差值 ${prog.commonDifference}，支持率 ${(prog.supportRate * 100).toFixed(0)}%`,
    method: '计算相邻元素差值，检测相同差值的频率和连续长度',
    suspiciousIndices: prog.indices,
    confidence: prog.supportRate,
    benignExplanation: '时间序列数据、等间隔采样可能呈现此特征',
    pressureTestResult: '若为时间序列或等间隔采样则可解释，否则高度可疑',
    recommendation: '耿同学名句："真实实验的数据不可能那么工整"',
  }));
}

function checkTableRelationships(relations: TableRelationshipFinding[], n: number): EvidenceEntry[] {
  return relations.map(rel => ({
    id: generateId(),
    category: 'math_consistency',
    testName: rel.relationship === 'fixed_difference_candidate' ? '固定差值关系检测' : '固定比例关系检测',
    riskLevel: rel.supportRate >= 0.95 ? 'critical' : rel.supportRate >= 0.85 ? 'high' : 'medium',
    evidence: `第${rel.columnPair[0]}列与第${rel.columnPair[1]}列 ${rel.relationship === 'fixed_difference_candidate' ? `恒定相差 ${rel.difference}` : `恒定比例 ${rel.ratio}`}，支持率 ${(rel.supportRate * 100).toFixed(0)}%`,
    method: '逐行计算两列差值/比值，统计最频繁出现的值及其占比',
    confidence: rel.supportRate,
    benignExplanation: '可能的善意解释：公式关联列、派生计算结果、归一化处理',
    pressureTestResult: '机械关系极难用实验误差解释，除非两列存在已知数学关系',
    recommendation: '这种机械关系强烈暗示按规则批量生成而非实际测量',
  }));
}

function checkMathConsistency(data: number[], n: number): EvidenceEntry[] {
  const entries: EvidenceEntry[] = [];

  const intData = data.filter(n => Number.isInteger(n) || n % 1 === 0);
  if (intData.length > n * 0.8 && n >= 20) {
    entries.push({
      id: generateId(),
      category: 'domain_sanity',
      testName: '整数比例过高检测',
      riskLevel: 'medium',
      evidence: `${intData.length}/${n} 个数据为整数（占比${((intData.length / n) * 100).toFixed(0)}%）`,
      method: '检查数据的小数位数分布',
      confidence: intData.length / n,
      benignExplanation: '计数数据、分类变量、百分比值天然为整数',
      recommendation: '连续测量数据通常应有非零小数部分',
    });
  }

  const roundnessCheck = data.filter(n => {
    const s = n.toString();
    if (!s.includes('.')) return false;
    const frac = s.split('.')[1];
    return frac.length <= 1 && ['0', '25', '5', '75'].includes(frac);
  });
  if (roundnessCheck.length > n * 0.5 && n >= 15) {
    entries.push({
      id: generateId(),
      category: 'terminal_digit',
      testName: '数据过于整齐检测',
      riskLevel: roundnessCheck.length > n * 0.7 ? 'high' : 'medium',
      evidence: `${roundnessCheck.length}/${n} 个数据为常见整齐分数（.0/.25/.5/.75）`,
      method: '检查小数部分是否集中在少数几个"好看"的值上',
      confidence: roundnessCheck.length / n,
      benignExplanation: '可能是四舍五入后的报告值',
      recommendation: '原始测量数据不应如此集中地"整齐"',
    });
  }

  return entries;
}

function checkDistribution(data: number[], n: number): EvidenceEntry[] {
  const entries: EvidenceEntry[] = [];

  const sorted = [...data].sort((a, b) => a - b);
  const range = sorted[sorted.length - 1] - sorted[0];
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(data.reduce((sum, val) => sum + (val - mean) ** 2, 0) / n);
  const cv = mean !== 0 ? std / Math.abs(mean) : 0;

  if (cv < 0.01 && n >= 20) {
    entries.push({
      id: generateId(),
      category: 'distribution',
      testName: '变异系数过低检测',
      riskLevel: cv < 0.001 ? 'high' : 'medium',
      evidence: `变异系数 CV=${cv.toExponential(2)}（正常实验数据通常>1%）`,
      method: 'CV = 标准差/均值，衡量相对离散程度',
      confidence: 1 - cv * 50,
      benignExplanation: '控制良好的工业过程或标准化样品可能低CV',
      recommendation: '真实生物实验数据通常有较大波动',
    });
  }

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i] - sorted[i - 1]);
  }
  const gapStd = Math.sqrt(gaps.reduce((sum, g) => sum + (g - gaps.reduce((a, b) => a + b, 0) / gaps.length) ** 2, 0) / gaps.length);
  const gapMean = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  if (gapStd < gapMean * 0.1 && n >= 30) {
    entries.push({
      id: generateId(),
      category: 'distribution',
      testName: '数据间距过于均匀检测',
      riskLevel: 'medium',
      evidence: `排序后相邻数据间距的标准差(${gapStd.toFixed(4)})远小于均值(${gapMean.toFixed(4)})`,
      method: '排序后计算相邻差值的标准差与均值比',
      confidence: 0.7,
      benignExplanation: '等间距采样数据可能呈现此特征',
      recommendation: '真实测量数据间距应有一定随机波动',
    });
  }

  return entries;
}

function checkDomainSanity(data: number[], n: number): EvidenceEntry[] {
  const entries: EvidenceEntry[] = [];

  const decimalPlaces = data.map(num => {
    const s = num.toString();
    if (!s.includes('.')) return 0;
    return s.split('.')[1].length;
  });

  const maxDecimals = Math.max(...decimalPlaces);
  const avgDecimals = decimalPlaces.reduce((a, b) => a + b, 0) / n;

  if (avgDecimals >= 4 && n >= 20) {
    entries.push({
      id: generateId(),
      category: 'domain_sanity',
      testName: '测量精度异常检测',
      riskLevel: 'medium',
      evidence: `平均小数位数 ${avgDecimals.toFixed(1)}，最大 ${maxDecimals} 位`,
      method: '统计每个数值的小数点后位数',
      confidence: Math.min(0.85, avgDecimals / 10),
      benignExplanation: '高精度仪器（如电子天平、分光光度计）可达到此精度',
      recommendation: '普通生物学测量很少超过3位有效小数',
    });
  }

  const negativeCount = data.filter(d => d < 0).length;
  if (negativeCount === n && n > 0) {
    entries.push({
      id: generateId(),
      category: 'domain_sanity',
      testName: '全负值数据检测',
      riskLevel: 'low',
      evidence: `全部 ${n} 个数据均为负值`,
      method: '检查数据符号分布',
      confidence: 0.5,
      benignExplanation: '变化量、差值、对数转换数据可能全为负',
      recommendation: '结合数据上下文判断是否合理',
    });
  }

  return entries;
}

function runDefenseTest(findings: EvidenceEntry[]): EvidenceEntry[] {
  const defenseEntries: EvidenceEntry[] = [];

  const highRiskByCategory = new Map<AuditCategory, EvidenceEntry[]>();
  findings.forEach(f => {
    if (f.riskLevel === 'high' || f.riskLevel === 'critical') {
      const existing = highRiskByCategory.get(f.category) || [];
      existing.push(f);
      highRiskByCategory.set(f.category, existing);
    }
  });

  if (highRiskByCategory.size >= 3) {
    const categories = Array.from(highRiskByCategory.keys());
    defenseEntries.push({
      id: generateId(),
      category: 'defense_test',
      testName: '跨类别证据网络分析',
      riskLevel: 'critical',
      evidence: `在 ${categories.length} 个独立类别中发现高风险异常：${categories.map(c => CATEGORY_LABELS[c].zh).join('、')}`,
      method: '耿同学方法论第7步：检查单一解释是否能覆盖所有异常',
      confidence: 0.92,
      benignExplanation: '多个独立异常同时存在的概率较低',
      pressureTestResult: '除非能找到统一解释覆盖所有类别，否则造假可能性显著上升',
      recommendation: '最强证据链：图像冲突 + 数字生成伪影 + 反推数据关系',
    });
  }

  const hasFixedRelation = findings.some(f => f.category === 'math_consistency' && f.riskLevel !== 'low');
  const hasDigitAnomaly = findings.some(f => f.category === 'terminal_digit' && f.riskLevel !== 'low');
  if (hasFixedRelation && hasDigitAnomaly) {
    defenseEntries.push({
      id: generateId(),
      category: 'defense_test',
      testName: '双重信号交叉验证',
      riskLevel: 'high',
      evidence: '同时发现数学关系异常和末位数字分布异常',
      method: '耿同学方法论：多种独立方法指向同一结论时置信度提升',
      confidence: 0.88,
      benignExplanation: '巧合可能导致两种检测同时报警',
      pressureTestResult: '两种完全独立的统计方法同时异常的概率很低',
      recommendation: '建议优先复核这两类异常涉及的具体数据',
    });
  }

  return defenseEntries;
}

export function runFullAuditMultiTable(tables: number[][]): AuditReport {
  if (tables.length === 0 || tables.every(t => t.length === 0)) {
    return runFullAudit([]);
  }

  if (tables.length === 1) {
    return runFullAudit(tables[0]);
  }

  const startTime = Date.now();
  const evidenceLedger: EvidenceEntry[] = [];
  const allFindings: EvidenceEntry[] = [];

  const totalPoints = tables.reduce((sum, t) => sum + t.length, 0);

  for (let i = 0; i < tables.length; i++) {
    const colData = tables[i];
    if (colData.length < 3) continue;

    try {
      const singleReport = runFullAudit(colData);
      allFindings.push(...singleReport.findings);
    } catch (e) {
      console.error(`列${i+1}审计失败:`, e);
    }
  }

  allFindings.push(...checkCrossColumnIdentity(tables));
  allFindings.push(...checkCrossColumnArithmetic(tables));

  const highRiskFindings = allFindings.filter(f =>
    f.riskLevel === 'high' || f.riskLevel === 'critical'
  );
  const mediumRiskFindings = allFindings.filter(f => f.riskLevel === 'medium');

  let overallRiskLevel: RiskLevel = 'low';
  if (highRiskFindings.length >= 2) {
    const hasCritical = highRiskFindings.some(f => f.riskLevel === 'critical');
    const hasMultipleCategories = new Set(highRiskFindings.map(f => f.category)).size >= 2;
    const hasCrossColumn = highRiskFindings.some(f => 
      f.category === 'image_identity' || f.testName.includes('跨列')
    );
    overallRiskLevel = (hasCritical && hasMultipleCategories) || hasCrossColumn ? 'critical' : 'high';
  } else if (mediumRiskFindings.length >= 3 || highRiskFindings.length >= 1) {
    overallRiskLevel = highRiskFindings.length >= 1 ? 'high' : 'medium';
  } else if (allFindings.some(f => f.riskLevel !== 'low')) {
    overallRiskLevel = 'medium';
  }

  const defenseResults = runDefenseTest(allFindings);

  const finalFindings = [...allFindings, ...defenseResults];
  finalFindings.forEach(f => evidenceLedger.push({ ...f, id: generateId() }));

  const categories = [...new Set(finalFindings.map(f => f.category))];
  const summaryLines: string[] = [
    `多表审计：${tables.length}列，共${totalPoints}个数值`,
    `发现${finalFindings.length}条证据（高风险${highRiskFindings.length}条）`,
    `涉及${categories.length}个检查类别`,
  ];

  return {
    overallRiskLevel,
    summary: summaryLines.join('；'),
    findings: finalFindings,
    evidenceLedger,
    timestamp: new Date().toISOString(),
    dataSummary: { totalNumbers: totalPoints, tableCount: tables.length, sampleSize: Math.max(...tables.map(t => t.length)) },
    limitations: [
      '基于统计规律的推断，不能100%确定造假',
      '某些合法数据可能呈现类似模式',
      '建议结合实验原始记录综合判断',
    ],
  };
}

export function getRiskLabel(level: RiskLevel, lang: 'zh' | 'en' = 'zh') {
  return RISK_LABELS[level][lang];
}

export function getCategoryLabel(cat: AuditCategory, lang: 'zh' | 'en' = 'zh') {
  return CATEGORY_LABELS[cat][lang];
}
