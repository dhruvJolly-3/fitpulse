import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Big, Button, Card, CardHeader, Empty, ErrorText, Label, ProgressBar, Row, Screen } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { dayMonth, today } from '../../lib/date';
import { useColors } from '../../lib/theme';
import type { Exercise, TrainingProgram, WorkoutLog } from '../../lib/types';
import { useLoad } from '../../lib/useLoad';

// Program day for today: schedule index 0 = Monday (same rule as the web app)
const todayIndex = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };

const WEB_APP = 'https://fitpulse-ruddy.vercel.app/training';

export default function Training() {
  const c = useColors();
  const date = today();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data, setData, refreshing, refresh } = useLoad(`training:${date}`, async () => {
    const [log, programs, streak, recent] = await Promise.all([
      api.get<WorkoutLog | null>(`/training/logs/${date}`),
      api.get<TrainingProgram[]>('/training/programs'),
      api.get<{ streak: number; totalWorkouts: number }>('/training/streak'),
      api.get<WorkoutLog[]>('/training/logs', { params: { limit: 10 } }),
    ]);
    return { log, program: programs[0] || null, streak, recent };
  });

  const program = data?.program;
  const day = program?.schedule?.[todayIndex()];
  const log = data?.log;
  const exercises: Exercise[] = log?.exercises?.length ? log.exercises : day?.exercises || [];
  const done = exercises.filter(e => e.completed).length;

  const save = async (body: Partial<WorkoutLog>) => {
    setError(null);
    setBusy(true);
    try {
      const saved = await api.post<WorkoutLog>('/training/logs', { date, programName: program?.name, dayLabel: day?.label, ...body });
      setData(d => (d ? { ...d, log: saved } : d));
      const streak = await api.get<{ streak: number; totalWorkouts: number }>('/training/streak');
      setData(d => (d ? { ...d, streak } : d));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const startWorkout = () => save({
    isRestDay: false, isOffDay: false,
    exercises: (day?.exercises || []).map(e => ({ ...e, completed: false })),
    totalDuration: (day?.exercises || []).reduce((s, e) => s + (e.duration || 5), 0),
    totalCaloriesBurnt: (day?.exercises || []).length * 50,
  });

  // Optimistic: the tick shows on tap; the server save runs behind it
  const toggle = async (i: number) => {
    if (!log) return;
    const updated = { ...log, exercises: log.exercises.map((e, j) => (j === i ? { ...e, completed: !e.completed } : e)) };
    setData(d => (d ? { ...d, log: updated } : d));
    try {
      await api.post<WorkoutLog>('/training/logs', { ...updated, date });
    } catch (err) {
      setError(errorMessage(err));
      refresh();
    }
  };

  return (
    <Screen title="Training" subtitle={day ? day.label.toLowerCase() : 'train smart, recover hard'} refreshing={refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card tone="dark" style={{ flex: 1, gap: 6 }}>
          <Label tone="dark">streak 🔥</Label>
          <Big value={data?.streak.streak ?? 0} unit="days" tone="dark" />
        </Card>
        <Card style={{ flex: 1, gap: 6 }}>
          <Label>total workouts</Label>
          <Big value={data?.streak.totalWorkouts ?? 0} />
        </Card>
      </View>
      <ErrorText>{error}</ErrorText>

      <Card>
        <CardHeader title="Today" right={log ? <Label>{log.isRestDay ? 'rest day' : `${done}/${exercises.length} done`}</Label> : undefined} />
        {!program ? (
          <Empty title="No training program yet"
            text="Build your weekly program on the FitPulse website once; it shows up here every day."
            action={<Button title="Open FitPulse web" small variant="ghost" onPress={() => Linking.openURL(WEB_APP)} />} />
        ) : day?.isRest && !log ? (
          <Empty title="Rest day 😌" text="Recovery is part of training." action={<Button title="Log rest day" small onPress={() => save({ isRestDay: true, exercises: [] })} loading={busy} />} />
        ) : (
          <>
            {log && !log.isRestDay && <View style={{ marginBottom: 8 }}><ProgressBar value={done} max={Math.max(1, exercises.length)} color={c.matcha2} /></View>}
            {exercises.map((e, i) => (
              <Row key={`${e.name}-${i}`} title={e.name}
                subtitle={[e.sets && `${e.sets} sets`, e.reps && `${e.reps} reps`, e.duration && `${e.duration} min`].filter(Boolean).join(' · ')}
                onPress={log ? () => toggle(i) : undefined}
                right={log ? <Feather name={e.completed ? 'check-circle' : 'circle'} size={22} color={e.completed ? c.matcha2 : c.ink50} /> : undefined} />
            ))}
            {!log && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Button title="Start workout" style={{ flex: 1 }} onPress={startWorkout} loading={busy} />
                <Button title="Rest" variant="ghost" onPress={() => save({ isRestDay: true, exercises: [] })} />
              </View>
            )}
          </>
        )}
        {log?.synced?.length ? (
          <View style={{ marginTop: 10 }}>
            <Label>synced from your phone / watch</Label>
            {log.synced.map(w => (
              <Row key={w.externalId} icon="⌚" title={w.type}
                subtitle={[w.durationMin && `${w.durationMin} min`, w.calories && `${w.calories} kcal`, w.distanceKm && `${w.distanceKm} km`].filter(Boolean).join(' · ')} />
            ))}
          </View>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Recent" />
        {(data?.recent || []).map(l => (
          <Row key={l._id} title={l.isRestDay ? 'Rest day' : l.dayLabel || 'Workout'}
            subtitle={`${dayMonth(l.date)} · ${l.isRestDay ? 'recovery' : `${l.exercises.filter(e => e.completed).length}/${l.exercises.length} exercises${l.synced?.length ? ` · ${l.synced.length} synced` : ''}`}`} />
        ))}
        {data && !data.recent.length ? <Text style={{ color: c.ink50 }}>No workouts logged yet.</Text> : null}
      </Card>
      <Pressable onPress={() => Linking.openURL(WEB_APP)}><Text style={{ color: c.ink50, textAlign: 'center', fontSize: 12 }}>Edit your program and watch exercise demos on the web app ↗</Text></Pressable>
    </Screen>
  );
}
