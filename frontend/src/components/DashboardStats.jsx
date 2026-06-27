import React from 'react';

export default function StatCard({ label, value, icon, color }) {
  return (
    <div class="stat-card">
      <div class={`stat-icon ${color}`}>
        {icon}
      </div>
      <div class="stat-details">
        <span class="stat-value">{value}</span>
        <span class="stat-label">{label}</span>
      </div>
    </div>
  );
}
