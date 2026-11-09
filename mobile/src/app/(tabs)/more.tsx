import { Alert, Text } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card, Row, Screen } from '../../components/ui';
import { API_ORIGIN } from '../../config';
import { useAuth } from '../../lib/auth';
import { timeAgo } from '../../lib/date';
import { useColors } from '../../lib/theme';

export default function More() {
  const c = useColors();
  const { user, logout } = useAuth();
  const chevron = <Feather name="chevron-right" size={18} color={c.ink50} />;
  const go = (path: string) => () => router.push(path as never);
  const sync = user?.healthSync?.lastSyncAt;

  return (
    <Screen title="More" subtitle={user?.email}>
      <Card>
        <Row icon="💧" title="Hydration" subtitle="quick-add and trends" right={chevron} onPress={go('/water')} />
        <Row icon="😴" title="Sleep" subtitle="bedtime, wake time, quality" right={chevron} onPress={go('/sleep')} />
        <Row icon="👟" title="Activity" subtitle="steps, distance, burn" right={chevron} onPress={go('/steps')} />
      </Card>
      <Card>
        <Row icon="🔄" title="Health sync" subtitle={sync ? `last synced ${timeAgo(sync)}` : 'Health Connect / Apple Health'} right={chevron} onPress={go('/health')} />
        <Row icon="🔔" title="Smart reminders" subtitle={user?.reminders?.enabled ? 'on' : 'off'} right={chevron} onPress={go('/reminders')} />
        <Row icon="👤" title="Profile & goals" subtitle="body stats, targets" right={chevron} onPress={go('/profile')} />
      </Card>
      <Button title="Sign out" variant="danger" onPress={() => Alert.alert('Sign out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: logout }])} />
      <Text style={{ color: c.ink50, fontSize: 11, textAlign: 'center' }}>FitPulse mobile · {API_ORIGIN.replace(/^https?:\/\//, '')}</Text>
    </Screen>
  );
}
