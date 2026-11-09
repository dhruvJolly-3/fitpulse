import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../lib/theme';

type IconName = React.ComponentProps<typeof Feather>['name'];
function TabIcon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  return <Feather name={name} color={color as string} size={size} />;
}
const icon = (name: IconName) => function Icon(props: { color: ColorValue; size: number }) {
  return <TabIcon name={name} {...props} />;
};

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.obsidian,
        tabBarInactiveTintColor: 'rgba(241,235,222,0.55)',
        tabBarActiveBackgroundColor: c.matcha,
        tabBarStyle: { backgroundColor: c.obsidian, borderTopWidth: 0, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 4 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('grid') }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Food', tabBarIcon: icon('pie-chart') }} />
      <Tabs.Screen name="training" options={{ title: 'Train', tabBarIcon: icon('activity') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('trending-down') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('more-horizontal') }} />
    </Tabs>
  );
}
