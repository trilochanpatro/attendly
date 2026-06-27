import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useTheme } from '../App';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function DailyTrendChart({ data = [] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Present',
        data: data.map(d => d.present),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Absent',
        data: data.map(d => d.absent),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Late',
        data: data.map(d => d.late),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.3,
        fill: true,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDark ? '#d1d5db' : '#0f172a',
          font: { family: 'Outfit' }
        }
      },
      tooltip: {
        titleFont: { family: 'Outfit' },
        bodyFont: { family: 'Outfit' }
      }
    },
    scales: {
      x: {
        grid: {
          color: isDark ? '#1f2937' : '#e2e8f0'
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#475569',
          font: { family: 'Outfit', size: 10 }
        }
      },
      y: {
        grid: {
          color: isDark ? '#1f2937' : '#e2e8f0'
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#475569',
          font: { family: 'Outfit' }
        }
      }
    }
  };

  return (
    <div style={{ position: 'relative', height: '260px', width: '100%' }}>
      {data.length === 0 ? (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          No historical logs available
        </div>
      ) : (
        <Line data={chartData} options={options} />
      )}
    </div>
  );
}

export function SubjectBarChart({ data = [] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = {
    labels: data.map(d => d.code),
    datasets: [
      {
        label: 'Attendance %',
        data: data.map(d => d.rate),
        backgroundColor: 'rgba(128, 0, 32, 0.75)',
        borderColor: '#800020',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        titleFont: { family: 'Outfit' },
        bodyFont: { family: 'Outfit' },
        callbacks: {
          label: (context) => `Avg Attendance: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: isDark ? '#1f2937' : '#e2e8f0'
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#475569',
          font: { family: 'Outfit' }
        }
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: isDark ? '#1f2937' : '#e2e8f0'
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#475569',
          font: { family: 'Outfit' },
          callback: (value) => `${value}%`
        }
      }
    }
  };

  return (
    <div style={{ position: 'relative', height: '260px', width: '100%' }}>
      {data.length === 0 ? (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          No subject data conducts
        </div>
      ) : (
        <Bar data={chartData} options={options} />
      )}
    </div>
  );
}

export function SemesterTrendChart({ data = [] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = {
    labels: data.map(d => d.name),
    datasets: [
      {
        label: 'Average Attendance',
        data: data.map(d => d.rate),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3b82f6',
        borderWidth: 2,
        pointBackgroundColor: '#3b82f6',
        tension: 0.2,
        fill: true,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        titleFont: { family: 'Outfit' },
        bodyFont: { family: 'Outfit' },
        callbacks: {
          label: (context) => `Avg: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: isDark ? '#1f2937' : '#e2e8f0'
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#475569',
          font: { family: 'Outfit' }
        }
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: isDark ? '#1f2937' : '#e2e8f0'
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#475569',
          font: { family: 'Outfit' },
          callback: (value) => `${value}%`
        }
      }
    }
  };

  return (
    <div style={{ position: 'relative', height: '260px', width: '100%' }}>
      {data.length === 0 ? (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          No semester logs conducts
        </div>
      ) : (
        <Line data={chartData} options={options} />
      )}
    </div>
  );
}
