import React from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput,
  View, type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, useColors } from '../lib/theme';

// Small UI kit matching the web design: cream cards, ink text, mono labels.

export function Screen({ children, refreshing, onRefresh, title, subtitle, right }: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: title ? insets.top + 12 : 16, paddingBottom: 32, gap: 12 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={c.ink50} /> : undefined}
    >
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={[s.h1, { color: c.ink }]} accessibilityRole="header">{title}</Text>
            {subtitle ? <Text style={[s.mono, { color: c.ink50, marginTop: 2 }]}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Card({ children, tone = 'paper', style }: { children: React.ReactNode; tone?: 'paper' | 'dark' | 'lime'; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const bg = tone === 'dark' ? c.obsidian : tone === 'lime' ? c.matcha : c.card;
  return <View style={[s.card, { backgroundColor: bg, borderColor: tone === 'paper' ? c.line : bg }, style]}>{children}</View>;
}

export function CardHeader({ title, right, tone }: { title: string; right?: React.ReactNode; tone?: 'dark' | 'lime' }) {
  const c = useColors();
  const color = tone === 'dark' ? c.onDark : tone === 'lime' ? '#0e0e10' : c.ink;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
      <Text style={[s.h3, { color }]}>{title}</Text>
      {right}
    </View>
  );
}

export function Label({ children, tone }: { children: React.ReactNode; tone?: 'dark' | 'lime' }) {
  const c = useColors();
  const color = tone === 'dark' ? 'rgba(241,235,222,0.55)' : tone === 'lime' ? 'rgba(14,14,16,0.6)' : c.ink50;
  return <Text style={[s.label, { color }]}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: StyleProp<any> }) {
  const c = useColors();
  return <Text style={[{ fontSize: 14, color: muted ? c.ink50 : c.ink, lineHeight: 20 }, style]}>{children}</Text>;
}

export function Big({ value, unit, tone }: { value: React.ReactNode; unit?: string; tone?: 'dark' | 'lime' }) {
  const c = useColors();
  const color = tone === 'dark' ? c.onDark : tone === 'lime' ? '#0e0e10' : c.ink;
  return (
    <Text style={[s.big, { color }]}>
      {value}
      {unit ? <Text style={{ fontSize: 16, fontWeight: '600', color: tone ? color : c.ink50 }}> {unit}</Text> : null}
    </Text>
  );
}

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'lime' | 'danger';
  small?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({ title, onPress, variant = 'primary', small, disabled, loading, style, accessibilityLabel }: ButtonProps) {
  const c = useColors();
  const bg = variant === 'primary' ? c.ink : variant === 'lime' ? c.matcha : 'transparent';
  const fg = variant === 'primary' ? c.bg : variant === 'lime' ? '#0e0e10' : variant === 'danger' ? c.coral : c.ink;
  const border = variant === 'ghost' ? c.ink15 : variant === 'danger' ? c.coral : bg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSm,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, suffix, ...props }: TextInputProps & { label?: string; suffix?: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      {label ? <Text style={[s.label, { color: c.ink50, marginBottom: 6 }]}>{label}</Text> : null}
      <View style={[s.input, { backgroundColor: c.bone, borderColor: c.line }]}>
        <TextInput
          placeholderTextColor={c.ink50}
          accessibilityLabel={props.accessibilityLabel || label}
          {...props}
          style={[{ flex: 1, color: c.ink, fontSize: 16, paddingVertical: 12 }, props.style]}
        />
        {suffix ? <Text style={[s.mono, { color: c.ink50 }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(on) }}
      onPress={onPress}
      style={[s.chip, { backgroundColor: on ? c.ink : 'transparent', borderColor: on ? c.ink : c.ink15 }]}
    >
      <Text style={{ color: on ? c.bg : c.ink, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Chips({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

export function Segmented<T extends string | number>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[s.seg, { backgroundColor: c.bone, borderColor: c.line }]} accessibilityRole="tablist">
      {options.map(o => (
        <Pressable
          key={String(o.value)}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.value === value }}
          onPress={() => onChange(o.value)}
          style={[s.segBtn, o.value === value && { backgroundColor: c.ink }]}
        >
          <Text style={{ color: o.value === value ? c.bg : c.ink50, fontWeight: '700', fontSize: 13 }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ProgressBar({ value, max, color, tone }: { value: number; max: number; color?: string; tone?: 'dark' | 'lime' }) {
  const c = useColors();
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const track = tone === 'dark' ? 'rgba(241,235,222,0.12)' : tone === 'lime' ? 'rgba(14,14,16,0.14)' : c.ink15;
  return (
    <View style={{ height: 8, borderRadius: 6, backgroundColor: track, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 6, backgroundColor: color || c.coral }} />
    </View>
  );
}

export function Row({ title, subtitle, right, onPress, icon }: { title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; icon?: string }) {
  const c = useColors();
  const content = (
    <View style={[s.row, { borderTopColor: c.line }]}>
      {icon ? <View style={[s.rowIcon, { backgroundColor: c.bone }]}><Text style={{ fontSize: 16 }}>{icon}</Text></View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[s.mono, { color: c.ink50, marginTop: 2 }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{content}</Pressable> : content;
}

export function Toggle({ value, onValueChange, label, disabled }: { value: boolean; onValueChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const c = useColors();
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ true: c.matcha2, false: c.ink15 }}
      thumbColor="#ffffff"
    />
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
      <Text style={[s.h3, { color: c.ink, textAlign: 'center' }]}>{title}</Text>
      {text ? <Text style={{ color: c.ink50, textAlign: 'center', fontSize: 13, maxWidth: 300 }}>{text}</Text> : null}
      {action ? <View style={{ marginTop: 10 }}>{action}</View> : null}
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  const c = useColors();
  if (!children) return null;
  return (
    <View style={{ borderRadius: radius.sm, padding: 10, backgroundColor: 'rgba(255,91,61,0.12)' }} accessibilityRole="alert">
      <Text style={{ color: c.coral, fontSize: 13, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

export function Loading() {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
      <ActivityIndicator color={c.ink} size="large" />
    </View>
  );
}

export const s = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  h3: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  big: { fontSize: 40, fontWeight: '800', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' },
  mono: { fontSize: 12, fontVariant: ['tabular-nums'] },
  card: { borderRadius: radius.lg, padding: 16, borderWidth: 1 },
  btn: { minHeight: 48, borderRadius: radius.pill, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  btnSm: { minHeight: 38, paddingHorizontal: 14 },
  input: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5 },
  seg: { flexDirection: 'row', borderRadius: radius.pill, padding: 4, borderWidth: 1, gap: 4 },
  segBtn: { flex: 1, minHeight: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
