import { useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ChartViewerProps {
  labels: string[];
  values: number[];
  title?: string;
  className?: string;
}

export default function ChartViewer({ labels, values, title, className }: ChartViewerProps) {
  const chartRef = useRef<ChartJS<'bar'>>(null);

  const data = {
    labels,
    datasets: [
      {
        label: title || 'Value',
        data: values,
        backgroundColor: 'rgba(22, 93, 255, 0.6)',
        borderColor: 'rgba(22, 93, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: !!title,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className={className}>
      <Bar data={data} options={options} ref={chartRef} />
    </div>
  );
}
