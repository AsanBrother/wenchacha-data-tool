import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileSpreadsheet, AlertCircle, FileText, Image, Loader2, CheckCircle2, Database } from 'lucide-react';
import { parseFile, parseManualInput, type ParsedData } from '../utils/fileHandler';
import { cn } from '../lib/utils';

interface DataUploaderProps {
  onDataLoaded: (data: number[], tables?: number[][], metadata?: ParsedData['metadata']) => void;
  className?: string;
}

export default function DataUploader({ onDataLoaded, className }: DataUploaderProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileInfo, setFileInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleClickUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setFileInfo(null);
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await processFile(files[0]);
    }
    if (e.target) {
      e.target.value = '';
    }
  }, []);

  const processFile = async (file: File) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const supportedFormats = ['csv', 'txt', 'tsv', 'xlsx', 'xls', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];
      
      if (!supportedFormats.includes(ext)) {
        throw new Error(`不支持的文件格式 .${ext}。支持的格式：${supportedFormats.map(f => `.${f}`).join(', ')}`);
      }

      setFileInfo(`正在处理 ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`);
      
      const parsedData = await parseFile(file);
      
      if (parsedData.numbers.length === 0 && parsedData.tables.flat().length === 0) {
        throw new Error('未能从文件中提取到有效数字数据');
      }

      setFileInfo(`✓ 成功解析 ${parsedData.metadata.fileName}: ${parsedData.numbers.length}个数值, ${parsedData.tables.length}行表格`);
      
      setTimeout(() => {
        onDataLoaded(parsedData.numbers, parsedData.tables, parsedData.metadata);
        setIsProcessing(false);
        setFileInfo(null);
      }, 500);
      
    } catch (err) {
      setIsProcessing(false);
      setFileInfo(null);
      setError(err instanceof Error ? err.message : '文件处理失败');
    }
  };

  const handleManualSubmit = () => {
    setError(null);
    try {
      const data = parseManualInput(manualInput);
      if (data.numbers.length === 0) {
        setError('未找到有效数字');
        return;
      }
      onDataLoaded(data.numbers, data.tables, data.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : '输入解析失败');
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClickUpload}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative',
          isDragging
            ? 'border-[#165DFF] bg-blue-50 scale-[1.02]'
            : 'border-gray-300 hover:border-[#165DFF] hover:bg-gray-50',
          isProcessing && 'pointer-events-none opacity-75'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.tsv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          tabIndex={-1}
          aria-hidden="true"
        />
        
        <div className="flex flex-col items-center pointer-events-none">
          {isProcessing ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-500 mb-4 animate-spin" />
              <p className="text-lg font-medium text-gray-900 mb-2">正在处理文件...</p>
              {fileInfo && (
                <p className="text-sm text-gray-500">{fileInfo}</p>
              )}
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {t('detection.upload.dragDrop')}{' '}
                <span className="text-[#165DFF] underline">{t('detection.upload.browse')}</span>
              </p>
              <p className="text-sm text-gray-500 mb-4">{t('detection.upload.types')}</p>
              
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                <FormatBadge icon={<FileSpreadsheet className="w-4 h-4" />} label="CSV/TXT" />
                <FormatBadge icon={<Database className="w-4 h-4" />} label="Excel" />
                <FormatBadge icon={<FileText className="w-4 h-4" />} label="PDF" />
                <FormatBadge icon={<Image className="w-4 h-4" />} label="图片OCR" />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">{t('detection.upload.manualInput')}</p>
        <textarea
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder={t('detection.upload.manualPlaceholder')}
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#165DFF] focus:border-transparent resize-none"
        />
        <button
          onClick={handleManualSubmit}
          disabled={!manualInput.trim()}
          className="px-6 py-2 bg-[#165DFF] text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t('detection.upload.manualInput')}
        </button>
      </div>

      {error && (
        <div className="flex items-start space-x-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {fileInfo && !isProcessing && fileInfo.startsWith('✓') && (
        <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{fileInfo}</span>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <h4 className="font-medium text-blue-800 text-sm mb-2">💡 支持的数据源</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• <strong>CSV/TXT</strong>: 逗号/制表符分隔的数值数据</li>
          <li>• <strong>Excel</strong>: .xlsx/.xls 文件（自动识别表头）</li>
          <li>• <strong>PDF</strong>: 学术论文PDF（自动提取文本中的数字和表格）</li>
          <li>• <strong>图片</strong>: 图表截图/PNG/JPG（使用OCR自动识别数字）</li>
          <li>• <strong>手动输入</strong>: 直接粘贴或键入数字序列</li>
        </ul>
      </div>
    </div>
  );
}

function FormatBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 shadow-sm">
      {icon}
      <span>{label}</span>
    </div>
  );
}
