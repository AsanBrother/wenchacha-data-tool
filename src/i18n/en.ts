
export default {
  nav: {
    home: 'Home',
    detection: 'Detection',
    repair: 'Repair',
    generator: 'Generator',
    language: '中文',
  },
  home: {
    title: 'Academic Data Checker',
    subtitle: 'Detect, repair, and generate research data for academic studies',
    features: {
      detection: {
        title: 'Data Detection',
        description: 'Identify potentially problematic data using multiple statistical tests',
      },
      repair: {
        title: 'Data Repair',
        description: 'Automatically fix suspicious data while preserving original statistics',
      },
      generator: {
        title: 'Data Generator',
        description: 'Generate realistic simulated data based on specified distributions',
      },
    },
    cta: 'Get Started',
  },
  detection: {
    title: 'Data Detection',
    upload: {
      title: 'Upload Data',
      dragDrop: 'Drag and drop files here, or',
      browse: 'click to browse',
      types: 'Supports CSV, Excel, TXT formats',
      manualInput: 'Or manually input data',
      manualPlaceholder: 'Enter data separated by commas, spaces, or newlines',
    },
    tests: {
      lastDigit: 'Last Digit Test',
      chiSquare: 'Chi-Square Test',
      benford: 'Benford\'s Law Test',
      duplicate: 'Duplicate Data Test',
      arithmetic: 'Arithmetic Sequence Test',
    },
    run: 'Run Detection',
    results: {
      title: 'Results',
      passed: 'Passed',
      failed: 'Warning',
      details: 'Details',
      download: 'Download Report',
    },
    table: {
      index: 'Index',
      value: 'Value',
      suspicious: 'Suspicious',
    },
  },
  repair: {
    title: 'Data Repair',
    upload: {
      title: 'Upload Data to Repair',
    },
    options: {
      title: 'Repair Options',
      intensity: 'Repair Intensity',
    },
    preview: {
      before: 'Before Repair',
      after: 'After Repair',
      stats: {
        title: 'Statistics Comparison',
        mean: 'Mean',
        median: 'Median',
        std: 'Std Dev',
        min: 'Min',
        max: 'Max',
      },
    },
    actions: {
      repair: 'Execute Repair',
      download: 'Download Repaired Data',
    },
  },
  generator: {
    title: 'Data Generator',
    config: {
      distribution: 'Distribution',
      normal: 'Normal Distribution',
      uniform: 'Uniform Distribution',
      exponential: 'Exponential Distribution',
      binomial: 'Binomial Distribution',
      sampleSize: 'Sample Size',
      mean: 'Mean',
      std: 'Std Dev',
      min: 'Min Value',
      max: 'Max Value',
      rate: 'Rate',
      trials: 'Trials',
      probability: 'Probability',
      decimalPlaces: 'Decimal Places',
    },
    actions: {
      generate: 'Generate Data',
      regenerate: 'Regenerate',
      download: 'Download Data',
    },
    preview: {
      title: 'Data Preview',
      stats: 'Statistics',
    },
  },
  common: {
    loading: 'Loading...',
    error: 'Error',
    noData: 'No data available',
    back: 'Back',
    next: 'Next',
    save: 'Save',
    cancel: 'Cancel',
  },
};

