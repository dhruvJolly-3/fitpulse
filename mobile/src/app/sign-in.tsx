import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, ErrorText, Field, Segmented, s } from '../components/ui';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useColors } from '../lib/theme';

export default function SignIn() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'in') await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const valid = email.includes('@') && password.length >= 6 && (mode === 'in' || name.trim().length > 0);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, paddingTop: insets.top + 20, gap: 18 }}>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.matcha, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '900', fontSize: 20, color: '#0e0e10' }}>F</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: c.ink }}>FitPulse<Text style={{ color: c.coral }}>.</Text></Text>
          </View>
          <Text style={[s.h1, { color: c.ink, fontSize: 36, marginTop: 18 }]}>Train. Eat.{'\n'}Sleep. Repeat.</Text>
          <Text style={{ color: c.ink50, fontSize: 15 }}>Your whole fitness routine, synced with the web app.</Text>
        </View>

        <Card style={{ gap: 12 }}>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'in', label: 'Sign in' }, { value: 'up', label: 'Create account' }]} />
          {mode === 'up' && <Field label="Name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="Your name" />}
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" autoCorrect={false} placeholder="you@example.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'in' ? 'current-password' : 'new-password'} textContentType={mode === 'in' ? 'password' : 'newPassword'} placeholder="At least 6 characters" onSubmitEditing={valid ? submit : undefined} />
          <ErrorText>{error}</ErrorText>
          <Button title={mode === 'in' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} disabled={!valid} />
          <Text style={{ color: c.ink50, fontSize: 12, textAlign: 'center' }}>
            {'Signed up with Google on the web? Use "Forgot password" on the website to set a password first.'}
          </Text>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}
