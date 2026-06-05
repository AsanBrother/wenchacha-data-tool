import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { CheckCircle2, Circle } from 'lucide-react';

interface DataTableProps {
  data: number[];
  suspiciousIndices?: number[];
  className?: string;
  pageSize?: number;
  selectable?: boolean;
  selectedIndices?: Set<number>;
  onToggleIndex?: (index: number) => void;
  highlightIndices?: Set<number>;
  highlightClass?: string;
}

export default function DataTable({
  data,
  suspiciousIndices,
  className,
  pageSize = 20,
  selectable = false,
  selectedIndices,
  onToggleIndex,
  highlightIndices,
  highlightClass = 'bg-yellow-50',
}: DataTableProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  const suspiciousSet = useMemo(() => {
    return new Set(suspiciousIndices || []);
  }, [suspiciousIndices]);

  const startIndex = (currentPage - 1) * pageSize;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  选择
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('detection.table.index')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('detection.table.value')}
              </th>
              {suspiciousSet.size > 0 && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('detection.table.suspicious')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((value, index) => {
              const globalIndex = startIndex + index;
              const isSuspicious = suspiciousSet.has(globalIndex);
              const isSelected = selectedIndices?.has(globalIndex);
              const isHighlighted = highlightIndices?.has(globalIndex);

              return (
                <tr
                  key={globalIndex}
                  className={cn(
                    'transition-colors',
                    isHighlighted ? highlightClass : 'hover:bg-gray-50',
                    isSuspicious && !isHighlighted && 'bg-red-50',
                    selectable && 'cursor-pointer'
                  )}
                  onClick={() => {
                    if (selectable && onToggleIndex) {
                      onToggleIndex(globalIndex);
                    }
                  }}
                >
                  {selectable && (
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleIndex?.(globalIndex);
                        }}
                        className="flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {globalIndex + 1}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                    {value}
                  </td>
                  {suspiciousSet.size > 0 && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {isSuspicious ? (
                        <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                          {t('detection.table.suspicious')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                          ✓
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
