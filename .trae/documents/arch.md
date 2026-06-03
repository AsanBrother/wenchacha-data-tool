
## 1. Architecture Design

```mermaid
graph TB
    subgraph "前端层 (Frontend)"
        A[React 应用]
        B[数据处理模块]
        C[统计检验库]
        D[数据可视化]
        E[i18n 国际化]
    end
    
    subgraph "浏览器存储 (Local)"
        F[LocalStorage]
        G[File API]
    end
    
    subgraph "外部库 (External Libraries)"
        H[jStat - 统计计算]
        I[Chart.js - 可视化]
        J[SheetJS - Excel处理]
    end
    
    A --&gt; B
    A --&gt; D
    A --&gt; E
    B --&gt; C
    B --&gt; H
    D --&gt; I
    B --&gt; J
    A --&gt; F
    A --&gt; G
```

**设计说明：**
- **纯前端方案**：所有数据处理都在用户浏览器中完成，保护隐私，无需后端服务器
- **核心优势**：数据不离开用户设备，零服务器成本，即时响应
- **适用场景**：当前功能完全可以在前端实现，无需后端支持

## 2. Technology Description

- **Frontend**: React@18 + TypeScript + TailwindCSS@3 + Vite
- **初始化工具**: vite-init
- **Backend**: 无（纯前端方案）
- **数据库**: 无（使用 LocalStorage 存储临时配置）
- **统计计算**: jStat.js 提供专业的统计检验功能
- **数据可视化**: Chart.js + react-chartjs-2
- **文件处理**: SheetJS (xlsx) 处理 Excel/CSV 文件
- **国际化**: react-i18next 支持中英文切换
- **路由**: React Router DOM
- **状态管理**: Zustand

**为什么选择纯前端方案？**
1. **隐私保护**：用户数据不需要上传到服务器
2. **成本效益**：无需维护服务器和数据库
3. **即时响应**：没有网络延迟，用户体验更好
4. **技术可行性**：现代浏览器和 JavaScript 库足够强大，能完成所有统计计算

## 3. Route Definitions

| Route | Purpose |
|-------|---------|
| / | 首页 - 功能导航和介绍 |
| /detection | 数据检测页面 |
| /repair | 数据修复页面 |
| /generator | 数据生成页面 |

## 4. Core Data Structures

```typescript
// 数据检测结果
interface DetectionResult {
  testName: string;
  passed: boolean;
  pValue?: number;
  details: string;
  suspiciousIndices?: number[];
}

// 统计数据
interface StatsData {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  count: number;
}

// 数据生成配置
interface GenerationConfig {
  distribution: 'normal' | 'uniform' | 'exponential' | 'binomial';
  sampleSize: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  rate?: number;
  trials?: number;
  probability?: number;
  decimalPlaces: number;
}

// 应用状态
interface AppState {
  language: 'zh' | 'en';
  currentData: number[] | null;
  detectionResults: DetectionResult[];
}
```

## 5. File Structure

```
/workspace
├── src/
│   ├── components/
│   │   ├── Navbar.tsx          # 导航栏组件
│   │   ├── DataUploader.tsx    # 数据上传组件
│   │   ├── ChartViewer.tsx     # 图表展示组件
│   │   └── DataTable.tsx       # 数据表格组件
│   ├── pages/
│   │   ├── Home.tsx            # 首页
│   │   ├── Detection.tsx       # 数据检测页
│   │   ├── Repair.tsx          # 数据修复页
│   │   └── Generator.tsx       # 数据生成页
│   ├── utils/
│   │   ├── statistics.ts       # 统计检验算法
│   │   ├── dataRepair.ts       # 数据修复算法
│   │   ├── dataGenerator.ts    # 数据生成算法
│   │   └── fileHandler.ts      # 文件处理工具
│   ├── i18n/
│   │   ├── index.ts            # i18n 配置
│   │   ├── zh.ts               # 中文翻译
│   │   └── en.ts               # 英文翻译
│   ├── store/
│   │   └── useStore.ts         # Zustand 状态管理
│   ├── App.tsx                 # 主应用组件
│   ├── main.tsx                # 入口文件
│   └── index.css               # 全局样式
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 6. Key Algorithm Modules

### 6.1 统计检验模块 (statistics.ts)

```typescript
// 末位数字分布检验
export function lastDigitTest(data: number[]): DetectionResult;

// 卡方拟合优度检验
export function chiSquareTest(data: number[], expectedDistribution?: number[]): DetectionResult;

// Benford定律检验
export function benfordTest(data: number[]): DetectionResult;

// 重复数据检测
export function duplicateDetection(data: number[]): DetectionResult;

// 等差数列检测
export function arithmeticProgressionTest(data: number[]): DetectionResult;
```

### 6.2 数据修复模块 (dataRepair.ts)

```typescript
// 保持统计特征的数据修复
export function repairData(
  data: number[], 
  suspiciousIndices: number[],
  targetStats?: StatsData
): { repairedData: number[]; statsBefore: StatsData; statsAfter: StatsData };
```

### 6.3 数据生成模块 (dataGenerator.ts)

```typescript
// 生成各种分布的数据
export function generateData(config: GenerationConfig): number[];

// 计算统计量
export function calculateStats(data: number[]): StatsData;
```

## 7. 扩展性考虑

虽然当前采用纯前端方案，但架构设计支持未来扩展：

1. **后端添加路径**：如需添加用户系统、云端存储等功能，可轻松添加 Express 后端
2. **WebWorker**：对于大规模数据计算，可使用 WebWorker 避免阻塞主线程
3. **WebAssembly**：极端性能需求时，可使用 WASM 优化计算密集型任务

