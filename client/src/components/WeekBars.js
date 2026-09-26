import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { COLORS } from '../theme';

// 7- or 30-day bar chart in the design's style: muted ink bars, matcha when the
// target was met, and today's column in coral.
//   data        array of rows, e.g. [{ day: 'Mon', steps: 8000 }]
//   xKey/yKey   which fields hold the label and the value
//   target      optional dashed reference line (and matcha colouring)
//   isToday     (row) => boolean, marks the current column
//   label       tooltip series name; format: (value) => tooltip text
export default function WeekBars({ data, xKey, yKey, label, target, isToday, format = v => v, height = 150, colorByTarget = true }) {
  const fillFor = (row) => {
    if (isToday && isToday(row)) return COLORS.coral;
    if (colorByTarget && target && row[yKey] >= target) return COLORS.matcha2;
    return COLORS.ink15;
  };

  // Month view: thinner gaps and only every 5th label so the axis stays readable
  const dense = data.length > 7;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barCategoryGap={dense ? '18%' : '28%'} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey={xKey} interval={dense ? 4 : 0} tick={{ fontSize: 10, fill: COLORS.ink50, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
        <YAxis hide domain={[0, dataMax => Math.max(dataMax, target || 0)]} />
        <Tooltip
          cursor={{ fill: COLORS.line }}
          contentStyle={{ background: COLORS.paper, border: `1px solid ${COLORS.line}`, borderRadius: 12, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
          formatter={v => [format(v), label]}
        />
        {target ? <ReferenceLine y={target} stroke={COLORS.ink} strokeDasharray="4 4" strokeOpacity={0.35} /> : null}
        {/* Animation off: Recharts 2.x mis-positions bars when data loads after the first (empty) render */}
        <Bar dataKey={yKey} radius={dense ? [4, 4, 0, 0] : [7, 7, 0, 0]} isAnimationActive={false}>
          {data.map((row, i) => <Cell key={i} fill={fillFor(row)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
