import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Chip, Chips, ErrorText, Field, Row, Screen, Toggle } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useColors } from '../lib/theme';
import type { Reminders } from '../lib/types';
import { useLoad } from '../lib/useLoad';
import { registerForReminders } from '../notifications/push';

type Settings = { reminders: Reminders; timezone: string; devices: number };
type Kind = 'workout' | 'meals' | 'sleep' | 'weighIn';

const ROWS: { kind: Kind; icon: string; title: string; hint: string }[] = [
  { kind: 'workout', icon: '🏋️', title: 'Workout', hint: 'skipped once today is logged' },
  { kind: 'meals', icon: '🍽️', title: 'Food log', hint: 'if under half your calories are logged' },
  { kind: 'sleep', icon: '🌙', title: 'Bedtime', hint: 'wind-down nudge' },
  { kind: 'weighIn', icon: '⚖️', title: 'Weigh-in', hint: 'skipped if you already weighed in' },
];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// Time input that only saves complete HH:mm values
function TimeField({ value, onSave, label }: { value: string; onSave: (v: string) => void; label: string }) {
  const [text, setText] = useState(value);
  return (
    <View style={{ width: 92 }}>
      <Field value={text} onChangeText={setText} onEndEditing={() => (TIME.test(text) ? onSave(text) : setText(value))}
        keyboardType="numbers-and-punctuation" accessibilityLabel={label} maxLength={5} />
    </View>
  );
}

export default function RemindersScreen() {
  const c = useColors();
  const { updateUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { data, setData, refreshing, refresh } = useLoad(() => api.get<Settings>('/reminders/settings'));

  const save = async (patch: Record<string, unknown>) => {
    setMsg(null);
    try {
      const res = await api.put<{ reminders: Reminders; timezone: string }>('/reminders/settings', patch);
      setData(d => (d ? { ...d, ...res } : d));
      updateUser({ reminders: res.reminders });
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };

  const toggleAll = async (on: boolean) => {
    setBusy(true);
    setMsg(null);
    try {
      if (on) {
        const push = await registerForReminders();
        if (!push.ok) setMsg(`${push.reason} Reminders are saved and will reach any other device you've turned on.`);
      }
      await save({ enabled: on, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      refresh();
    } catch (err) {
      setMsg(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    try {
      const r = await api.post<{ delivered: number; devices: number }>('/reminders/test');
      setMsg(`Test sent to ${r.delivered} of ${r.devices} device(s).`);
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };

  if (!data) return <Screen refreshing={refreshing} onRefresh={refresh}><Text style={{ color: c.ink50 }}>Loading…</Text></Screen>;
  const r = data.reminders;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Card>
        <Row title="Smart reminders" subtitle={`${data.devices} device(s) · ${data.timezone}`}
          right={<Toggle value={r.enabled} onValueChange={toggleAll} disabled={busy} label="Reminders on or off" />} />
        <Text style={{ color: c.ink50, fontSize: 13 }}>{"FitPulse only nudges you when it helps: no water reminder if you're on pace, no workout reminder once you've logged."}</Text>
      </Card>
      <ErrorText>{msg}</ErrorText>

      <View style={{ opacity: r.enabled ? 1 : 0.45 }} pointerEvents={r.enabled ? 'auto' : 'none'}>
        <Card style={{ gap: 4 }}>
          <Row icon="💧" title="Hydration" subtitle="only when you're behind pace"
            right={<Toggle value={r.water.on} onValueChange={on => save({ water: { on } })} label="Hydration reminders" />} />
          <Chips>{[1, 2, 3, 4].map(h => <Chip key={h} label={`every ${h}h`} on={r.water.everyHours === h} onPress={() => save({ water: { everyHours: h } })} />)}</Chips>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Text style={{ color: c.ink50 }}>from</Text>
            <TimeField value={r.water.from} onSave={v => save({ water: { from: v } })} label="Water reminders from" />
            <Text style={{ color: c.ink50 }}>to</Text>
            <TimeField value={r.water.to} onSave={v => save({ water: { to: v } })} label="Water reminders until" />
          </View>
          {ROWS.map(row => (
            <Row key={row.kind} icon={row.icon} title={row.title} subtitle={row.hint}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TimeField value={r[row.kind].time} onSave={v => save({ [row.kind]: { time: v } })} label={`${row.title} time`} />
                  <Toggle value={r[row.kind].on} onValueChange={on => save({ [row.kind]: { on } })} label={`${row.title} reminder`} />
                </View>
              } />
          ))}
        </Card>
      </View>
      {r.enabled && data.devices > 0 && <Button title="Send a test notification" variant="ghost" onPress={test} />}
    </Screen>
  );
}
