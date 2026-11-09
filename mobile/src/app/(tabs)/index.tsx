import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ring } from '../../components/charts';
import { Big, Button, Card, Chip, Chips, Label, ProgressBar, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { longDate, today } from '../../lib/date';
import { useColors } from '../../lib/theme';
import type { NutritionLog, SleepLog, StepsLog, WaterLog, WorkoutLog } from '../../lib/types';
import { useLoad } from '../../lib/useLoad';

type Day = { nutrition: NutritionLog; water: WaterLog; steps: StepsLog; sleep: SleepLog | null; workout: WorkoutLog | null; streak: { streak: number } };

export default function Home() {
  const c = useColors();
  const { user } = useAuth();
  const date = today();
  const { data, refreshing, refresh, error } = useLoad<Day>(async () => {
    const [nutrition, water, steps, sleep, workout, streak] = await Promise.all([
      api.get<NutritionLog>(`/nutrition/${date}`),
      api.get<WaterLog>(`/water/${date}`),
      api.get<StepsLog>(`/steps/${date}`),
      api.get<SleepLog | null>(`/sleep/${date}`),
      api.get<WorkoutLog | null>(`/training/logs/${date}`),
      api.get<{ streak: number }>('/training/streak'),
    ]);
    return { nutrition, water, steps, sleep, workout, streak };
  }, [date]);

  const calTarget = user?.dailyCalorieTarget || 2000;
  const kcal = Math.round(data?.nutrition.totals.calories || 0);
  const macros = [
    { k: 'Protein', v: data?.nutrition.totals.protein || 0, max: user?.macroTargets?.protein || 150, color: c.matcha2 },
    { k: 'Carbs', v: data?.nutrition.totals.carbs || 0, max: user?.macroTargets?.carbs || 250, color: c.ink },
    { k: 'Fat', v: data?.nutrition.totals.fat || 0, max: user?.macroTargets?.fat || 65, color: c.coral },
  ];
  const water = data?.water.total || 0;
  const steps = data?.steps.steps || 0;
  const sleep = data?.sleep?.duration || 0;

  const tile = (title: string, value: string, unit: string, pct: number, sub: string, to: string, color: string) => (
    <Pressable key={title} accessibilityRole="button" onPress={() => router.push(to as never)} style={{ flexBasis: '48%', flexGrow: 1 }}>
      <Card style={{ gap: 8 }}>
        <Label>{title}</Label>
        <Big value={value} unit={unit} />
        <ProgressBar value={pct} max={1} color={color} />
        <Text style={{ color: c.ink50, fontSize: 12 }}>{sub}</Text>
      </Card>
    </Pressable>
  );

  return (
    <Screen title={`Hey ${user?.name?.split(' ')[0] || ''}`} subtitle={longDate(date).toLowerCase()} refreshing={refreshing} onRefresh={refresh}>
      {error ? <Text style={{ color: c.coral }}>{error}</Text> : null}

      <Card tone="lime" style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring value={kcal} max={calTarget} size={128} stroke={12} trackColor="rgba(14,14,16,0.14)" color="#0e0e10">
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#0e0e10' }}>{kcal}</Text>
          <Text style={{ fontSize: 11, color: 'rgba(14,14,16,0.6)' }}>of {calTarget} kcal</Text>
        </Ring>
        <View style={{ flex: 1, gap: 8 }}>
          {macros.map(m => (
            <View key={m.k} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '700', color: '#0e0e10', fontSize: 13 }}>{m.k}</Text>
                <Text style={{ color: 'rgba(14,14,16,0.6)', fontSize: 12 }}>{Math.round(m.v)}/{m.max}g</Text>
              </View>
              <ProgressBar value={m.v} max={m.max} color={m.color === c.matcha2 ? '#0e0e10' : m.color} tone="lime" />
            </View>
          ))}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {tile('Hydration', (water / 1000).toFixed(1), 'L', water / (user?.waterTarget || 2500), `of ${((user?.waterTarget || 2500) / 1000).toFixed(1)} L`, '/water', c.matcha2)}
        {tile('Steps', steps.toLocaleString(), '', steps / (user?.stepTarget || 10000), `of ${(user?.stepTarget || 10000).toLocaleString()}`, '/steps', c.ink)}
        {tile('Sleep', String(sleep), 'h', sleep / (user?.sleepTarget || 8), `of ${user?.sleepTarget || 8} h`, '/sleep', c.coral)}
        {tile('Streak', String(data?.streak.streak ?? 0), 'days', data?.workout && !data.workout.isOffDay ? 1 : 0, data?.workout ? 'today logged ✓' : 'log today to keep it', '/training', c.matcha2)}
      </View>

      <Card>
        <Label>Quick log</Label>
        <View style={{ height: 10 }} />
        <Chips>
          <Chip label="🍽️ Meal" onPress={() => router.push('/log-food')} />
          <Chip label="💧 Water" onPress={() => router.push('/water')} />
          <Chip label="🏋️ Workout" onPress={() => router.push('/training')} />
          <Chip label="⚖️ Weigh-in" onPress={() => router.push('/progress')} />
          <Chip label="😴 Sleep" onPress={() => router.push('/sleep')} />
        </Chips>
      </Card>

      {!user?.healthSync?.lastSyncAt && (
        <Card tone="dark" style={{ gap: 10 }}>
          <Text style={{ color: c.onDark, fontWeight: '800', fontSize: 16 }}>Fill your logs automatically</Text>
          <Text style={{ color: 'rgba(241,235,222,0.6)', fontSize: 13 }}>Connect Health Connect or Apple Health to sync steps, sleep, workouts and weight.</Text>
          <Button title="Set up health sync" variant="lime" small onPress={() => router.push('/health')} />
        </Card>
      )}
    </Screen>
  );
}
