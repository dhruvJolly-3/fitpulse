import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { BarChart, Ring } from '../components/charts';
import { Button, Card, CardHeader, ErrorText, Field, Label, Screen, Segmented } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dailySeries, loggedAverage, rangeStart, timeAgo, today } from '../lib/date';
import { useColors } from '../lib/theme';
import type { StepsLog } from '../lib/types';
import { useLoad } from '../lib/useLoad';

export default function Steps() {
  const c = useColors();
  const { user } = useAuth();
  const date = today();
  const target = user?.stepTarget || 10000;
  const [steps, setSteps] = useState('');
  const [range, setRange] = useState<7 | 30>(7);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data, reload, refreshing, refresh } = useLoad(`steps:${date}:${range}`, async () => {
    const [log, hist] = await Promise.all([
      api.get<StepsLog>(`/steps/${date}`),
      api.get<StepsLog[]>('/steps/history/week', { params: { startDate: rangeStart(range), days: range } }),
    ]);
    return { log, series: dailySeries(hist, range, l => l.steps) };
  });

  const count = data?.log.steps || 0;

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const n = parseInt(steps, 10);
      // Same estimates as the web app: ~0.762 m and ~0.04 kcal per step
      await api.post('/steps', { date, steps: n, distance: Math.round(n * 0.000762 * 100) / 100, caloriesBurnt: Math.round(n * 0.04) });
      setSteps('');
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Card style={{ alignItems: 'center', gap: 10 }}>
        <Ring value={count} max={target} size={170} stroke={14} color={c.coral}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: c.ink }}>{count.toLocaleString()}</Text>
          <Text style={{ color: c.ink50, fontSize: 12 }}>of {target.toLocaleString()}</Text>
        </Ring>
        <Text style={{ color: c.ink50 }}>
          {data?.log.distance ? `${data.log.distance} km · ` : ''}{data?.log.caloriesBurnt ? `${data.log.caloriesBurnt} kcal` : ''}
        </Text>
        {data?.log.source && data.log.source !== 'manual'
          ? <Label>synced {user?.healthSync?.lastSyncAt ? timeAgo(user.healthSync.lastSyncAt) : ''}</Label>
          : <Button title="Sync from phone instead" variant="ghost" small onPress={() => router.push('/health')} />}
      </Card>
      <Card style={{ gap: 10 }}>
        <CardHeader title="Log steps manually" />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Field value={steps} onChangeText={t => setSteps(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder={String(count || 8000)} accessibilityLabel="Steps today" />
          <Button title="Save" onPress={save} loading={saving} disabled={!parseInt(steps, 10)} />
        </View>
        <ErrorText>{error}</ErrorText>
      </Card>
      <Card>
        <CardHeader title={`${range}-day steps`} right={<View style={{ width: 120 }}><Segmented value={range} onChange={setRange} options={[{ value: 7, label: '7D' }, { value: 30, label: '30D' }]} /></View>} />
        <Label>avg {Math.round(loggedAverage(data?.series || [])).toLocaleString()}</Label>
        <View style={{ height: 8 }} />
        <BarChart data={data?.series || []} target={target} todayDate={date} format={v => `${v.toLocaleString()} steps`} />
      </Card>
    </Screen>
  );
}
