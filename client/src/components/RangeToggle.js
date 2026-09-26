import React from 'react';

// 7-day / 30-day switch used above every history chart.
export const RANGES = [7, 30];

export default function RangeToggle({ value, onChange }) {
  return (
    <div className="seg" style={{ width: 'auto', minWidth: 120 }}>
      {RANGES.map(d => (
        <button key={d} type="button" className={value === d ? 'on' : ''} onClick={() => onChange(d)}>
          {d === 7 ? '7D' : '30D'}
        </button>
      ))}
    </div>
  );
}
