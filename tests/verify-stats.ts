import { chiSquareCDF, incompleteGamma, gammaLn } from '../src/utils/auditEngine.ts';

console.log('='.repeat(60));
console.log('统计函数验证测试');
console.log('='.repeat(60));

const testCases = [
  { x: 0, df: 9, expected: 0 },
  { x: 1, df: 9, desc: '小卡方值' },
  { x: 10, df: 9, desc: '中等卡方值' },
  { x: 20, df: 9, desc: '较大卡方值' },
  { x: 100, df: 9, desc: '很大卡方值' },
];

console.log('\n📊 chiSquareCDF 函数验证:');
testCases.forEach(tc => {
  const p = chiSquareCDF(tc.x, tc.df);
  console.log(`   χ²=${tc.x.toString().padStart(5)}, df=${tc.df} → p=${p.toFixed(6)} ${tc.desc || '(期望接近0)'}`);
});

console.log('\n🔬 末位数字分布模拟测试:');

function simulateTerminalDigits(n: number, seed: number = 42): number[] {
  const digits: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 16807 + 0) % 2147483647;
    digits.push(Math.floor((s / 2147483647) * 10));
  }
  return digits;
}

for (const sampleSize of [30, 50, 70, 100, 200]) {
  const digits = simulateTerminalDigits(sampleSize);
  const counts: Record<string, number> = {};
  digits.forEach(d => { counts[String(d)] = (counts[String(d)] || 0) + 1; });
  
  let chiSquare = 0;
  for (let d = 0; d <= 9; d++) {
    const observed = counts[String(d)] || 0;
    const expected = sampleSize / 10;
    chiSquare += Math.pow(observed - expected, 2) / expected;
  }
  
  const pValue = 1 - chiSquareCDF(chiSquare, 9);
  const maxCount = Math.max(...Object.values(counts));
  const minCount = Math.min(...Object.values(counts));
  
  console.log(`\n   n=${sampleSize}:`);
  console.log(`      χ²=${chiSquare.toFixed(2)}, p=${pValue.toFixed(4)}`);
  console.log(`      分布范围: ${minCount}-${maxCount} (期望${Math.round(sampleSize/10)})`);
  console.log(`      显著性: ${pValue < 0.05 ? '⚠️ 显著(p<0.05)' : '✅ 不显著'}`);
}

console.log('\n📈 真实数据末位分布 vs 完美均匀分布:');
const perfectUniform = Array(10).fill(50);
let perfectChiSq = 0;
perfectUniform.forEach(obs => {
  perfectChiSq += Math.pow(obs - 50, 2) / 50;
});
console.log(`   完美均匀(n=500): χ²=0.000, p=1.0000`);

const slightlyOff = [48, 52, 51, 49, 50, 47, 53, 50, 49, 51];
let offChiSq = 0;
slightlyOff.forEach((obs, idx) => {
  offChiSq += Math.pow(obs - 50, 2) / 50;
});
const offP = 1 - chiSquareCDF(offChiSq, 9);
console.log(`   轻微偏差(n=500): χ²=${offChiSq.toFixed(2)}, p=${offP.toFixed(4)}`);

const veryOff = [70, 30, 55, 45, 50, 40, 60, 48, 52, 50];
let veryOffChiSq = 0;
veryOff.forEach(obs => {
  veryOffChiSq += Math.pow(obs - 50, 2) / 50;
});
const veryOffP = 1 - chiSquareCDF(veryOffChiSq, 9);
console.log(`   明显偏差(n=500): χ²=${veryOffChiSq.toFixed(2)}, p=${veryOffP.toFixed(4)}`);

console.log('\n' + '='.repeat(60));
