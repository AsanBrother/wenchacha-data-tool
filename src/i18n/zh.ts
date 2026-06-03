
export default {
  nav: {
    home: '首页',
    detection: '数据检测',
    repair: '数据修复',
    generator: '数据生成',
    language: 'English',
  },
  home: {
    title: '论文数据检验工具',
    subtitle: '帮助您检测、修复和生成学术研究数据',
    features: {
      detection: {
        title: '数据检测',
        description: '使用多种统计检验方法，识别可能存在问题的数据',
      },
      repair: {
        title: '数据修复',
        description: '自动修复可疑数据，保持原有的统计特征不变',
      },
      generator: {
        title: '数据生成',
        description: '根据指定分布生成逼真的仿真数据用于学习',
      },
    },
    cta: '开始使用',
  },
  detection: {
    title: '数据检测',
    upload: {
      title: '上传数据',
      dragDrop: '拖拽文件到这里，或',
      browse: '点击浏览',
      types: '支持 CSV, Excel, TXT 格式',
      manualInput: '或手动输入数据',
      manualPlaceholder: '输入数据，用逗号、空格或换行分隔',
    },
    tests: {
      lastDigit: '末位数字检验',
      chiSquare: '卡方分布检验',
      benford: 'Benford定律检验',
      duplicate: '重复数据检验',
      arithmetic: '等差数列检验',
    },
    run: '运行检测',
    results: {
      title: '检测结果',
      passed: '通过',
      failed: '异常',
      details: '详细信息',
      download: '下载报告',
    },
    table: {
      index: '序号',
      value: '数值',
      suspicious: '可疑',
    },
  },
  repair: {
    title: '数据修复',
    upload: {
      title: '上传待修复数据',
    },
    options: {
      title: '修复选项',
      intensity: '修复强度',
    },
    preview: {
      before: '修复前',
      after: '修复后',
      stats: {
        title: '统计对比',
        mean: '均值',
        median: '中位数',
        std: '标准差',
        min: '最小值',
        max: '最大值',
      },
    },
    actions: {
      repair: '执行修复',
      download: '下载修复后的数据',
    },
  },
  generator: {
    title: '数据生成',
    config: {
      distribution: '分布类型',
      normal: '正态分布',
      uniform: '均匀分布',
      exponential: '指数分布',
      binomial: '二项分布',
      sampleSize: '样本数量',
      mean: '均值',
      std: '标准差',
      min: '最小值',
      max: '最大值',
      rate: '率参数',
      trials: '试验次数',
      probability: '概率',
      decimalPlaces: '小数位数',
    },
    actions: {
      generate: '生成数据',
      regenerate: '重新生成',
      download: '下载数据',
    },
    preview: {
      title: '数据预览',
      stats: '统计信息',
    },
  },
  common: {
    loading: '加载中...',
    error: '出错了',
    noData: '暂无数据',
    back: '返回',
    next: '下一步',
    save: '保存',
    cancel: '取消',
  },
};

