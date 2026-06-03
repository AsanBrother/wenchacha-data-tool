import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedData {
  numbers: number[];
  tables: number[][];
  headers?: string[];
  sourceType: 'csv' | 'excel' | 'pdf' | 'image' | 'text' | 'manual';
  metadata: {
    fileName: string;
    fileSize: number;
    columns: number;
    rows: number;
    extractionMethod: string;
  };
}

export async function parseFile(file: File): Promise<ParsedData> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  
  const baseMetadata = {
    fileName: file.name,
    fileSize: file.size,
    columns: 0,
    rows: 0,
    extractionMethod: '',
  };

  try {
    if (['csv', 'txt', 'tsv'].includes(ext)) {
      return await parseTextFile(file, baseMetadata);
    } else if (['xlsx', 'xls'].includes(ext)) {
      return await parseExcelFile(file, baseMetadata);
    } else if (ext === 'pdf') {
      return await parsePDFFile(file, baseMetadata);
    } else if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) {
      return await parseImageFile(file, baseMetadata);
    } else {
      throw new Error(`不支持的文件格式: .${ext}`);
    }
  } catch (error) {
    throw new Error(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

async function parseTextFile(file: File, metadata: ParsedData['metadata']): Promise<ParsedData> {
  const text = await readFileAsText(file);
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  
  const tables: number[][] = [];
  let headers: string[] | undefined;
  
  const firstLine = lines[0]?.split(/[,\t;]/).map(s => s.trim());
  const hasHeader = firstLine?.some(cell => isNaN(parseFloat(cell)));
  
  if (hasHeader && firstLine) {
    headers = firstLine.filter(cell => !isNaN(parseFloat(cell)) || cell.length > 0);
  }

  const startRow = hasHeader ? 1 : 0;
  
  for (let i = startRow; i < lines.length; i++) {
    const values = lines[i].split(/[,\t;]/).map(v => v.trim()).filter(v => v !== '');
    const rowNumbers = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
    
    if (rowNumbers.length > 0) {
      tables.push(rowNumbers);
    }
  }

  const allNumbers = tables.flat();
  
  return {
    numbers: allNumbers,
    tables,
    headers,
    sourceType: extToSource(file.name),
    metadata: {
      ...metadata,
      columns: Math.max(...tables.map(t => t.length), 0),
      rows: tables.length,
      extractionMethod: '文本解析（CSV/TXT）',
    }
  };
}

async function parseExcelFile(file: File, metadata: ParsedData['metadata']): Promise<ParsedData> {
  const buffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | null)[][];
  
  const tables: number[][] = [];
  let headers: string[] | undefined;

  if (jsonData.length > 0) {
    const headerRow = jsonData[0] as (string | number | null)[];
    const hasHeader = headerRow.some(cell => typeof cell === 'string' && isNaN(parseFloat(cell)));
    
    if (hasHeader) {
      headers = headerRow.map(cell => String(cell ?? '')).filter(h => h.length > 0);
    }

    const startRow = hasHeader ? 1 : 0;
    
    for (let i = startRow; i < jsonData.length; i++) {
      const row = jsonData[i] as (string | number | null)[];
      const rowNumbers = row
        .map(cell => typeof cell === 'number' ? cell : typeof cell === 'string' ? parseFloat(cell) : NaN)
        .filter(n => !isNaN(n));
      
      if (rowNumbers.length > 0) {
        tables.push(rowNumbers);
      }
    }
  }

  const allNumbers = tables.flat();

  return {
    numbers: allNumbers,
    tables,
    headers,
    sourceType: 'excel',
    metadata: {
      ...metadata,
      columns: Math.max(...tables.map(t => t.length), 0),
      rows: tables.length,
      extractionMethod: `Excel解析 (${workbook.SheetNames.length}个工作表，使用${firstSheetName})`,
    }
  };
}

async function parsePDFFile(file: File, metadata: ParsedData['metadata']): Promise<ParsedData> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const fullText: string[] = [];
  const tables: number[][] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText.push(pageText);

    const pageTables = extractTablesFromPDFPage(textContent);
    tables.push(...pageTables);
  }

  const allText = fullText.join('\n');
  const extractedNumbers = extractNumbersFromText(allText);

  if (tables.length === 0 && extractedNumbers.length === 0) {
    throw new Error('未能从PDF中提取到数字数据。可能原因：扫描版PDF（需要OCR）、加密PDF、或纯图片PDF');
  }

  return {
    numbers: extractedNumbers.length > 0 ? extractedNumbers : tables.flat(),
    tables: tables.length > 0 ? tables : [extractedNumbers],
    sourceType: 'pdf',
    metadata: {
      ...metadata,
      columns: Math.max(...tables.map(t => t.length), 1),
      rows: tables.length || 1,
      extractionMethod: `PDF文本提取 (${pdf.numPages}页)`,
    }
  };
}

function extractTablesFromPDFPage(textContent: any): number[][] {
  const tables: number[][] = [];
  
  const lines = textContent.items
    .map((item: any) => item.str)
    .filter((str: string) => str.trim().length > 0);

  let currentTable: number[][] = [];
  let currentRow: number[] = [];

  for (const line of lines) {
    const values = line.split(/[\s\t]+/).filter(v => v.trim() !== '');
    const numbersInLine = values
      .map(v => parseFloat(v.replace(/[^\d.\-]/g, '')))
      .filter(n => !isNaN(n) && isFinite(n));

    if (numbersInLine.length >= 2) {
      currentRow.push(...numbersInLine);
      
      if (currentRow.length >= 5) {
        currentTable.push([...currentRow]);
        currentRow = [];
      }
    } else if (currentRow.length > 0) {
      if (currentRow.length >= 2) {
        currentTable.push(currentRow);
      }
      currentRow = [];
    }
  }

  if (currentRow.length >= 2) {
    currentTable.push(currentRow);
  }

  if (currentTable.length > 0) {
    tables.push(...currentTable);
  }

  return tables;
}

function extractNumbersFromText(text: string): number[] {
  const numberPatterns = [
    /[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g,
    /(?:p\s*=\s*|P\s*=)\s*([<]?[\d.]+[>\s]*)/gi,
    /(?:n\s*=\s*)\s*(\d+)/gi,
  ];

  const numbers: Set<number> = new Set();
  
  for (const pattern of numberPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseFloat(match[1] || match[0]);
      if (!isNaN(num) && isFinite(num) && num !== 0) {
        numbers.add(num);
      }
    }
  }

  return Array.from(numbers);
}

async function parseImageFile(file: File, metadata: ParsedData['metadata']): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = async () => {
      try {
        const result = await Tesseract.recognize(img, 'eng+chi_sim', {
          logger: m => {},
        });

        const text = result.data.text;
        const lines = text.split('\n').filter(l => l.trim());
        
        const tables: number[][] = [];
        let currentRow: number[] = [];

        for (const line of lines) {
          const values = line.split(/[\s\t|]+/).filter(v => v.trim() !== '');
          const numbers = values
            .map(v => parseFloat(v.replace(/[^\d.\-]/g, '')))
            .filter(n => !isNaN(n) && isFinite(n));

          if (numbers.length >= 2) {
            if (currentRow.length > 0) {
              tables.push(currentRow);
            }
            currentRow = numbers;
          } else if (numbers.length === 1 && currentRow.length > 0) {
            currentRow.push(numbers[0]);
            
            if (currentRow.length >= 10) {
              tables.push(currentRow);
              currentRow = [];
            }
          } else if (currentRow.length >= 2) {
            tables.push(currentRow);
            currentRow = [];
          }
        }

        if (currentRow.length >= 2) {
          tables.push(currentRow);
        }

        const allNumbers = tables.flat();
        
        if (allNumbers.length === 0) {
          reject(new Error('OCR未能从图片中识别到有效数字。建议：使用更清晰的图片或手动输入数据'));
          return;
        }

        resolve({
          numbers: allNumbers,
          tables: tables.length > 0 ? tables : [allNumbers],
          sourceType: 'image',
          metadata: {
            ...metadata,
            columns: Math.max(...tables.map(t => t.length), 1),
            rows: tables.length || 1,
            extractionMethod: `OCR识别 (Tesseract.js, 置信度: ${(result.data.confidence.toFixed(1))}%)`,
          }
        });
      } catch (error) {
        reject(new Error(`OCR识别失败: ${error instanceof Error ? error.message : '未知错误'}`));
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };

    img.src = url;
  });
}

export function parseManualInput(input: string): ParsedData {
  const values = input.split(/[\s,\t;]+/).filter(v => v.trim() !== '');
  const numbers = values
    .map(v => parseFloat(v.trim()))
    .filter(n => !isNaN(n) && isFinite(n));

  if (numbers.length === 0) {
    throw new Error('未找到有效数字');
  }

  return {
    numbers,
    tables: [numbers],
    sourceType: 'manual',
    metadata: {
      fileName: '手动输入',
      fileSize: input.length,
      columns: 1,
      rows: numbers.length,
      extractionMethod: '手动输入解析',
    },
  };
}

function extToSource(fileName: string): ParsedData['sourceType'] {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['csv', 'tsv'].includes(ext)) return 'csv';
  if (ext === 'txt') return 'text';
  return 'csv';
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

export function exportToCSV(data: number[], filename: string = 'data.csv') {
  const csvContent = data.map(num => num.toString()).join('\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportToExcel(data: number[][], filename: string = 'data.xlsx') {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, filename);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
