import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { initDb } from '@/lib/db';

export default function RootLayout() {
  const loadSettings = useAppStore((s) => s.loadSettings);

  useEffect(() => {
    void initDb();
    void loadSettings();
  }, [loadSettings]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
