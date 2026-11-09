import { useState } from 'react';
import { Text, View } from 'react-native';
import { Big, Button, Card, CardHeader, Chip, Chips, ErrorText, Field, Label, Screen } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useColors } from '../lib/theme';
import type { ActivityLevel, DietType, Goal, User } from '../lib/types';

const GOALS: [Goal, string][] = [['lose_weight', 'Lose weight'], ['maintain', 'Maintain'], ['gain_muscle', 'Build muscle'], ['endurance', 'Endurance']];
const ACTIVITY: [ActivityLevel, string][] = [['sedentary', 'Desk job'], ['lightly_active', 'Light'], ['moderately_active', 'Moderate'], ['very_active', 'Very active'], ['extra_active', 'Athlete']];
const DIETS: [DietType, string][] = [['non-veg', 'Non-veg'], ['veg', 'Veg'], ['vegan', 'Vegan'], ['keto', 'Keto'], ['paleo', 'Paleo']];

const str = (n?: number) => (n == null ? '' : String(n));

export default function Profile() {
  const c = useColors();
  const { user, updateUser } = useAuth();
  const p = user?.profile || {};
  const [form, setForm] = useState({
    name: user?.name || '', age: str(p.age), height: str(p.height), weight: str(p.weight), targetWeight: str(p.targetWeight),
    waterTarget: str(user?.waterTarget), stepTarget: str(user?.stepTarget), sleepTarget: str(user?.sleepTarget),
  });
  const [goal, setGoal] = useState<Goal>(p.goal || 'maintain');
  const [activity, setActivity] = useState<ActivityLevel>(p.activityLevel || 'moderately_active');
  const [diet, setDiet] = useState<DietType>(p.dietType || 'non-veg');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => { setSaved(false); setForm(f => ({ ...f, [k]: v })); };
  const num = (v: string) => (v.trim() ? Number(v) : undefined);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const updated = await api.put<User>('/user/profile', {
        name: form.name.trim(),
        profile: { age: num(form.age), height: num(form.height), weight: num(form.weight), targetWeight: form.targetWeight ? num(form.targetWeight) : '', goal, activityLevel: activity, dietType: diet },
        waterTarget: num(form.waterTarget), stepTarget: num(form.stepTarget), sleepTarget: num(form.sleepTarget),
      });
      updateUser(updated);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      {user?.dailyCalorieTarget ? (
        <Card tone="dark" style={{ gap: 6 }}>
          <Label tone="dark">daily calorie target</Label>
          <Big value={user.dailyCalorieTarget} unit="kcal" tone="dark" />
          <Text style={{ color: 'rgba(241,235,222,0.55)', fontSize: 12 }}>
            TDEE {user.tdee} · P {user.macroTargets?.protein}g · C {user.macroTargets?.carbs}g · F {user.macroTargets?.fat}g
          </Text>
        </Card>
      ) : null}
      <Card style={{ gap: 12 }}>
        <CardHeader title="Body" />
        <Field label="Name" value={form.name} onChangeText={set('name')} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field grow label="Age" value={form.age} onChangeText={set('age')} keyboardType="number-pad" />
          <Field grow label="Height" value={form.height} onChangeText={set('height')} keyboardType="decimal-pad" suffix="cm" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field grow label="Weight" value={form.weight} onChangeText={set('weight')} keyboardType="decimal-pad" suffix="kg" />
          <Field grow label="Target" value={form.targetWeight} onChangeText={set('targetWeight')} keyboardType="decimal-pad" suffix="kg" />
        </View>
        <Label>Goal</Label>
        <Chips>{GOALS.map(([v, l]) => <Chip key={v} label={l} on={goal === v} onPress={() => { setGoal(v); setSaved(false); }} />)}</Chips>
        <Label>Activity</Label>
        <Chips>{ACTIVITY.map(([v, l]) => <Chip key={v} label={l} on={activity === v} onPress={() => { setActivity(v); setSaved(false); }} />)}</Chips>
        <Label>Diet</Label>
        <Chips>{DIETS.map(([v, l]) => <Chip key={v} label={l} on={diet === v} onPress={() => { setDiet(v); setSaved(false); }} />)}</Chips>
      </Card>
      <Card style={{ gap: 12 }}>
        <CardHeader title="Daily targets" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field grow label="Water" value={form.waterTarget} onChangeText={set('waterTarget')} keyboardType="number-pad" suffix="ml" />
          <Field grow label="Sleep" value={form.sleepTarget} onChangeText={set('sleepTarget')} keyboardType="decimal-pad" suffix="h" />
        </View>
        <Field label="Steps" value={form.stepTarget} onChangeText={set('stepTarget')} keyboardType="number-pad" />
      </Card>
      <ErrorText>{error}</ErrorText>
      <Button title={saved ? 'Saved ✓' : 'Save changes'} onPress={save} loading={saving} />
      <Text style={{ color: c.ink50, fontSize: 12, textAlign: 'center' }}>Calorie and macro targets are recalculated from your stats (Mifflin-St Jeor).</Text>
    </Screen>
  );
}
