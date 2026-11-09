import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BarChart } from '../components/charts';
import { Big, Button, Card, CardHeader, Chip, Chips, ErrorText, Field, Label, ProgressBar, Row, Screen, Segmented } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { cache } from '../lib/cache';
import { useAuth } from '../lib/auth';
import { dailySeries, loggedAverage, rangeStart, today } from '../lib/date';
import { useColors } from '../lib/theme';
import type { WaterLog } from '../lib/types';
import { useLoad } from '../lib/useLoad';

const QUICK = [150, 250, 350, 500];

// Temporary ids for drinks shown before the server confirms them
let pendingSeq = 0;
const pendingId = () => `pending-${++pendingSeq}`;
const DRINKS = [
  { v: 'water', label: 'Water', icon: '💧' }, { v: 'green_tea', label: 'Green tea', icon: '🍵' },
  { v: 'coffee', label: 'Coffee', icon: '☕' }, { v: 'juice', label: 'Juice', icon: '🧃' }, { v: 'sports_drink', label: 'Sports', icon: '🥤' },
];

export default function Water() {
  const c = useColors();
  const { user } = useAuth();
  const date = today();
  const target = user?.waterTarget || 2500;
  const [type, setType] = useState('water');
  const [custom, setCustom] = useState('');
  const [range, setRange] = useState<7 | 30>(7);
  const [error, setError] = useState<string | null>(null);
  const { data, setData, reload, refreshing, refresh } = useLoad(`water:${date}:${range}`, async () => {
    const [log, hist] = await Promise.all([
      api.get<WaterLog>(`/water/${date}`),
      api.get<WaterLog[]>('/water/history/week', { params: { startDate: rangeStart(range), days: range } }),
    ]);
    return { log, series: dailySeries(hist, range, l => l.total) };
  });

  // Optimistic: the drink shows up on tap; the server confirms in the background
  const add = async (amount: number) => {
    setError(null);
    const entry = { _id: pendingId(), amount, type, time: new Date().toISOString() };
    setData(d => d && {
      log: { ...d.log, entries: [...d.log.entries, entry], total: d.log.total + amount },
      series: d.series.map(r => (r.date === date ? { ...r, value: r.value + amount } : r)),
    });
    try {
      await api.post(`/water/${date}/add`, { amount, type, time: entry.time });
      // Keep Home's saved copy in step, so it is right even when opened offline
      cache.patch<{ water: { total: number } }>(`home:${date}`, h => ({ ...h, water: { ...h.water, total: h.water.total + amount } }));
      reload(); // swaps in the real entry id
    } catch (err) {
      setError(errorMessage(err, 'Could not save that drink'));
      reload();
    }
  };
  const remove = async (id: string) => {
    const gone = data?.log.entries.find(e => e._id === id);
    if (!gone) return;
    setData(d => d && {
      log: { ...d.log, entries: d.log.entries.filter(e => e._id !== id), total: d.log.total - gone.amount },
      series: d.series.map(r => (r.date === date ? { ...r, value: Math.max(0, r.value - gone.amount) } : r)),
    });
    try { await api.del(`/water/${date}/entry/${id}`); } catch (err) { setError(errorMessage(err)); reload(); }
  };

  const total = data?.log.total || 0;
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Card tone="dark" style={{ gap: 10 }}>
        <Label tone="dark">today</Label>
        <Big value={(total / 1000).toFixed(2)} unit={`/ ${(target / 1000).toFixed(1)} L`} tone="dark" />
        <ProgressBar value={total} max={target} color={c.matcha} tone="dark" />
        <Text style={{ color: 'rgba(241,235,222,0.55)' }}>{total >= target ? 'Daily goal reached — nice.' : `${target - total} ml to reach your goal`}</Text>
      </Card>
      <ErrorText>{error}</ErrorText>
      <Card style={{ gap: 12 }}>
        <CardHeader title="Quick add" />
        <Chips>{DRINKS.map(d => <Chip key={d.v} label={`${d.icon} ${d.label}`} on={type === d.v} onPress={() => setType(d.v)} />)}</Chips>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {QUICK.map(a => <Button key={a} title={`${a}`} small variant="ghost" style={{ flex: 1, paddingHorizontal: 4 }} onPress={() => add(a)} accessibilityLabel={`Add ${a} millilitres`} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Field value={custom} onChangeText={t => setCustom(t.replace(/\D/g, ''))} keyboardType="number-pad" suffix="ml" placeholder="Custom" accessibilityLabel="Custom amount in millilitres" />
          <Button title="+ Add" disabled={!+custom} onPress={() => { add(+custom); setCustom(''); }} />
        </View>
      </Card>
      <Card>
        <CardHeader title={`${range}-day hydration`} right={<View style={{ width: 120 }}><Segmented value={range} onChange={setRange} options={[{ value: 7, label: '7D' }, { value: 30, label: '30D' }]} /></View>} />
        <Label>avg {Math.round(loggedAverage(data?.series || []))} ml</Label>
        <View style={{ height: 8 }} />
        <BarChart data={data?.series || []} target={target} todayDate={date} format={v => `${v} ml`} />
      </Card>
      <Card>
        <CardHeader title="Today's log" right={<Label>{data?.log.entries.length || 0} drinks</Label>} />
        {[...(data?.log.entries || [])].reverse().map(e => (
          <Row key={e._id} icon={DRINKS.find(d => d.v === e.type)?.icon || '💧'} title={`${e.amount} ml`}
            subtitle={new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            right={<Pressable hitSlop={10} accessibilityLabel="Remove drink" onPress={() => remove(e._id)}><Feather name="trash-2" size={16} color={c.ink50} /></Pressable>} />
        ))}
        {data && !data.log.entries.length ? <Text style={{ color: c.ink50 }}>Nothing logged yet today.</Text> : null}
      </Card>
    </Screen>
  );
}
