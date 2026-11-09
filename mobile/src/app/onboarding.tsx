import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, Chips, ErrorText, Field, Label, Screen } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { ActivityLevel, DietType, Goal, User } from '../lib/types';

const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose_weight', label: 'Lose weight' }, { value: 'maintain', label: 'Maintain' },
  { value: 'gain_muscle', label: 'Build muscle' }, { value: 'endurance', label: 'Endurance' },
];
const ACTIVITY: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Desk job' }, { value: 'lightly_active', label: 'Light' },
  { value: 'moderately_active', label: 'Moderate' }, { value: 'very_active', label: 'Very active' },
  { value: 'extra_active', label: 'Athlete' },
];
const DIETS: { value: DietType; label: string }[] = [
  { value: 'non-veg', label: 'Non-veg' }, { value: 'veg', label: 'Veg' }, { value: 'vegan', label: 'Vegan' },
  { value: 'keto', label: 'Keto' }, { value: 'paleo', label: 'Paleo' },
];

export default function Onboarding() {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({ age: '', height: '', weight: '', targetWeight: '' });
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [activity, setActivity] = useState<ActivityLevel>('moderately_active');
  const [diet, setDiet] = useState<DietType>('non-veg');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v.replace(/[^0-9.]/g, '') }));

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      const updated = await api.put<User>('/user/profile', {
        profile: {
          age: +form.age, height: +form.height, weight: +form.weight,
          targetWeight: form.targetWeight ? +form.targetWeight : '',
          gender, goal, activityLevel: activity, dietType: diet,
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      updateUser(updated); // profile.age set → the gate opens the tabs
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={`Hi ${user?.name?.split(' ')[0] || 'there'} 👋`} subtitle="a few numbers to personalise your targets">
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field grow label="Age" value={form.age} onChangeText={set('age')} keyboardType="number-pad" placeholder="25" />
          <Field grow label="Height" value={form.height} onChangeText={set('height')} keyboardType="decimal-pad" suffix="cm" placeholder="175" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field grow label="Weight" value={form.weight} onChangeText={set('weight')} keyboardType="decimal-pad" suffix="kg" placeholder="70" />
          <Field grow label="Target (optional)" value={form.targetWeight} onChangeText={set('targetWeight')} keyboardType="decimal-pad" suffix="kg" placeholder="65" />
        </View>
        <Label>Gender</Label>
        <Chips>{(['male', 'female', 'other'] as const).map(g => <Chip key={g} label={g[0].toUpperCase() + g.slice(1)} on={gender === g} onPress={() => setGender(g)} />)}</Chips>
        <Label>Goal</Label>
        <Chips>{GOALS.map(g => <Chip key={g.value} label={g.label} on={goal === g.value} onPress={() => setGoal(g.value)} />)}</Chips>
        <Label>Activity</Label>
        <Chips>{ACTIVITY.map(a => <Chip key={a.value} label={a.label} on={activity === a.value} onPress={() => setActivity(a.value)} />)}</Chips>
        <Label>Diet</Label>
        <Chips>{DIETS.map(d => <Chip key={d.value} label={d.label} on={diet === d.value} onPress={() => setDiet(d.value)} />)}</Chips>
        <ErrorText>{error}</ErrorText>
        <Button title="Calculate my targets" onPress={save} loading={busy} disabled={!form.age || !form.height || !form.weight} />
        <Button title="Sign out" variant="ghost" small onPress={logout} />
      </Card>
    </Screen>
  );
}
