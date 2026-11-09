import Constants from 'expo-constants';

// API base URL, in order of precedence:
//   1. EXPO_PUBLIC_API_URL (set in mobile/.env for local dev, or in EAS build env)
//   2. expo.extra.apiUrl in app.json (the deployed Render API)
// A trailing slash or `/api` suffix is stripped so either form works.
const raw =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  'http://localhost:5001';

export const API_ORIGIN = raw.trim().replace(/\/+$/, '').replace(/\/api$/, '');
export const API_URL = `${API_ORIGIN}/api`;

// EAS project id, needed for Expo push tokens (set by `eas init`)
export const EAS_PROJECT_ID: string | undefined =
  (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
  (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
