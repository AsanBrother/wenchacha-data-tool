import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, RepairRecord } from '../store/useStore';
import DataUploader from '../components/DataUploader';
import DataTable from '../components/DataTable';
import { repairData } from '../utils/dataRepair';
import { calculateStats } from '../utils/dataGenerator';
import { exportToCSV } from '../utils/fileHandler';
import { Download, Wrench, RefreshCw, CheckCircle2, XCircle, ArrowRightLeft } from 'lucide-react';

export default function Repair() {
  const { t } = useTranslation();
  const {
    currentData,
    setCurrentData,
    detectionResults,
    suspiciousIndices,
    selectedIndices,
    toggleSelectedIndex,
    selectAllSuspicious,
    clearSelection,
    repairedData,
    setRepairedData,
    repairRecords,
    statsBefore,
    setStatsBefore,
    statsAfter,
    setStatsAfter,
  } = useStore();
  const [isRepairing, setIsRepairing] = useState(false);
  const [showDiffOnly, setShowDiffOnly] = useState(false);

  const handleDataLoaded = (data: number[]) => {
    setCurrentData(data);
  };

  const handleRepair = async () => {
    if (!currentData || selectedIndices.size === 0) return;

    setIsRepairing(true);
    try {
      const beforeStats = calculateStats(currentData);
      setStatsBefore(beforeStats);

      const result = repairData(currentData, selectedIndices, detectionResults);
      setRepairedData(result.repairedData, result.repairRecords);
      setStatsAfter(result.statsAfter);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleDownload = () => {
    if (repairedData) {
      exportToCSV(repairedData, 'repaired_data.csv');
    }
  };

  const handleDownloadDiff = () => {
    if (!repairedData || !currentData) return;
    
    const csvContent = [
      ['Index', 'Original', 'Repaired', 'Difference', 'Reason'],
      ...repairRecords.map(r => [
        r.index + 1,
        r.originalValue,
        r.repairedValue,
        (r.repairedValue - r.originalValue).toFixed(4),
        r.reason
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'repair_diff.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDiffClass = (index: number) => {
    if (!repairedData || !currentData) return '';
    if (Math.abs(repairedData[index] - currentData[index]) > 0.0001) {
      return 'bg-yellow-50';
    }
    return '';
  };

  const hasDetectionResults = detectionResults.length > 0;
  const hasSuspicious = suspiciousIndices.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">数据修复</h1>
          <p className="text-gray-600">修复可疑数据，保持整体统计特征不变</p>
        </div>

        {!currentData ? (
          <DataUploader onDataLoaded={handleDataLoaded} />
        ) : (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">
                    {currentData.length} 条数据
                  </span>
                  {hasSuspicious && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                      {suspiciousIndices.length} 个可疑值
                    </span>
                  )}
                  {selectedIndices.size > 0 && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      已选择 {selectedIndices.size} 个
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setCurrentData(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    重置
                  </button>
                  
                  {repairedData && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleDownload}
                        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>下载修复数据</span>
                      </button>
                      <button
                        onClick={handleDownloadDiff}
                        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>下载变更记录</span>
                      </button>
                    </div>
                  )}
                  
                  {hasSuspicious && !repairedData && (
                    <div className="flex items-center space-x-2 border-l pl-3">
                      <button
                        onClick={selectAllSuspicious}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        全选可疑值
                      </button>
                      <button
                        onClick={clearSelection}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        清空选择
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={handleRepair}
                    disabled={isRepairing || selectedIndices.size === 0}
                    className="flex items-center space-x-2 px-6 py-2 bg-[#165DFF] text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isRepairing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>修复中...</span>
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4" />
                        <span>修复选中值</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {!hasDetectionResults && !repairedData && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-700 text-sm">
                    💡 建议先到「检测」页面运行检测，系统会自动标记可疑数据
                  </p>
                </div>
              )}
            </div>

            {repairedData && (
              <div className="grid md:grid-cols-2 gap-6">
                <StatsCard title="修复前统计" stats={statsBefore} />
                <StatsCard title="修复后统计" stats={statsAfter} diffWith={statsBefore} />
              </div>
            )}

            {repairedData && repairRecords.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">修复记录</h3>
                  <label className="flex items-center space-x-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={showDiffOnly}
                      onChange={(e) => setShowDiffOnly(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>仅显示变更</span>
                  </label>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">索引</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">原值</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">修复值</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">差异</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">原因</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {repairRecords.map((record, idx) => {
                        const diff = record.repairedValue - record.originalValue;
                        const show = !showDiffOnly || Math.abs(diff) > 0.0001;
                        if (!show) return null;
                        
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-600">#{record.index + 1}</td>
                            <td className="px-4 py-2 text-sm font-mono text-gray-900">
                              {record.originalValue}
                            </td>
                            <td className="px-4 py-2 text-sm font-mono text-blue-600 font-medium">
                              {record.repairedValue}
                            </td>
                            <td className={`px-4 py-2 text-sm font-mono ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(4)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{record.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-6">
              {!repairedData ? (
                <>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    选择要修复的值 <span className="text-sm font-normal text-gray-500">(点击值可切换选择)</span>
                  </h3>
                  <DataTable
                    data={currentData}
                    suspiciousIndices={suspiciousIndices}
                    selectable={true}
                    selectedIndices={selectedIndices}
                    onToggleIndex={toggleSelectedIndex}
                  />
                </>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <span>原始数据</span>
                      <span className="text-sm font-normal text-gray-500">({currentData.length})</span>
                    </h3>
                    <DataTable
                      data={currentData}
                      suspiciousIndices={suspiciousIndices}
                      highlightIndices={new Set(repairRecords.map(r => r.index))}
                      highlightClass="bg-orange-100"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <span>修复后数据</span>
                      <span className="text-sm font-normal text-gray-500">({repairedData.length})</span>
                    </h3>
                    <DataTable
                      data={repairedData}
                      highlightIndices={new Set(repairRecords.map(r => r.index))}
                      highlightClass="bg-green-100"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({ title, stats, diffWith }: { title: string; stats: any; diffWith?: any }) {
  if (!stats) return null;

  const formatDiff = (after: number, before: number) => {
    if (diffWith === undefined) return '';
    const diff = after - before;
    const relDiff = before !== 0 ? (diff / Math.abs(before)) * 100 : 0;
    
    let color = 'text-gray-500';
    if (Math.abs(relDiff) > 0.1) color = diff > 0 ? 'text-green-600' : 'text-red-600';
    
    return (
      <span className={`ml-2 text-xs ${color}`}>
        {diff > 0 ? '+' : ''}{diff.toFixed(4)} ({relDiff > 0 ? '+' : ''}{relDiff.toFixed(2)}%)
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm text-gray-500">均值</span>
          <p className="font-medium text-gray-900">
            {stats.mean.toFixed(4)}
            {formatDiff(stats.mean, diffWith?.mean)}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">中位数</span>
          <p className="font-medium text-gray-900">
            {stats.median.toFixed(4)}
            {formatDiff(stats.median, diffWith?.median)}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">标准差</span>
          <p className="font-medium text-gray-900">
            {stats.std.toFixed(4)}
            {formatDiff(stats.std, diffWith?.std)}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">范围</span>
          <p className="font-medium text-gray-900">
            [{stats.min.toFixed(4)}, {stats.max.toFixed(4)}]
          </p>
        </div>
      </div>
    </div>
  );
}
