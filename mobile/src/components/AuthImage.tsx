import { useEffect, useState } from 'react';
import { Image, Platform, View, type ImageStyle, type StyleProp } from 'react-native';
import { API_URL } from '../config';
import { tokenStore } from '../lib/storage';
import { useColors } from '../lib/theme';

// Progress photos are private, so the image request must carry the auth
// header. Native <Image> accepts headers; on web we fetch a blob instead.
export function AuthImage({ path, style, accessibilityLabel }: { path: string; style?: StyleProp<ImageStyle>; accessibilityLabel?: string }) {
  const c = useColors();
  const [source, setSource] = useState<{ uri: string; headers?: Record<string, string> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      const token = await tokenStore.get();
      const uri = `${API_URL}${path}`;
      if (Platform.OS !== 'web') {
        if (!cancelled) setSource({ uri, headers: { Authorization: `Bearer ${token}` } });
        return;
      }
      const res = await fetch(uri, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok || cancelled) return;
      objectUrl = URL.createObjectURL(await res.blob());
      setSource({ uri: objectUrl });
    })().catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (!source) return <View style={[{ backgroundColor: c.bone }, style as object]} />;
  return <Image source={source} style={style} resizeMode="cover" accessibilityLabel={accessibilityLabel} />;
}
