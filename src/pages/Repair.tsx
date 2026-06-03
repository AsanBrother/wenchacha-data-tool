import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type StatsData } from '../store/useStore';
import DataUploader from '../components/DataUploader';
import DataTable from '../components/DataTable';
import { repairData } from '../utils/dataRepair';
import { calculateStats } from '../utils/dataGenerator';
import { exportToCSV } from '../utils/fileHandler';
import { Download, Wrench, RefreshCw } from 'lucide-react';

export default function Repair() {
  const { t } = useTranslation();
  const {
    currentData,
    setCurrentData,
    repairedData,
    setRepairedData,
    statsBefore,
    setStatsBefore,
    statsAfter,
    setStatsAfter,
  } = useStore();
  const [isRepairing, setIsRepairing] = useState(false);

  const handleDataLoaded = (data: number[]) => {
    setCurrentData(data);
    setRepairedData(null);
    setStatsBefore(null);
    setStatsAfter(null);
  };

  const handleRepair = async () => {
    if (!currentData) return;

    setIsRepairing(true);
    try {
      const beforeStats = calculateStats(currentData);
      setStatsBefore(beforeStats);

      const result = repairData(currentData, [], beforeStats);
      setRepairedData(result.repairedData);
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

  const StatsCard = ({ title, stats }: { title: string; stats: StatsData | null }) => (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">{t('repair.preview.stats.mean')}</span>
            <p className="font-medium text-gray-900">{stats.mean.toFixed(4)}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">{t('repair.preview.stats.median')}</span>
            <p className="font-medium text-gray-900">{stats.median.toFixed(4)}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">{t('repair.preview.stats.std')}</span>
            <p className="font-medium text-gray-900">{stats.std.toFixed(4)}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">{t('repair.preview.stats.min')}</span>
            <p className="font-medium text-gray-900">{stats.min.toFixed(4)}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">{t('repair.preview.stats.max')}</span>
            <p className="font-medium text-gray-900">{stats.max.toFixed(4)}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('repair.title')}</h1>
          <p className="text-gray-600">{t('home.features.repair.description')}</p>
        </div>

        {!currentData ? (
          <DataUploader onDataLoaded={handleDataLoaded} />
        ) : (
          <div className="space-y-8">
            {/* Control bar */}
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                  {currentData.length} {t('common.noData')}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setCurrentData(null);
                    setRepairedData(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                {repairedData && (
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('repair.actions.download')}</span>
                  </button>
                )}
                <button
                  onClick={handleRepair}
                  disabled={isRepairing}
                  className="flex items-center space-x-2 px-6 py-2 bg-[#165DFF] text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRepairing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t('common.loading')}</span>
                    </>
                  ) : (
                    <>
                      <Wrench className="w-4 h-4" />
                      <span>{t('repair.actions.repair')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Stats comparison */}
            {repairedData && (
              <div className="grid md:grid-cols-2 gap-6">
                <StatsCard title={t('repair.preview.before')} stats={statsBefore} />
                <StatsCard title={t('repair.preview.after')} stats={statsAfter} />
              </div>
            )}

            {/* Data tables */}
            {repairedData ? (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('repair.preview.before')}</h3>
                  <DataTable data={currentData} />
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('repair.preview.after')}</h3>
                  <DataTable data={repairedData} />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <DataTable data={currentData} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
