import { useEffect, useState } from 'react';
import { Platform, Text } from 'react-native';
import { Button, Card, CardHeader, ErrorText, Label, Row, Screen, Segmented } from '../components/ui';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/date';
import { useColors } from '../lib/theme';
import { health } from '../health';
import { syncHealth, type SyncSummary } from '../health/sync';

export default function HealthSync() {
  const c = useColors();
  const { user, refreshUser } = useAuth();
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [days, setDays] = useState<7 | 30>(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncSummary | null>(null);

  useEffect(() => { health.unavailableReason().then(setUnavailable); }, []);

  const connectAndSync = async () => {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const ok = await health.requestAccess();
      if (!ok && Platform.OS === 'android') throw new Error('No permissions were granted in Health Connect.');
      const res = await syncHealth(days);
      if (res) setResult(res.summary);
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err, 'Sync failed'));
    } finally {
      setBusy(false);
    }
  };

  const last = user?.healthSync?.lastSyncAt;

  return (
    <Screen>
      <Card style={{ gap: 10 }}>
        <CardHeader title={health.name} right={<Label>{last ? `synced ${timeAgo(last)}` : 'not connected'}</Label>} />
        <Text style={{ color: c.ink70, fontSize: 14, lineHeight: 20 }}>
          {Platform.OS === 'ios'
            ? 'Reads steps, walking distance, active energy, sleep, workouts and weight from Apple Health (including Apple Watch).'
            : Platform.OS === 'android'
              ? 'Reads steps, distance, active calories, sleep, exercise sessions and weight from Health Connect (Samsung Health, Fitbit, Google Fit and most watches write there).'
              : 'Health sync runs on your phone.'}
        </Text>
        <Text style={{ color: c.ink50, fontSize: 12 }}>
          {"Your own entries always win: synced sleep and weight only fill days you didn't log, and steps keep the higher count."}
        </Text>
      </Card>

      {unavailable ? (
        <Card><Text style={{ color: c.ink }}>{unavailable}</Text></Card>
      ) : (
        <Card style={{ gap: 12 }}>
          <Label>sync window</Label>
          <Segmented value={days} onChange={setDays} options={[{ value: 7, label: 'Last 7 days' }, { value: 30, label: 'Last 30 days' }]} />
          <Button title={last ? 'Sync now' : `Connect ${health.name}`} onPress={connectAndSync} loading={busy} />
        </Card>
      )}
      <ErrorText>{error}</ErrorText>

      {result && (
        <Card>
          <CardHeader title="Synced ✓" />
          <Row icon="👟" title="Step days" right={<Text style={{ color: c.ink }}>{result.steps}</Text>} />
          <Row icon="😴" title="Nights of sleep" right={<Text style={{ color: c.ink }}>{result.sleep}</Text>} />
          <Row icon="🏃" title="Workouts" right={<Text style={{ color: c.ink }}>{result.workouts}</Text>} />
          <Row icon="⚖️" title="Weigh-ins" right={<Text style={{ color: c.ink }}>{result.weight}</Text>} />
          {result.skipped ? <Text style={{ color: c.ink50, fontSize: 12, marginTop: 6 }}>{result.skipped} item(s) kept your manual entry.</Text> : null}
        </Card>
      )}
    </Screen>
  );
}
