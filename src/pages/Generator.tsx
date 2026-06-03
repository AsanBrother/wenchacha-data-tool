import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { generateData, calculateStats, type GenerationConfig, type StatsData } from '../utils/dataGenerator';
import { exportToCSV } from '../utils/fileHandler';
import DataTable from '../components/DataTable';
import ChartViewer from '../components/ChartViewer';
import { Cpu, Download, RefreshCw } from 'lucide-react';

export default function Generator() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<GenerationConfig>({
    distribution: 'normal',
    sampleSize: 100,
    mean: 50,
    std: 10,
    min: 0,
    max: 100,
    rate: 0.5,
    trials: 10,
    probability: 0.5,
    decimalPlaces: 2,
  });
  const [generatedData, setGeneratedData] = useState<number[] | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    try {
      const data = generateData(config);
      setGeneratedData(data);
      setStats(calculateStats(data));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedData) return;
    exportToCSV(generatedData, 'generated_data.csv');
  };

  const updateConfig = (updates: Partial<GenerationConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const histogramData = useMemo(() => {
    if (!generatedData) return null;

    const min = Math.min(...generatedData);
    const max = Math.max(...generatedData);
    const bins = 20;
    const binWidth = (max - min) / bins;
    const histogram = Array(bins).fill(0);

    generatedData.forEach((value) => {
      let binIndex = Math.floor((value - min) / binWidth);
      if (binIndex >= bins) binIndex = bins - 1;
      histogram[binIndex]++;
    });

    return {
      labels: histogram.map((_, i) => (min + i * binWidth).toFixed(1)),
      values: histogram,
    };
  }, [generatedData]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('generator.title')}</h1>
          <p className="text-gray-600">{t('home.features.generator.description')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">{t('generator.config.distribution')}</h2>
              <select
                value={config.distribution}
                onChange={(e) => updateConfig({ distribution: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165DFF] focus:border-transparent"
              >
                <option value="normal">{t('generator.config.normal')}</option>
                <option value="uniform">{t('generator.config.uniform')}</option>
                <option value="exponential">{t('generator.config.exponential')}</option>
                <option value="binomial">{t('generator.config.binomial')}</option>
              </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">{t('generator.config.sampleSize')}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('generator.config.sampleSize')}
                </label>
                <input
                  type="number"
                  value={config.sampleSize}
                  onChange={(e) => updateConfig({ sampleSize: parseInt(e.target.value) || 100})}
                  min="10"
                  max="10000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165DFF] focus:border-transparent"
                />
              </div>

              {config.distribution === 'normal' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('generator.config.mean')}
                    </label>
                    <input
                      type="number"
                      value={config.mean}
                      onChange={(e) => updateConfig({ mean: parseFloat(e.target.value) || 0})}
                      step="0.1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165DFF] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('generator.config.std')}
                    </label>
                    <input
                      type="number"
                      value={config.std}
                      onChange={(e) => updateConfig({ std: parseFloat(e.target.value) || 1})}
                      min="0.1"
                      step="0.1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165DFF] focus:border-transparent"
                    />
                  </div>
                  </>
              )}

              {config.distribution === 'uniform' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('generator.config.min')}
                    </label>
                    <input
                      type="number"
                      value={config.min}
                      onChange={(e) => updateConfig({ min: parseFloat(e.target.value) || 0})}
                      step="0.1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165DFF] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('generator.config.max')}
                    </label>
                    <input
                      type="number"
                      value={config.max}
                      onChange={(e) => updateConfig({ max: parseFloat(e.target.value) || 100})}
                      step="0.1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165DFF] focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {config.distribution === 'exponential' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('generator.config.rate')}
                  </label>
                  <input
                    type="number"
                    value={config.rate}
                    onChange={(e) => updateConfig({ rate: parseFloat(e.target.value) || 0.5})}
                    min="0.01"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165DFF] focus:border-transparent"
                  />
                </div>
              )}

              {config.distribution === 'binomial' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('generator.config.trials')}
                    </label>
                    <input
                      type="number"
                      value={config.trials}
                      onChange={(e) => updateConfig({ trials: parseInt(e.target.value) || 10})}
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165DFF] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('generator.config.probability')}
                    </label>
                    <input
                      type="number"
                      value={config.probability}
                      onChange={(e) => updateConfig({ probability: parseFloat(e.target.value) || 0.5})}
                      min="0"
                      max="1"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165DFF] focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('generator.config.decimalPlaces')}
                </label>
                <input
                  type="number"
                  value={config.decimalPlaces}
                  onChange={(e) => updateConfig({ decimalPlaces: parseInt(e.target.value) || 0})}
                  min="0"
                  max="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165DFF] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-[#165DFF] text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{t('common.loading')}</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-5 h-5" />
                    <span>{t('generator.actions.generate')}</span>
                  </>
                )}
              </button>

              {generatedData && (
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">{t('generator.actions.download')}</span>
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            {generatedData && stats && (
              <>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">{t('generator.preview.stats')}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">{t('repair.preview.stats.mean')}</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.mean.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">{t('repair.preview.stats.median')}</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.median.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">{t('repair.preview.stats.std')}</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.std.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">{t('repair.preview.stats.min')}</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.min.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">{t('repair.preview.stats.max')}</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.max.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {histogramData && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">{t('generator.preview.title')}</h2>
                    <ChartViewer
                      labels={histogramData.labels}
                      values={histogramData.values}
                      title="Distribution"
                    />
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">{t('detection.table.value')}</h2>
                  <DataTable data={generatedData} />
                </div>
              </>
            )}

            {!generatedData && (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Cpu className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('generator.preview.title')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
