import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Button, Card, Chip, Chips, ErrorText, Field, Label, Row, Segmented } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { today } from '../lib/date';
import { MEALS } from '../lib/meals';
import { useColors } from '../lib/theme';
import type { Food, MealType } from '../lib/types';

type Mode = 'search' | 'scan' | 'custom';

// Default meal from the time of day
const mealForNow = (): MealType => {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner';
};

const scale = (food: Food, grams: number) => {
  const k = grams / 100;
  const r = (v: number) => Math.round((v || 0) * k * 10) / 10;
  return {
    name: food.name,
    brand: food.brand || undefined,
    quantity: Math.round(grams),
    unit: 'g',
    calories: Math.round((food.per100g.calories || 0) * k),
    protein: r(food.per100g.protein),
    carbs: r(food.per100g.carbs),
    fat: r(food.per100g.fat),
    fiber: r(food.per100g.fiber),
  };
};

function Scanner({ onCode }: { onCode: (code: string) => void }) {
  const c = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const handled = useRef(false);

  const onScanned = (r: BarcodeScanningResult) => {
    if (handled.current || !r.data) return;
    handled.current = true; // the camera keeps firing; act on the first read only
    onCode(r.data.replace(/\D/g, ''));
  };

  return (
    <View style={{ gap: 12 }}>
      {Platform.OS !== 'web' && permission?.granted ? (
        <View style={{ borderRadius: 18, overflow: 'hidden', aspectRatio: 3 / 4, backgroundColor: '#000' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={onScanned}
          />
          <View pointerEvents="none" style={{ position: 'absolute', top: '30%', left: '12%', right: '12%', height: '30%', borderWidth: 2, borderColor: c.matcha, borderRadius: 14 }} />
        </View>
      ) : Platform.OS !== 'web' ? (
        <Card style={{ gap: 10 }}>
          <Text style={{ color: c.ink }}>Allow camera access to scan the barcode on a food pack.</Text>
          <Button title="Allow camera" onPress={requestPermission} />
        </Card>
      ) : (
        <Text style={{ color: c.ink50 }}>Camera scanning works in the phone app. Type the number under the barcode instead.</Text>
      )}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <Field grow label="Or type the barcode" value={manual} onChangeText={t => setManual(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="8901234567890" />
        <Button title="Look up" small disabled={manual.length < 6} onPress={() => onCode(manual)} />
      </View>
    </View>
  );
}

export default function LogFood() {
  const c = useColors();
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const date = params.date || today();
  const [meal, setMeal] = useState<MealType>(params.meal || mealForNow());
  const [mode, setMode] = useState<Mode>('search');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [picked, setPicked] = useState<Food | null>(null);
  const [unit, setUnit] = useState<'serving' | 'grams'>('serving');
  const [amount, setAmount] = useState('1');
  const [custom, setCustom] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search: built-in Indian foods + Open Food Facts
  useEffect(() => {
    if (mode !== 'search' || q.trim().length < 2) return undefined;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await api.get<{ results: Food[]; remoteError: string | null }>('/foods/search', { params: { q: q.trim() } });
        setResults(r.results);
        setNote(r.remoteError ? 'Packaged-food search is offline; showing built-in foods only.' : null);
      } catch (err) {
        setNote(errorMessage(err));
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, mode]);

  const pick = (food: Food) => { setPicked(food); setUnit('serving'); setAmount('1'); };

  const lookup = async (code: string) => {
    setNote(null);
    try {
      pick(await api.get<Food>(`/foods/barcode/${code}`));
    } catch (err) {
      setNote(errorMessage(err, `No product found for ${code}.`));
    }
    setMode('search');
  };

  const save = async (entry: Record<string, unknown>) => {
    setError(null);
    setSaving(true);
    try {
      await api.post(`/nutrition/${date}/food`, { ...entry, mealType: meal, time: new Date().toISOString() });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const grams = picked ? (unit === 'serving' ? (parseFloat(amount) || 0) * picked.serving.grams : parseFloat(amount) || 0) : 0;
  const preview = picked ? scale(picked, grams) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Chips>{MEALS.map(m => <Chip key={m.value} label={`${m.icon} ${m.label}`} on={meal === m.value} onPress={() => setMeal(m.value)} />)}</Chips>
      <Segmented value={mode} onChange={m => { setMode(m); setPicked(null); }}
        options={[{ value: 'search', label: 'Search' }, { value: 'scan', label: 'Scan' }, { value: 'custom', label: 'Custom' }]} />
      {note ? <Text style={{ color: c.ink50, fontSize: 13 }}>{note}</Text> : null}
      <ErrorText>{error}</ErrorText>

      {mode === 'scan' && <Scanner onCode={lookup} />}

      {mode === 'search' && picked && preview && (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {picked.image ? <Image source={{ uri: picked.image }} style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: c.bone }} resizeMode="contain" /> : null}
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.ink, fontWeight: '800', fontSize: 16 }}>{picked.name}</Text>
              <Text style={{ color: c.ink50, fontSize: 12 }}>{picked.brand ? `${picked.brand} · ` : ''}{picked.per100g.calories} kcal / 100 g</Text>
            </View>
          </View>
          <Segmented value={unit} onChange={u => { setUnit(u); setAmount(u === 'serving' ? '1' : String(picked.serving.grams)); }}
            options={[{ value: 'serving', label: `Servings (${picked.serving.label})` }, { value: 'grams', label: 'Grams' }]} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <Field grow label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" suffix={unit === 'serving' ? '×' : 'g'} />
            <Text style={{ color: c.ink, fontWeight: '800', fontSize: 20, paddingBottom: 12 }}>{preview.calories} kcal</Text>
          </View>
          <Text style={{ color: c.ink50, fontSize: 12 }}>
            {Math.round(grams)} g · P {preview.protein}g · C {preview.carbs}g · F {preview.fat}g · Fibre {preview.fiber}g
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Back" variant="ghost" onPress={() => setPicked(null)} />
            <Button title={`Add to ${MEALS.find(m => m.value === meal)?.label.toLowerCase()}`} style={{ flex: 1 }} disabled={!grams} loading={saving} onPress={() => save(preview)} />
          </View>
        </Card>
      )}

      {mode === 'search' && !picked && (
        <Card>
          <Field placeholder="Search foods, e.g. paneer, dal, Maggi…" value={q} onChangeText={setQ} autoFocus autoCorrect={false} accessibilityLabel="Search foods" />
          {searching && <ActivityIndicator style={{ marginTop: 12 }} color={c.ink} />}
          {!searching && q.trim().length >= 2 && results.length === 0 && (
            <Text style={{ color: c.ink50, marginTop: 12 }}>No matches. Try another word, scan the barcode, or add a custom food.</Text>
          )}
          <View style={{ marginTop: 8 }}>
            {q.trim().length >= 2 && results.map(f => (
              <Row key={f.id} title={f.name + (f.brand ? ` · ${f.brand}` : '')}
                subtitle={`${f.serving.label} · P ${Math.round(f.per100g.protein * f.serving.grams / 10) / 10}g · C ${Math.round(f.per100g.carbs * f.serving.grams / 10) / 10}g`}
                right={<Text style={{ color: c.ink, fontWeight: '800' }}>{Math.round(f.per100g.calories * f.serving.grams / 100)}</Text>}
                onPress={() => pick(f)} />
            ))}
          </View>
        </Card>
      )}

      {mode === 'custom' && (
        <Card style={{ gap: 10 }}>
          <Field label="Food name" value={custom.name} onChangeText={v => setCustom(x => ({ ...x, name: v }))} placeholder="Homemade dal" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field grow label="Calories" value={custom.calories} onChangeText={v => setCustom(x => ({ ...x, calories: v }))} keyboardType="decimal-pad" />
            <Field grow label="Protein" value={custom.protein} onChangeText={v => setCustom(x => ({ ...x, protein: v }))} keyboardType="decimal-pad" suffix="g" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field grow label="Carbs" value={custom.carbs} onChangeText={v => setCustom(x => ({ ...x, carbs: v }))} keyboardType="decimal-pad" suffix="g" />
            <Field grow label="Fat" value={custom.fat} onChangeText={v => setCustom(x => ({ ...x, fat: v }))} keyboardType="decimal-pad" suffix="g" />
          </View>
          <Label>Calories and name are required</Label>
          <Button title="Add food" loading={saving} disabled={!custom.name.trim() || !custom.calories}
            onPress={() => save({ name: custom.name.trim(), calories: +custom.calories || 0, protein: +custom.protein || 0, carbs: +custom.carbs || 0, fat: +custom.fat || 0 })} />
        </Card>
      )}
      <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={{ color: c.ink50, textAlign: 'center', padding: 8 }}>Cancel</Text></Pressable>
    </ScrollView>
  );
}
