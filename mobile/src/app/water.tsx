import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BarChart } from '../components/charts';
import { Big, Button, Card, CardHeader, Chip, Chips, Field, Label, ProgressBar, Row, Screen, Segmented } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dailySeries, loggedAverage, rangeStart, today } from '../lib/date';
import { useColors } from '../lib/theme';
import type { WaterLog } from '../lib/types';
import { useLoad } from '../lib/useLoad';

const QUICK = [150, 250, 350, 500];
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
  const [adding, setAdding] = useState(false);
  const { data, reload, refreshing, refresh } = useLoad(async () => {
    const [log, hist] = await Promise.all([
      api.get<WaterLog>(`/water/${date}`),
      api.get<WaterLog[]>('/water/history/week', { params: { startDate: rangeStart(range), days: range } }),
    ]);
    return { log, series: dailySeries(hist, range, l => l.total) };
  }, [date, range]);

  const add = async (amount: number) => {
    setAdding(true);
    try {
      await api.post(`/water/${date}/add`, { amount, type, time: new Date().toISOString() });
      await reload();
    } finally {
      setAdding(false);
    }
  };
  const remove = async (id: string) => { await api.del(`/water/${date}/entry/${id}`); reload(); };

  const total = data?.log.total || 0;
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Card tone="dark" style={{ gap: 10 }}>
        <Label tone="dark">today</Label>
        <Big value={(total / 1000).toFixed(2)} unit={`/ ${(target / 1000).toFixed(1)} L`} tone="dark" />
        <ProgressBar value={total} max={target} color={c.matcha} tone="dark" />
        <Text style={{ color: 'rgba(241,235,222,0.55)' }}>{total >= target ? 'Daily goal reached — nice.' : `${target - total} ml to reach your goal`}</Text>
      </Card>
      <Card style={{ gap: 12 }}>
        <CardHeader title="Quick add" />
        <Chips>{DRINKS.map(d => <Chip key={d.v} label={`${d.icon} ${d.label}`} on={type === d.v} onPress={() => setType(d.v)} />)}</Chips>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {QUICK.map(a => <Button key={a} title={`${a}`} small variant="ghost" style={{ flex: 1, paddingHorizontal: 4 }} disabled={adding} onPress={() => add(a)} accessibilityLabel={`Add ${a} millilitres`} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Field value={custom} onChangeText={t => setCustom(t.replace(/\D/g, ''))} keyboardType="number-pad" suffix="ml" placeholder="Custom" accessibilityLabel="Custom amount in millilitres" />
          <Button title="+ Add" disabled={!+custom || adding} onPress={() => { add(+custom); setCustom(''); }} />
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
