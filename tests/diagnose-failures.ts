import fs from 'fs';

function getTerminalDigit(num: number): number | null {
  const absNum = Math.abs(num);
  const rounded = Math.round(absNum * 100) / 100;
  const str = rounded.toFixed(2);
  return parseInt(str[str.length - 1]);
}

function getFractionalPart(num: number): string {
  const absNum = Math.abs(num);
  const rounded = Math.round(absNum * 100) / 100;
  const str = rounded.toFixed(2);
  return str.split('.')[1] || '00';
}

function parseCSVColumn(filePath: string, colName: string): number[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const idx = headers.indexOf(colName);
  if (idx === -1) return [];
  
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    return parseFloat(cols[idx]?.trim());
  }).filter(n => !isNaN(n));
}

console.log('='.repeat(80));
console.log('3个失败案例深度诊断');
console.log('='.repeat(80));

// ===== 案例1：小鼠体重 =====
console.log('\n📊 案例1: 小鼠体重 (case1_tongji_mice_weight.csv)');
const miceWeight = parseCSVColumn('/workspace/data/case1_tongji_mice_weight.csv', 'weight_g');
const miceTerminals = miceWeight.map(getTerminalDigit).filter((d): d is number => d !== null);

const terminalCounts: Record<string, number> = {};
miceTerminals.forEach(d => { terminalCounts[String(d)] = (terminalCounts[String(d)] || 0) + 1; });

console.log(`\n   样本量: ${miceWeight.length}`);
console.log('   末位数字分布:');
for (let d = 0; d <= 9; d++) {
  const count = terminalCounts[String(d)] || 0;
  const pct = (count / miceTerminals.length * 100).toFixed(1);
  const expected = (miceTerminals.length / 10).toFixed(0);
  const bar = '█'.repeat(Math.round(count / miceTerminals.length * 40));
  const flag = count === 0 ? ' ❌=0!' : count < parseInt(expected) * 0.5 ? ' ⚠️偏低' : '';
  console.log(`   数字${d}: ${count.toString().padStart(3)} (${pct}%) ${bar}${flag}`);
}

const zeroCount = terminalCounts['0'] || 0;
console.log(`\n   🔑 关键发现: 末位为0的数量=${zeroCount}, 期望≈${Math.round(miceTerminals.length/10)}, 偏差=${((zeroCount/(miceTerminals.length/10)-1)*100).toFixed(0)}%`);

// ===== 案例2：南开64组 =====
console.log('\n\n📊 案例2: 南开64组 (case2_nankai_64groups.csv)');
const nankaiCols = ['cell_type_A', 'cell_type_B', 'cell_type_C', 'cell_type_D'];
const allFractions: string[] = [];

nankaiCols.forEach(col => {
  const data = parseCSVColumn('/workspace/data/case2_nankai_64groups.csv', col);
  data.forEach(n => allFractions.push(getFractionalPart(n)));
});

const fracCounts: Record<string, number> = {};
allFractions.forEach(f => { fracCounts[f] = (fracCounts[f] || 0) + 1; });

const sortedFracs = Object.entries(fracCounts).sort((a, b) => b[1] - a[1]);
console.log(`\n   总数据点: ${allFractions.length}`);
console.log('   小数部分分布(Top-15):');
sortedFracs.slice(0, 15).forEach(([frac, count]) => {
  const pct = (count / allFractions.length * 100).toFixed(1);
  console.log(`   .${frac}: ${count.toString().padStart(3)}次 (${pct}%)`);
});

const uniqueFracs = Object.keys(fracCounts).length;
const totalPossible = allFractions.length;
console.log(`\n   🔑 关键发现:`);
console.log(`      唯一小数部分数量: ${uniqueFracs}`);
console.log(`      总可能组合(00-99): 100`);
console.log(`      集中度: ${(uniqueFracs/100*100).toFixed(1)}%`);

// 检查是否有跨行模式
console.log('\n   跨行小数部分一致性检查:');
for (let i = 0; i < Math.min(5, allFractions.length / 4); i++) {
  const rowFracs = [];
  for (let j = 0; j < 4; j++) {
    rowFracs.push(allFractions[i * 4 + j]);
  }
  console.log(`   行${i+1}: [${rowFracs.join(', ')}]`);
}

// ===== 案例3：中山图片复用 =====
console.log('\n\n📊 案例3: 中山图片复用 (case3_zhongshan_copy.csv)');
const expA = parseCSVColumn('/workspace/data/case3_zhongshan_copy.csv', 'experiment_A_tumor_volume');
const expB = parseCSVColumn('/workspace/data/case3_zhongshan_copy.csv', 'experiment_B_tumor_volume');

console.log(`\n   实验A样本量: ${expA.length}`);
console.log(`   实验B样本量: ${expB.length}`);

let identicalCount = 0;
let maxDiff = 0;
const diffs: number[] = [];

for (let i = 0; i < Math.min(expA.length, expB.length); i++) {
  const diff = Math.abs(expA[i] - expB[i]);
  diffs.push(diff);
  if (diff < 0.0001) identicalCount++;
  if (diff > maxDiff) maxDiff = diff;
}

console.log(`   完全相同的点: ${identicalCount}/${Math.min(expA.length, expB.length)} (${(identicalCount/Math.min(expA.length, expB.length)*100).toFixed(0)}%)`);
console.log(`   最大差异: ${maxDiff}`);
console.log(`   平均差异: ${(diffs.reduce((a,b)=>a+b,0)/diffs.length).toFixed(6)}`);

console.log(`\n   🔑 关键发现: 两组数据${identicalCount === expA.length ? '100%完全相同' : `有${expA.length-identicalCount}个不同`}`);
if (identicalCount === expA.length) {
  console.log('   ⚠️ 这是典型的"复制粘贴"造假特征!');
}

console.log('\n' + '='.repeat(80));
