import React, { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from '../lib/theme';

// Lightweight SVG charts (no chart library): bars for daily metrics,
// a line for the weight trend, and a ring for calories.

const useWidth = () => {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  return { width, onLayout };
};

export function BarChart({ data, target, height = 140, todayDate, colorByTarget = true, format = (v: number) => String(v) }: {
  data: { date: string; label: string; value: number }[];
  target?: number;
  height?: number;
  todayDate?: string;
  colorByTarget?: boolean;
  format?: (v: number) => string;
}) {
  const c = useColors();
  const { width, onLayout } = useWidth();
  const [selected, setSelected] = useState<number | null>(null);
  const labelH = 16;
  const chartH = height - labelH;
  const max = Math.max(1, target || 0, ...data.map(d => d.value));
  const dense = data.length > 7;
  const slot = width / Math.max(1, data.length);
  const barW = Math.max(3, slot * (dense ? 0.7 : 0.55));
  const sel = selected != null ? data[selected] : null;

  return (
    <View onLayout={onLayout} accessibilityLabel={`Bar chart, ${data.length} days`}>
      <Text style={{ color: c.ink50, fontSize: 12, marginBottom: 6, minHeight: 16 }}>
        {sel ? `${sel.date}: ${format(sel.value)}` : 'Tap a bar for details'}
      </Text>
      {width > 0 && (
        <Svg width={width} height={height}>
          {data.map((d, i) => {
            const h = (d.value / max) * (chartH - 6);
            const x = i * slot + (slot - barW) / 2;
            const fill = d.date === todayDate ? c.coral : colorByTarget && target && d.value >= target ? c.matcha2 : c.ink15;
            return (
              <React.Fragment key={d.date}>
                <Rect x={i * slot} y={0} width={slot} height={chartH} fill="transparent" onPress={() => setSelected(i)} />
                <Rect x={x} y={chartH - h} width={barW} height={Math.max(h, d.value > 0 ? 2 : 0)} rx={Math.min(6, barW / 2)} fill={selected === i ? c.ink : fill} onPress={() => setSelected(i)} />
                {(!dense || i % 5 === 0 || i === data.length - 1) && (
                  <SvgText x={i * slot + slot / 2} y={height - 3} fontSize={10} fill={c.ink50} textAnchor="middle">{d.label}</SvgText>
                )}
              </React.Fragment>
            );
          })}
          {target ? (
            <Line x1={0} x2={width} y1={chartH - (target / max) * (chartH - 6)} y2={chartH - (target / max) * (chartH - 6)} stroke={c.ink50} strokeDasharray="4 4" strokeWidth={1} />
          ) : null}
        </Svg>
      )}
    </View>
  );
}

export function LineChart({ points, target, height = 200 }: {
  points: { date: string; label: string; value: number; trend: number }[];
  target?: number | null;
  height?: number;
}) {
  const c = useColors();
  const { width, onLayout } = useWidth();
  const padL = 34; const padB = 18; const padT = 8;
  if (points.length < 2) {
    return <Text style={{ color: c.ink50, fontSize: 13, textAlign: 'center', paddingVertical: 40 }}>Log at least two weigh-ins to see your trend.</Text>;
  }
  const values = points.map(p => p.value).concat(target ? [target] : []);
  const lo = Math.floor(Math.min(...values) - 1);
  const hi = Math.ceil(Math.max(...values) + 1);
  const w = Math.max(1, width - padL);
  const h = height - padB - padT;
  const x = (i: number) => padL + (i / (points.length - 1)) * (w - 6);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * h;
  const trendPath = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.trend).toFixed(1)}`).join(' ');
  const ticks = [lo, Math.round((lo + hi) / 2), hi];
  const labelEvery = Math.ceil(points.length / 4);

  return (
    <View onLayout={onLayout} accessibilityLabel={`Weight trend chart from ${points[0].value} to ${points[points.length - 1].value} kilograms`}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {ticks.map(t => (
            <React.Fragment key={t}>
              <Line x1={padL} x2={width} y1={y(t)} y2={y(t)} stroke={c.line} />
              <SvgText x={0} y={y(t) + 4} fontSize={10} fill={c.ink50}>{t}</SvgText>
            </React.Fragment>
          ))}
          {target ? <Line x1={padL} x2={width} y1={y(target)} y2={y(target)} stroke={c.matcha2} strokeDasharray="5 5" strokeWidth={1.5} /> : null}
          {points.map((p, i) => <Circle key={p.date} cx={x(i)} cy={y(p.value)} r={3} fill={c.ink50} />)}
          <Path d={trendPath} stroke={c.coral} strokeWidth={2.5} fill="none" />
          {points.map((p, i) => (i % labelEvery === 0 || i === points.length - 1) ? (
            <SvgText key={`l-${p.date}`} x={x(i)} y={height - 3} fontSize={10} fill={c.ink50}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>{p.label}</SvgText>
          ) : null)}
        </Svg>
      )}
    </View>
  );
}

export function Ring({ value, max, size = 150, stroke = 14, children, trackColor, color }: {
  value: number; max: number; size?: number; stroke?: number; children?: React.ReactNode; trackColor?: string; color?: string;
}) {
  const c = useColors();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor || c.ink15} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color || c.ink} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" />
      </Svg>
      {children}
    </View>
  );
}
