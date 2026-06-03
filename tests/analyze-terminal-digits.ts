import fs from 'fs';
import path from 'path';

function parseCSVColumn(filePath: string, columnName: string): number[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const colIdx = headers.indexOf(columnName);
  
  if (colIdx === -1) return [];
  
  const numbers: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols[colIdx]) {
      const num = parseFloat(cols[colIdx].trim());
      if (!isNaN(num)) numbers.push(num);
    }
  }
  return numbers;
}

function getTerminalDigit(num: number): number | null {
  const absNum = Math.abs(num);
  const rounded = Math.round(absNum * 100) / 100;
  const str = rounded.toFixed(2);
  return parseInt(str[str.length - 1]);
}

function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0;
  if (df <= 0) return 1;
  
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
    for (let i = 1; i < COEFFICIENTS.length; i++) {
      x += COEFFICIENTS[i] / (z + i);
    }
    return (z + 0.5) * Math.log(z + 5.5) - (z + 5.5) + Math.log(2.5066282746310005 * x / z);
  }

  function incompleteGamma(a: number, x: number): number {
    const EPSILON = 1e-12;
    const MAX_ITERATIONS = 200;
    if (x < 0) return 0;
    if (x === 0) return 0;

    let gln = gammaLn(a);
    let sum = 1.0 / a;
    let term = sum;
    for (let n = 1; n <= MAX_ITERATIONS; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < EPSILON * Math.abs(sum)) break;
    }

    const series = sum * Math.exp(-x + a * Math.log(x) - gln);
    return 1 - series;
  }

  function gamma(z: number): number {
    return Math.exp(gammaLn(z));
  }

  const p = incompleteGamma(df / 2, x / 2) / gamma(df / 2);
  return Math.min(1, Math.max(0, 1 - p));
}

function analyzeDistribution(data: number[], label: string) {
  const terminals = data.map(getTerminalDigit).filter((d): d is number => d !== null);
  const counts: Record<string, number> = {};
  terminals.forEach(d => { counts[String(d)] = (counts[String(d)] || 0) + 1; });
  
  const n = terminals.length;
  let chiSquare = 0;
  console.log(`\n📊 ${label} (n=${n}):`);
  console.log('   末位数字分布:');
  
  for (let d = 0; d <= 9; d++) {
    const observed = counts[String(d)] || 0;
    const expected = n / 10;
    const contribution = Math.pow(observed - expected, 2) / expected;
    chiSquare += contribution;
    const bar = '█'.repeat(Math.round(observed / n * 40));
    console.log(`   数字${d}: ${observed.toString().padStart(4)} (${(observed/n*100).toFixed(1)}%) ${bar}`);
  }
  
  const pValue = 1 - chiSquareCDF(chiSquare, 9);
  console.log(`   χ²=${chiSquare.toFixed(2)}, df=9, p=${pValue.toFixed(4)}`);
  console.log(`   结论: ${pValue < 0.01 ? '❌ 极显著异常(p<0.01)' : pValue < 0.05 ? '⚠️ 显著异常(p<0.05)' : '✅ 分布均匀'}`);
  
  return { chiSquare, pValue, n };
}

console.log('='.repeat(70));
console.log('末位数字分布详细分析');
console.log('='.repeat(70));

const normalBio = parseCSVColumn('/workspace/data/normal_biology_data.csv', 'blood_glucose_mmol/L');
const normalRand = parseCSVColumn('/workspace/data/normal_random_data.csv', 'value_1');
const tongjiLastDigit = parseCSVColumn('/workspace/data/case1_tongji_lastdigit_5.csv', 'expression_value');
const shanghaiArith = parseCSVColumn('/workspace/data/case4_shanghai_arithmetic.csv', 'particle_size_nm');

analyzeDistribution(normalBio, '正常生物数据(blood_glucose)');
analyzeDistribution(normalRand, '随机数据(value_1)');
analyzeDistribution(tongjiLastDigit, '同济末位数字5案例');
analyzeDistribution(shanghaiArith, '上海等差数列案例');

console.log('\n' + '='.repeat(70));
console.log('关键发现');
console.log('='.repeat(70));

const results = [
  analyzeDistribution(normalBio, ''),
  analyzeDistribution(normalRand, ''),
];

console.log('\n💡 如果p值都接近0.0073，可能原因:');
console.log('   1. 样本量小(n<100)，卡方检验功效过高');
console.log('   2. 数据生成方式引入了微妙偏差');
console.log('   3. 需要加入效应量校正（如Cramér\'s V）');
