import fs from 'fs';
import path from 'path';
import { runFullAudit } from '../src/utils/auditEngine.ts';

interface TestCase {
  file: string;
  description: string;
  expectedAnomalies: string[];
  expectedRisk: 'low' | 'medium' | 'high' | 'critical';
}

const testCases: TestCase[] = [
  {
    file: 'case1_tongji_arithmetic.csv',
    description: '同济 Figure 4c: col3 = col4 + 0.3（固定差值）',
    expectedAnomalies: ['等差数列', '固定差值', 'math_consistency'],
    expectedRisk: 'high'
  },
  {
    file: 'case1_tongji_lastdigit_5.csv',
    description: '同济 Figure 6g: 末位数字5出现频率畸高（>70%）',
    expectedAnomalies: ['末位数字', '0/5集中', 'terminal_digit'],
    expectedRisk: 'high'
  },
  {
    file: 'case1_tongji_percentage.csv',
    description: '同济 Figure 4f: 70个百分比全1位小数（精度异常）',
    expectedAnomalies: ['精度', '末位', '分布'],
    expectedRisk: 'medium'
  },
  {
    file: 'case1_tongji_mice_weight.csv',
    description: '同济小鼠体重: 196只仅1只末位为0（正常应约10%）',
    expectedAnomalies: ['末位数字', '0频率偏低'],
    expectedRisk: 'medium'
  },
  {
    file: 'case2_nankai_64groups.csv',
    description: '南开64组流式数据: 小数点后两位完全一致',
    expectedAnomalies: ['重复', '雷同', 'data_duplication'],
    expectedRisk: 'critical'
  },
  {
    file: 'case3_zhongshan_copy.csv',
    description: '中山图片复用: 两组不同实验数据完全相同',
    expectedAnomalies: ['重复', '完全相同', 'data_duplication'],
    expectedRisk: 'high'
  },
  {
    file: 'case4_shanghai_arithmetic.csv',
    description: '上海等差数列: 70个差值固定0.43',
    expectedAnomalies: ['等差数列', '固定差值', 'arithmetic'],
    expectedRisk: 'critical'
  },
  {
    file: 'normal_biology_data.csv',
    description: '正常对照: 模拟真实生物实验数据',
    expectedAnomalies: [],
    expectedRisk: 'low'
  },
  {
    file: 'normal_random_data.csv',
    description: '随机对照: 完全随机生成',
    expectedAnomalies: [],
    expectedRisk: 'low'
  }
];

function parseCSV(filePath: string): number[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const numbers: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    for (const col of cols) {
      const num = parseFloat(col.trim());
      if (!isNaN(num) && col.trim() !== '') {
        numbers.push(num);
      }
    }
  }

  return numbers;
}

function runTest(testCase: TestCase): {
  passed: boolean;
  details: {
    dataPoints: number;
    overallRisk: string;
    findingsCount: number;
    highRiskFindings: number;
    categories: string[];
    keyEvidence: string[];
  };
  analysis: string;
} {
  const filePath = path.join('/workspace/data', testCase.file);
  
  if (!fs.existsSync(filePath)) {
    return {
      passed: false,
      details: {
        dataPoints: 0,
        overallRisk: 'N/A',
        findingsCount: 0,
        highRiskFindings: 0,
        categories: [],
        keyEvidence: [`❌ 文件不存在: ${filePath}`]
      },
      analysis: `文件缺失，无法测试`
    };
  }

  const data = parseCSV(filePath);
  const report = runFullAudit(data);

  const highRiskFindings = report.findings.filter(
    f => f.riskLevel === 'high' || f.riskLevel === 'critical'
  );
  const categories = [...new Set(report.findings.map(f => f.category))];
  const keyEvidence = report.findings.slice(0, 5).map(f => 
    `[${f.riskLevel.toUpperCase()}] ${f.testName}: ${f.evidence.slice(0, 80)}...`
  );

  let passed = true;
  const analysis: string[] = [];

  const isNormalCase = testCase.expectedAnomalies.length === 0;

  if (isNormalCase) {
    if (report.overallRiskLevel !== 'low') {
      passed = false;
      analysis.push(`⚠️ 风险等级预期low，实际${report.overallRiskLevel}`);
    }
    if (highRiskFindings.length > 2) {
      passed = false;
      analysis.push(`⚠️ 高风险发现过多(${highRiskFindings.length}个)，可能误报`);
    }
    if (highRiskFindings.length === 0) {
      analysis.push(`✅ 正确识别为正常数据（无高风险发现）`);
    }
  } else {
    const riskMatch = report.overallRiskLevel === testCase.expectedRisk ||
                     (testCase.expectedRisk === 'high' && report.overallRiskLevel === 'critical') ||
                     (testCase.expectedRisk === 'critical' && report.overallRiskLevel === 'high');
    
    if (!riskMatch) {
      analysis.push(`⚠️ 风险等级: 预期${testCase.expectedRisk}, 实际${report.overallRiskLevel}`);
    } else {
      analysis.push(`✅ 风险等级正确: ${report.overallRiskLevel}`);
    }

    const evidenceText = report.findings.map(f => 
      f.testName + ' ' + f.evidence + ' ' + f.method
    ).join(' ').toLowerCase();

    let matchedAnomalies = 0;
    for (const expected of testCase.expectedAnomalies) {
      if (evidenceText.includes(expected.toLowerCase())) {
        matchedAnomalies++;
        analysis.push(`✅ 检测到预期异常: ${expected}`);
      } else {
        analysis.push(`❌ 未检测到预期异常: ${expected}`);
        passed = false;
      }
    }

    if (matchedAnomalies === testCase.expectedAnomalies.length) {
      analysis.push(`✅ 全部${testCase.expectedAnomalies.length}个预期异常均被检测到`);
    }

    if (highRiskFindings.length > 0) {
      analysis.push(`✅ 发现${highRiskFindings.length}条高风险证据`);
    } else {
      analysis.push(`❌ 未发现高风险证据（预期应检测到造假）`);
      passed = false;
    }
  }

  return {
    passed,
    details: {
      dataPoints: data.length,
      overallRisk: report.overallRiskLevel,
      findingsCount: report.findings.length,
      highRiskFindings: highRiskFindings.length,
      categories,
      keyEvidence
    },
    analysis: analysis.join('\n')
  };
}

console.log('='.repeat(80));
console.log('耿同学学术打假审计引擎 - 全面自测验证报告');
console.log('='.repeat(80));
console.log(`测试时间: ${new Date().toISOString()}`);
console.log(`测试案例: ${testCases.length}个（4个造假案例 + 2组正常对照）\n`);

let totalPassed = 0;
let totalFailed = 0;
const results: Array<{
  name: string;
  passed: boolean;
  risk: string;
  findings: number;
  summary: string;
}> = [];

for (const tc of testCases) {
  console.log('─'.repeat(80));
  console.log(`📁 测试文件: ${tc.file}`);
  console.log(`📝 描述: ${tc.description}`);
  console.log(`🎯 预期风险: ${tc.expectedRisk.toUpperCase()} | 预期异常: [${tc.expectedAnomalies.join(', ') || '无'}]`);
  
  const result = runTest(tc);
  
  console.log(`\n📊 实测结果:`);
  console.log(`   数据点数: ${result.details.dataPoints}`);
  console.log(`   综合风险: ${result.details.overallRisk.toUpperCase()}`);
  console.log(`   发现总数: ${result.details.findingsCount}`);
  console.log(`   高风险项: ${result.details.highRiskFindings}`);
  console.log(`   涉及类别: [${result.details.categories.join(', ')}]`);
  
  console.log(`\n🔍 关键证据:`);
  result.details.keyEvidence.forEach(e => console.log(`   ${e}`));
  
  console.log(`\n✅ 验证分析:`);
  console.log(result.analysis.split('\n').map(l => `   ${l}`).join('\n'));
  
  console.log(`\n🏷️ 结论: ${result.passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (result.passed) totalPassed++;
  else totalFailed++;
  
  results.push({
    name: tc.file,
    passed: result.passed,
    risk: result.details.overallRisk,
    findings: result.details.highRiskFindings,
    summary: result.passed ? '通过' : '未通过'
  });
}

console.log('='.repeat(80));
console.log('📈 测试汇总');
console.log('='.repeat(80));
console.log(`总案例数: ${testCases.length}`);
console.log(`通过: ${totalPassed} ✅ | 失败: ${totalFailed} ❌`);
console.log(`通过率: ${(totalPassed / testCases.length * 100).toFixed(1)}%\n`);

console.log('详细结果表:');
console.log('─'.repeat(60));
results.forEach(r => {
  const icon = r.passed ? '✅' : '❌';
  console.log(`${icon} ${r.name.padEnd(35)} 风险:${r.risk.padEnd(10)} 高风险:${r.findings}  ${r.summary}`);
});
console.log('─'.repeat(60));

if (totalFailed === 0) {
  console.log('\n🎉 所有测试用例全部通过！审计引擎运行符合预期。');
} else {
  console.log(`\n⚠️  ${totalFailed}个测试未通过，需要进一步分析原因。`);
  process.exit(1);
}
