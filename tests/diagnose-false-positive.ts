import fs from 'fs';
import { runFullAuditMultiTable } from '../src/utils/auditEngine.ts';

function parseCSVColumns(filePath: string, skipCols: string[] = []): number[][] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return headers
    .filter(h => !skipCols.includes(h))
    .map(h => {
      const idx = headers.indexOf(h);
      return lines.slice(1).map(line => {
        const cols = line.split(',');
        return parseFloat(cols[idx]?.trim());
      }).filter(n => !isNaN(n));
    })
    .filter(col => col.length >= 5);
}

console.log('=== 正常数据误报诊断 ===\n');

const normalBio = parseCSVColumns('/workspace/data/normal_biology_data.csv', ['sample_id']);
const normalRand = parseCSVColumns('/workspace/data/normal_random_data.csv', ['id']);

console.log('📊 正常生物数据:');
const report1 = runFullAuditMultiTable(normalBio);
console.log(`   风险: ${report1.overallRiskLevel.toUpperCase()}`);
report1.findings.filter(f => f.riskLevel === 'high' || f.riskLevel === 'critical').forEach(f => {
  console.log(`   [${f.riskLevel.toUpperCase()}] ${f.testName}: ${f.evidence.slice(0, 80)}`);
});

console.log('\n📊 随机数据:');
const report2 = runFullAuditMultiTable(normalRand);
console.log(`   风险: ${report2.overallRiskLevel.toUpperCase()}`);
report2.findings.filter(f => f.riskLevel === 'high' || f.riskLevel === 'critical').forEach(f => {
  console.log(`   [${f.riskLevel.toUpperCase()}] ${f.testName}: ${f.evidence.slice(0, 80)}`);
});
