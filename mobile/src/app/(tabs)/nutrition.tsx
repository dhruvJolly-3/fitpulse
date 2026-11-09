import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BarChart, Ring } from '../../components/charts';
import { Button, Card, CardHeader, Empty, Label, ProgressBar, Row, Screen, Segmented } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { addDays, dailySeries, longDate, loggedAverage, parseDate, rangeStart, toDateStr, today } from '../../lib/date';
import { useColors } from '../../lib/theme';
import type { NutritionLog } from '../../lib/types';
import { useLoad } from '../../lib/useLoad';
import { MEALS } from '../../lib/meals';


export default function Nutrition() {
  const c = useColors();
  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const [range, setRange] = useState<7 | 30>(7);
  const { data, setData, refreshing, refresh } = useLoad(async () => {
    const [log, history] = await Promise.all([
      api.get<NutritionLog>(`/nutrition/${date}`),
      api.get<NutritionLog[]>('/nutrition/summary/week', { params: { startDate: rangeStart(range), days: range } }),
    ]);
    return { log, series: dailySeries(history, range, l => l.totals?.calories) };
  }, [date, range]);

  const target = user?.dailyCalorieTarget || 2000;
  const totals = data?.log.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const remaining = Math.round(target - totals.calories);
  const isToday = date === today();
  const shift = (n: number) => setDate(toDateStr(addDays(parseDate(date), n)));

  const remove = (foodId: string, name: string) => {
    Alert.alert('Remove food?', name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const log = await api.del<NutritionLog>(`/nutrition/${date}/food/${foodId}`);
          setData(d => (d ? { ...d, log } : d));
        },
      },
    ]);
  };

  return (
    <Screen
      title="Nutrition"
      subtitle="track every bite, hit your macros"
      refreshing={refreshing}
      onRefresh={refresh}
      right={<Button title="+ Log" small onPress={() => router.push({ pathname: '/log-food', params: { date } })} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityLabel="Previous day" onPress={() => shift(-1)} hitSlop={12}><Feather name="chevron-left" size={24} color={c.ink} /></Pressable>
        <Text style={{ color: c.ink, fontWeight: '700' }}>{isToday ? 'Today' : longDate(date)}</Text>
        <Pressable accessibilityLabel="Next day" onPress={() => shift(1)} disabled={isToday} hitSlop={12} style={{ opacity: isToday ? 0.3 : 1 }}>
          <Feather name="chevron-right" size={24} color={c.ink} />
        </Pressable>
      </View>

      <Card tone="lime" style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <Ring value={totals.calories} max={target} size={120} stroke={11} trackColor="rgba(14,14,16,0.14)" color="#0e0e10">
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#0e0e10' }}>{Math.round(totals.calories)}</Text>
          <Text style={{ fontSize: 11, color: 'rgba(14,14,16,0.6)' }}>kcal</Text>
        </Ring>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: '#0e0e10', fontWeight: '800', fontSize: 16 }}>
            {remaining >= 0 ? `${remaining} kcal left` : `${-remaining} kcal over`}
          </Text>
          {[
            ['Protein', totals.protein, user?.macroTargets?.protein || 150],
            ['Carbs', totals.carbs, user?.macroTargets?.carbs || 250],
            ['Fat', totals.fat, user?.macroTargets?.fat || 65],
          ].map(([k, v, max]) => (
            <View key={k as string} style={{ gap: 3 }}>
              <Text style={{ fontSize: 12, color: 'rgba(14,14,16,0.7)' }}>{k} {Math.round(v as number)}/{max}g</Text>
              <ProgressBar value={v as number} max={max as number} color="#0e0e10" tone="lime" />
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <CardHeader title={isToday ? "Today's meals" : 'Meals'} right={<Label>{data?.log.foods.length || 0} logged</Label>} />
        {data && data.log.foods.length === 0 ? (
          <Empty title="No meals logged yet" text={`Search 60+ Indian dishes and packaged foods, or scan a barcode.`}
            action={<Button title="Log your first meal" small onPress={() => router.push({ pathname: '/log-food', params: { date } })} />} />
        ) : null}
        {MEALS.map(meal => {
          const foods = (data?.log.foods || []).filter(f => f.mealType === meal.value);
          if (!foods.length) return null;
          return (
            <View key={meal.value} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ color: c.ink, fontWeight: '800' }}>{meal.icon} {meal.label}</Text>
                <Text style={{ color: c.ink50 }}>{Math.round(foods.reduce((s, f) => s + f.calories, 0))} kcal</Text>
              </View>
              {foods.map(f => (
                <Row key={f._id} title={f.name}
                  subtitle={`${f.quantity ? `${f.quantity} g · ` : ''}P ${Math.round(f.protein)} · C ${Math.round(f.carbs)} · F ${Math.round(f.fat)}`}
                  right={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ color: c.ink, fontWeight: '700' }}>{Math.round(f.calories)}</Text>
                      <Pressable accessibilityLabel={`Remove ${f.name}`} hitSlop={10} onPress={() => remove(f._id, f.name)}>
                        <Feather name="trash-2" size={16} color={c.ink50} />
                      </Pressable>
                    </View>
                  } />
              ))}
            </View>
          );
        })}
      </Card>

      <Card>
        <CardHeader title={`${range}-day calories`} right={<View style={{ width: 120 }}><Segmented value={range} onChange={setRange} options={[{ value: 7, label: '7D' }, { value: 30, label: '30D' }]} /></View>} />
        <Label>target {target} · avg {Math.round(loggedAverage(data?.series || []))}</Label>
        <View style={{ height: 8 }} />
        <BarChart data={data?.series || []} target={target} todayDate={today()} colorByTarget={false} format={v => `${Math.round(v)} kcal`} />
      </Card>
    </Screen>
  );
}
