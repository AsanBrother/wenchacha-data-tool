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

function chiSquareCDF_old(x: number, df: number): number {
  if (x <= 0) return 0;
  if (df <= 0) return 1;
  const p = incompleteGamma(df / 2, x / 2) / gamma(df / 2);
  return Math.min(1, Math.max(0, 1 - p));
}

function chiSquareCDF_new(x: number, df: number): number {
  if (x <= 0) return 0;
  if (df <= 0) return 1;

  const a = df / 2;
  const b = x / 2;

  if (b < a + 1) {
    const seriesResult = gammaSeries(a, b);
    return Math.min(1, Math.max(0, seriesResult));
  } else {
    const cfResult = gammaCF(a, b);
    return Math.min(1, Math.max(0, 1 - cfResult));
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
  
  return sum * Math.exp(-x + a * Math.log(x) - gln);
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
  
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

console.log('='.repeat(70));
console.log('chiSquareCDF 函数对比测试');
console.log('='.repeat(70));

const testValues = [
  { x: 0.1, df: 9 },
  { x: 1, df: 9 },
  { x: 10, df: 9 },
  { x: 16.919, df: 9 },  // α=0.05临界值
  { x: 21.666, df: 9 },  // α=0.01临界值
  { x: 50, df: 9 },
  { x: 100, df: 9 },
  { x: 200, df: 9 },
  { x: 639, df: 9 },     // 同济案例的实际值
];

console.log('\nχ²值          旧版p值       新版p值       差异        R参考值');
console.log('-'.repeat(70));

testValues.forEach(tv => {
  const oldP = chiSquareCDF_old(tv.x, tv.df);
  const newP = chiSquareCDF_new(tv.x, tv.df);
  const diff = Math.abs(oldP - newP);
  const significant = tv.x > 16.919 ? (newP < 0.05 ? '✅显著' : '❌不显') : '';
  
  console.log(
    `${tv.x.toString().padStart(5)}        ${oldP.toFixed(6)}    ${newP.toFixed(6)}    ${diff.toExponential(2).padStart(10)}  ${significant}`
  );
});

console.log('\n📌 关键发现:');
const extremeOld = chiSquareCDF_old(639, 9);
const extremeNew = chiSquareCDF_new(639, 9);
console.log(`   χ²=639 (同济案例): 旧版p=${extremeOld.toFixed(6)}, 新版p=${extremeNew.toExponential(2)}`);
console.log(`   结论: ${extremeNew < 0.0001 ? '✅ 新版正确识别为极显著' : '⚠️ 仍有问题'}`);

const smallOld = chiSquareCDF_old(13.6, 9);
const smallNew = chiSquareCDF_new(13.6, 9);
console.log(`\n   χ²=13.6 (正常数据): 旧版p=${smallOld.toFixed(4)}, 新版p=${smallNew.toFixed(4)}`);
console.log(`   结论: ${smallNew < 0.05 ? '⚠️ 统计显著' : '✅ 不显著'}（小样本问题需用效应量校正）`);
