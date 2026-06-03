import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import DataUploader from '../components/DataUploader';
import DataTable from '../components/DataTable';
import ChartViewer from '../components/ChartViewer';
import { runAllTests, type DetectionResult } from '../utils/statistics';
import { calculateStats } from '../utils/dataGenerator';
import { exportToCSV } from '../utils/fileHandler';
import { runFullAudit, runFullAuditMultiTable, getRiskLabel, getCategoryLabel, type AuditReport, type RiskLevel } from '../utils/auditEngine';
import { type ParsedData } from '../utils/fileHandler';
import { Download, CheckCircle, AlertTriangle, RefreshCw, Shield, FileText, AlertOctagon, Scale } from 'lucide-react';

export default function Detection() {
  const { t } = useTranslation();
  const { currentData, setCurrentData, detectionResults, setDetectionResults } = useStore();
  const [isRunning, setIsRunning] = useState(false);
  const [auditMode, setAuditMode] = useState<'basic' | 'full'>('full');
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [parsedMetadata, setParsedMetadata] = useState<ParsedData['metadata'] | null>(null);
  const [dataTables, setDataTables] = useState<number[][]>([]);

  const allSuspiciousIndices = useMemo(() => {
    const indices = new Set<number>();
    detectionResults.forEach((result) => {
      result.suspiciousIndices?.forEach((idx) => indices.add(idx));
    });
    return Array.from(indices);
  }, [detectionResults]);

  const stats = useMemo(() => {
    if (currentData && currentData.length > 0) {
      return calculateStats(currentData);
    }
    return null;
  }, [currentData]);

  const handleDataLoaded = (data: number[], tables?: number[][], metadata?: ParsedData['metadata']) => {
    setCurrentData(data);
    setDetectionResults([]);
    setAuditReport(null);
    if (metadata) {
      setParsedMetadata(metadata);
    }
    if (tables && tables.length > 0) {
      setDataTables(tables);
    } else {
      setDataTables([data]);
    }
  };

  const handleRunTests = async () => {
    if (!currentData) return;

    setIsRunning(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const results = runAllTests(currentData);
      setDetectionResults(results);

      if (auditMode === 'full') {
        let report: AuditReport;
        
        if (dataTables.length > 1 && dataTables.some(t => t.length > 5)) {
          report = runFullAuditMultiTable(dataTables);
        } else {
          report = runFullAudit(currentData);
        }
        
        setAuditReport(report);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownloadReport = () => {
    if (!currentData) return;
    exportToCSV(currentData, 'data_report.csv');
  };

  const handleExportLedger = () => {
    if (!auditReport) return;
    const sections: string[] = [
      '# Evidence Ledger - 耿同学学术打假审计报告',
      `# 时间: ${auditReport.timestamp}`,
      `# 综合风险等级: ${getRiskLabel(auditReport.overallRiskLevel)}`,
      `# ${auditReport.summary}`,
      '',
      '## 数据概览',
      `- 数值总数: ${auditReport.dataSummary.totalNumbers}`,
      `- 表格数: ${auditReport.dataSummary.tableCount}`,
      '',
    ];

    auditReport.findings.forEach((f, i) => {
      sections.push(
        `### ${i + 1}. [${getRiskLabel(f.riskLevel).toUpperCase()}] ${f.testName}`,
        `- 类别: ${getCategoryLabel(f.category)}`,
        `- 置信度: ${(f.confidence * 100).toFixed(0)}%`,
        `- 证据: ${f.evidence}`,
        `- 方法: ${f.method}`,
        f.benignExplanation ? `- 善意解释: ${f.benignExplanation}` : '',
        f.pressureTestResult ? `- 压力测试: ${f.pressureTestResult}` : '',
        `- 建议: ${f.recommendation}`,
        ''
      );
    });

    sections.push('## 局限性');
    auditReport.limitations.forEach(l => {
      sections.push(`- ${l}`);
    });

    const lines = sections.join('\n');

    const blob = new Blob([lines], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evidence_ledger.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTestLabel = (testName: string) => {
    const labels: Record<string, string> = {
      'lastDigit': t('detection.tests.lastDigit'),
      'chiSquare': t('detection.tests.chiSquare'),
      'benford': t('detection.tests.benford'),
      'duplicate': t('detection.tests.duplicate'),
      'arithmetic': t('detection.tests.arithmetic'),
    };
    return labels[testName] || testName;
  };

  const riskColorMap: Record<RiskLevel, string> = {
    low: 'bg-green-50 border-green-200 text-green-700',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    high: 'bg-red-50 border-red-200 text-red-700',
    critical: 'bg-purple-950 border-purple-900 text-white',
  };

  const riskIconMap: Record<RiskLevel, React.ReactNode> = {
    low: <CheckCircle className="w-5 h-5" />,
    medium: <AlertTriangle className="w-5 h-5" />,
    high: <AlertTriangle className="w-5 h-5" />,
    critical: <AlertOctagon className="w-5 h-5" />,
  };

  const categoryIconMap: Record<string, React.ReactNode> = {
    image_identity: <FileText className="w-4 h-4" />,
    data_duplication: <Scale className="w-4 h-4" />,
    terminal_digit: <Shield className="w-4 h-4" />,
    math_consistency: <Scale className="w-4 h-4" />,
    distribution: <Scale className="w-4 h-4" />,
    domain_sanity: <Shield className="w-4 h-4" />,
    defense_test: <Shield className="w-4 h-4" />,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('detection.title')}</h1>
          <p className="text-gray-600">
            {t('home.features.detection.description')}
            {auditMode === 'full' && (
              <span className="ml-2 text-sm font-medium text-blue-600">（耿同学方法论·完整审计模式）</span>
            )}
          </p>
        </div>

        {!currentData ? (
          <DataUploader onDataLoaded={handleDataLoaded} />
        ) : (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                  {currentData.length} {t('common.noData')}
                </span>
                {stats && (
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-600">
                      μ: <span className="font-medium text-gray-900">{stats.mean.toFixed(2)}</span>
                    </span>
                    <span className="text-gray-600">
                      σ: <span className="font-medium text-gray-900">{stats.std.toFixed(2)}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex rounded-lg overflow-hidden border border-gray-300">
                  <button
                    onClick={() => { setAuditMode('basic'); setAuditReport(null); }}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      auditMode === 'basic'
                        ? 'bg-[#165DFF] text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    基础检测
                  </button>
                  <button
                    onClick={() => { setAuditMode('full'); setAuditReport(null); }}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      auditMode === 'full'
                        ? 'bg-[#165DFF] text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    耿同学审计
                  </button>
                </div>

                <button
                  onClick={() => {
                    setCurrentData(null);
                    setDetectionResults([]);
                    setAuditReport(null);
                    setParsedMetadata(null);
                    setDataTables([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t('common.cancel')}
                </button>

                {(detectionResults.length > 0 || auditReport) && (
                  <button
                    onClick={handleDownloadReport}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('detection.results.download')}</span>
                  </button>
                )}

                {auditReport && (
                  <button
                    onClick={handleExportLedger}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>导出证据台账</span>
                  </button>
                )}

                <button
                  onClick={handleRunTests}
                  disabled={isRunning}
                  className="flex items-center space-x-2 px-6 py-2 bg-[#165DFF] text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t('common.loading')}</span>
                    </>
                  ) : (
                    <span>{t('detection.run')}</span>
                  )}
                </button>
              </div>
            </div>

            {auditMode === 'full' && auditReport ? (
              <div className="space-y-6">
                <div className={`rounded-xl p-6 border-2 ${
                  auditReport.overallRiskLevel === 'critical' ? 'bg-purple-950 border-purple-400 text-white' :
                  auditReport.overallRiskLevel === 'high' ? 'bg-red-50 border-red-300' :
                  auditReport.overallRiskLevel === 'medium' ? 'bg-yellow-50 border-yellow-300' :
                  'bg-green-50 border-green-300'
                }`}>
                  <div className="flex items-center space-x-3 mb-3">
                    {riskIconMap[auditReport.overallRiskLevel]}
                    <h2 className="text-xl font-bold">
                      综合风险评估：{getRiskLabel(auditReport.overallRiskLevel)}
                    </h2>
                  </div>
                  <p className="opacity-90">{auditReport.summary}</p>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm p-5 text-center">
                    <div className="text-2xl font-bold text-gray-900">{auditReport.dataSummary.totalNumbers}</div>
                    <div className="text-sm text-gray-500 mt-1">审查数值</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-5 text-center">
                    <div className="text-2xl font-bold text-gray-900">{auditReport.findings.filter(f => f.riskLevel !== 'low').length}</div>
                    <div className="text-sm text-gray-500 mt-1">异常线索</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-5 text-center">
                    <div className="text-2xl font-bold text-gray-900">{auditReport.findings.filter(f => f.riskLevel === 'high' || f.riskLevel === 'critical').length}</div>
                    <div className="text-sm text-gray-500 mt-1">高风险</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-5 text-center">
                    <div className="text-2xl font-bold text-gray-900">{new Set(auditReport.findings.map(f => f.category)).size}</div>
                    <div className="text-sm text-gray-500 mt-1">涉及类别</div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <span>证据台账（Evidence Ledger）</span>
                  </h3>
                  <div className="space-y-3">
                    {auditReport.findings.map((finding, i) => (
                      <div key={i} className={`rounded-lg border p-4 ${riskColorMap[finding.riskLevel]}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <span className="mt-0.5">{categoryIconMap[finding.category]}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-semibold">{finding.testName}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  finding.riskLevel === 'critical' ? 'bg-purple-800 text-white' :
                                  finding.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                                  finding.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {getRiskLabel(finding.riskLevel)}
                                </span>
                                <span className="text-xs opacity-70">{(finding.confidence * 100).toFixed(0)}%</span>
                              </div>
                              <p className="text-sm mt-1">{finding.evidence}</p>
                              <p className="text-xs opacity-70 mt-1">方法：{finding.method}</p>
                              {finding.benignExplanation && (
                                <p className="text-xs mt-2 italic opacity-80">善意解释：{finding.benignExplanation}</p>
                              )}
                              {finding.pressureTestResult && (
                                <p className="text-xs mt-1 opacity-80">压力测试：{finding.pressureTestResult}</p>
                              )}
                              <p className="text-xs mt-1 font-medium">建议：{finding.recommendation}</p>
                            </div>
                          </div>
                          {riskIconMap[finding.riskLevel]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">⚠️ 局限性声明</h4>
                  <ul className="text-sm text-orange-700 space-y-1">
                    {auditReport.limitations.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('detection.table.value')}</h3>
                  <DataTable data={currentData} suspiciousIndices={allSuspiciousIndices} />
                </div>
              </div>
            ) : detectionResults.length > 0 ? (
              <div className="space-y-8">
                <div className="grid md:grid-cols-5 gap-4">
                  {detectionResults.map((result, index) => (
                    <div
                      key={index}
                      className={`rounded-xl p-6 text-center ${result.passed ? 'bg-green-50' : 'bg-red-50'}`}
                    >
                      {result.passed ? (
                        <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                      ) : (
                        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                      )}
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {getTestLabel(result.testName)}
                      </h3>
                      <p className={`text-sm ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {result.passed ? t('detection.results.passed') : t('detection.results.failed')}
                      </p>
                      {result.pValue !== undefined && (
                        <p className="text-xs text-gray-500 mt-1">p = {result.pValue.toFixed(4)}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {detectionResults.map((result, index) => (
                    result.chartData && (
                      <div key={index} className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">
                          {getTestLabel(result.testName)}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">{result.details}</p>
                        <ChartViewer
                          labels={result.chartData.labels}
                          values={result.chartData.values}
                          title={getTestLabel(result.testName)}
                        />
                      </div>
                    )
                  ))}
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('detection.table.value')}</h3>
                  <DataTable data={currentData} suspiciousIndices={allSuspiciousIndices} />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
