import { useState } from 'react';
import { Text, View } from 'react-native';
import { BarChart } from '../components/charts';
import { Big, Button, Card, CardHeader, Chip, Chips, ErrorText, Field, Label, Screen, Segmented } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dailySeries, loggedAverage, rangeStart, today } from '../lib/date';
import type { SleepLog } from '../lib/types';
import { useLoad } from '../lib/useLoad';

const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

// Hours between a bedtime (yesterday evening, or after midnight) and a wake time today
const hoursBetween = (bed: string, wake: string) => {
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
};

export default function Sleep() {
  const { user } = useAuth();
  const date = today();
  const target = user?.sleepTarget || 8;
  const [bed, setBed] = useState('23:00');
  const [wake, setWake] = useState('07:00');
  const [quality, setQuality] = useState(4);
  const [range, setRange] = useState<7 | 30>(7);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data, reload, refreshing, refresh } = useLoad(`sleep:${date}:${range}`, async () => {
    const [log, hist] = await Promise.all([
      api.get<SleepLog | null>(`/sleep/${date}`),
      api.get<SleepLog[]>('/sleep/history/week', { params: { startDate: rangeStart(range), days: range } }),
    ]);
    return { log, series: dailySeries(hist, range, l => l.duration) };
  });

  const valid = TIME.test(bed) && TIME.test(wake);
  const duration = valid ? hoursBetween(bed, wake) : 0;

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const wakeDate = new Date(); const [wh, wm] = wake.split(':').map(Number); wakeDate.setHours(wh, wm, 0, 0);
      const bedDate = new Date(wakeDate.getTime() - duration * 3.6e6);
      await api.post('/sleep', { date, duration, quality, bedtime: bedDate.toISOString(), wakeTime: wakeDate.toISOString() });
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Card tone="dark" style={{ gap: 6 }}>
        <Label tone="dark">last night</Label>
        <Big value={data?.log?.duration ?? '—'} unit={`h of ${target}`} tone="dark" />
        <Text style={{ color: 'rgba(241,235,222,0.55)' }}>
          {data?.log ? `${'★'.repeat(data.log.quality || 0)}${data.log.source && data.log.source !== 'manual' ? ' · synced from your phone' : ''}` : 'Not logged yet'}
        </Text>
      </Card>
      <Card style={{ gap: 12 }}>
        <CardHeader title={data?.log ? 'Update last night' : 'Log last night'} right={valid ? <Label>{duration} h</Label> : undefined} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field label="Bedtime" value={bed} onChangeText={setBed} placeholder="23:00" keyboardType="numbers-and-punctuation" />
          <Field label="Woke up" value={wake} onChangeText={setWake} placeholder="07:00" keyboardType="numbers-and-punctuation" />
        </View>
        <Label>Quality</Label>
        <Chips>{[1, 2, 3, 4, 5].map(q => <Chip key={q} label={'★'.repeat(q)} on={quality === q} onPress={() => setQuality(q)} />)}</Chips>
        <ErrorText>{error}</ErrorText>
        <Button title="Save sleep" onPress={save} loading={saving} disabled={!valid} />
      </Card>
      <Card>
        <CardHeader title={`${range}-night sleep`} right={<View style={{ width: 120 }}><Segmented value={range} onChange={setRange} options={[{ value: 7, label: '7D' }, { value: 30, label: '30D' }]} /></View>} />
        <Label>avg {loggedAverage(data?.series || []).toFixed(1)} h · target {target} h</Label>
        <View style={{ height: 8 }} />
        <BarChart data={data?.series || []} target={target} todayDate={date} format={v => `${v} h`} />
      </Card>
    </Screen>
  );
}
