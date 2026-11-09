import { useState } from 'react';
import { Alert, Dimensions, Modal, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AuthImage } from '../../components/AuthImage';
import { LineChart } from '../../components/charts';
import { Big, Button, Card, CardHeader, Chip, Chips, Empty, ErrorText, Field, Label, Row, Screen, Segmented, Skeleton } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { dayMonth, longDate, today } from '../../lib/date';
import { pickProgressPhoto } from '../../lib/photo';
import { useColors } from '../../lib/theme';
import type { Photo, User, WeightHistory } from '../../lib/types';
import { useLoad } from '../../lib/useLoad';

const POSES: Photo['pose'][] = ['front', 'side', 'back', 'other'];
const RANGES = [{ value: 30, label: '30D' }, { value: 90, label: '90D' }, { value: 365, label: '1Y' }] as const;

export default function Progress() {
  const c = useColors();
  const { user, updateUser } = useAuth();
  const date = today();
  const [range, setRange] = useState<30 | 90 | 365>(90);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [pose, setPose] = useState<Photo['pose']>('front');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Photo | null>(null);
  const [compare, setCompare] = useState<string[]>([]);

  const { data, reload, refreshing, refresh } = useLoad(`progress:${date}:${range}`, async () => {
    const [history, photos] = await Promise.all([
      api.get<WeightHistory>('/weight/history', { params: { days: range, endDate: date } }),
      api.get<Photo[]>('/photos'),
    ]);
    return { history, photos };
  });

  const entries = data?.history.entries || [];
  const latest = entries[entries.length - 1];
  const target = user?.profile?.targetWeight;
  const toGo = latest && target ? Math.round((latest.weight - target) * 10) / 10 : null;
  const todayEntry = entries.find(e => e.date === date);

  const logWeight = async () => {
    setError(null);
    setBusy('weight');
    try {
      const res = await api.post<{ user: User }>('/weight', { date, weight: parseFloat(weight), bodyFat: bodyFat ? parseFloat(bodyFat) : undefined });
      if (res.user) updateUser(res.user); // new weight → new calorie targets
      setWeight(''); setBodyFat('');
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const deleteWeight = (d: string) => Alert.alert('Delete weigh-in?', longDate(d), [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { const r = await api.del<{ user?: User }>(`/weight/${d}`); if (r.user) updateUser(r.user); reload(); } },
  ]);

  const addPhoto = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      const picked = await pickProgressPhoto(source);
      if (!picked) return;
      setBusy('photo');
      await api.post('/photos', { date, pose, ...picked }, { timeoutMs: 90000 });
      await reload();
    } catch (err) {
      setError(errorMessage(err, 'Upload failed'));
    } finally {
      setBusy(null);
    }
  };

  const deletePhoto = async (p: Photo) => {
    await api.del(`/photos/${p._id}`);
    setViewer(null);
    setCompare(x => x.filter(id => id !== p._id));
    reload();
  };

  const toggleCompare = (id: string) => setCompare(x => (x.includes(id) ? x.filter(i => i !== id) : [...x, id].slice(-2)));
  const pair = compare.map(id => data?.photos.find(p => p._id === id)).filter(Boolean).sort((a, b) => a!.date.localeCompare(b!.date)) as Photo[];
  const thumbSize = (Dimensions.get('window').width - 32 - 32 - 16) / 3;

  return (
    <Screen title="Progress" subtitle="weight trend and progress photos" refreshing={refreshing} onRefresh={refresh}>
      {!data && <Skeleton heights={[110, 140, 220]} />}
      {data && <>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card tone="dark" style={{ flex: 1, gap: 6 }}>
          <Label tone="dark">latest</Label>
          <Big value={latest?.weight ?? user?.profile?.weight ?? '—'} unit="kg" tone="dark" />
          <Text style={{ color: 'rgba(241,235,222,0.55)', fontSize: 12 }}>
            {data?.history.summary.change != null && entries.length > 1 ? `${data.history.summary.change > 0 ? '+' : ''}${data.history.summary.change} kg in ${RANGES.find(r => r.value === range)?.label}` : 'log to see change'}
          </Text>
        </Card>
        <Card style={{ flex: 1, gap: 6 }}>
          <Label>goal</Label>
          <Big value={target ?? '—'} unit="kg" />
          <Text style={{ color: c.ink50, fontSize: 12 }}>
            {toGo == null ? 'set in profile' : Math.abs(toGo) < 0.1 ? 'reached 🎉' : `${Math.abs(toGo)} kg to ${toGo > 0 ? 'lose' : 'gain'}`}
          </Text>
        </Card>
      </View>

      <Card style={{ gap: 10 }}>
        <CardHeader title={todayEntry ? 'Update today' : "Today's weigh-in"} right={todayEntry ? <Label>{todayEntry.weight} kg logged</Label> : undefined} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix="kg" placeholder={String(latest?.weight || user?.profile?.weight || 70)} accessibilityLabel="Weight in kg" />
          <Field value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" suffix="%" placeholder="Body fat" accessibilityLabel="Body fat percent, optional" />
        </View>
        <Button title="Save weigh-in" onPress={logWeight} loading={busy === 'weight'} disabled={!parseFloat(weight)} />
      </Card>
      <ErrorText>{error}</ErrorText>

      <Card>
        <CardHeader title="Weight trend" right={<View style={{ width: 150 }}><Segmented value={range} onChange={setRange} options={RANGES.map(r => ({ ...r }))} /></View>} />
        <Label>dots = weigh-ins · line = 7-entry average</Label>
        <View style={{ height: 8 }} />
        <LineChart target={target} points={entries.map(e => ({ date: e.date, label: dayMonth(e.date), value: e.weight, trend: e.trend }))} />
        {[...entries].reverse().slice(0, 5).map(e => (
          <Row key={e.date} title={`${e.weight} kg${e.bodyFat ? ` · ${e.bodyFat}%` : ''}`} subtitle={`${longDate(e.date)}${e.source && e.source !== 'manual' ? ' · synced' : ''}`}
            right={<Pressable accessibilityLabel={`Delete weigh-in ${e.date}`} hitSlop={10} onPress={() => deleteWeight(e.date)}><Feather name="trash-2" size={16} color={c.ink50} /></Pressable>} />
        ))}
      </Card>

      <Card style={{ gap: 12 }}>
        <CardHeader title="Progress photos" right={<Label>private · tap 2 to compare</Label>} />
        <Chips>{POSES.map(p => <Chip key={p} label={p} on={pose === p} onPress={() => setPose(p)} />)}</Chips>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="📷 Take photo" style={{ flex: 1 }} small onPress={() => addPhoto('camera')} loading={busy === 'photo'} />
          <Button title="From gallery" variant="ghost" small onPress={() => addPhoto('library')} disabled={busy === 'photo'} />
        </View>

        {pair.length === 2 && (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {pair.map(p => (
                <View key={p._id} style={{ flex: 1, gap: 4 }}>
                  <AuthImage path={`/photos/${p._id}/image`} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 14 }} accessibilityLabel={`Photo from ${p.date}`} />
                  <Text style={{ color: c.ink50, fontSize: 12 }}>{dayMonth(p.date)}{p.weight ? ` · ${p.weight} kg` : ''}</Text>
                </View>
              ))}
            </View>
            {pair[0].weight && pair[1].weight ? (
              <Text style={{ color: c.ink, fontWeight: '700' }}>
                {Math.round((pair[1].weight - pair[0].weight) * 10) / 10 > 0 ? '+' : ''}{Math.round((pair[1].weight - pair[0].weight) * 10) / 10} kg between photos
              </Text>
            ) : null}
            <Button title="Close compare" variant="ghost" small onPress={() => setCompare([])} />
          </View>
        )}

        {data?.photos.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {data.photos.map(p => (
              <Pressable key={p._id} onPress={() => toggleCompare(p._id)} onLongPress={() => setViewer(p)} accessibilityLabel={`${p.pose} photo from ${p.date}. Long press to open.`}
                style={{ width: thumbSize, borderRadius: 12, borderWidth: 2, borderColor: compare.includes(p._id) ? c.coral : 'transparent', overflow: 'hidden' }}>
                <AuthImage path={`/photos/${p._id}/image?size=thumb`} style={{ width: '100%', aspectRatio: 3 / 4 }} />
                <Text style={{ color: c.ink50, fontSize: 10, padding: 4 }} numberOfLines={1}>{dayMonth(p.date)}{p.weight ? ` · ${p.weight}kg` : ''}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Empty title="Your first photo is your baseline" text="Same light, same pose, every 2–4 weeks. Long-press a photo to open or delete it." />
        )}
      </Card>
      </>}

      <Modal visible={Boolean(viewer)} animationType="fade" transparent onRequestClose={() => setViewer(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 16, gap: 12 }}>
          {viewer && (
            <>
              <AuthImage path={`/photos/${viewer._id}/image`} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 16 }} />
              <Text style={{ color: '#fff' }}>{longDate(viewer.date)} · {viewer.pose}{viewer.weight ? ` · ${viewer.weight} kg` : ''}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title="Close" variant="lime" style={{ flex: 1 }} onPress={() => setViewer(null)} />
                <Button title="Delete" variant="danger" onPress={() => deletePhoto(viewer)} />
              </View>
            </>
          )}
        </View>
      </Modal>
    </Screen>
  );
}
