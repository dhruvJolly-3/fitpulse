// EXPO_PUBLIC_* variables are inlined into the bundle by Expo at build time.
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    [key: string]: string | undefined;
  };
};
