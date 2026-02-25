import { useState } from 'react';
import { ScrollView, Text, Switch, TextInput, Button } from 'react-native';
import { useAppStore } from '@/lib/store';

export default function SettingsScreen() {
  const { darkMode, qualityThresholdMs, lossThresholdPct, setDarkMode, setThresholds } = useAppStore();
  const [q, setQ] = useState(String(qualityThresholdMs));
  const [l, setL] = useState(String(lossThresholdPct));

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Text style={{ fontWeight: '700' }}>Dark mode</Text>
      <Switch value={darkMode} onValueChange={(v) => void setDarkMode(v)} />

      <Text style={{ fontWeight: '700', marginTop: 12 }}>Quality threshold (ms)</Text>
      <TextInput value={q} onChangeText={setQ} keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 8 }} />

      <Text style={{ fontWeight: '700', marginTop: 12 }}>Loss threshold (%)</Text>
      <TextInput value={l} onChangeText={setL} keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 8 }} />

      <Button title="Save thresholds" onPress={() => void setThresholds(Number(q || 0), Number(l || 0))} />
    </ScrollView>
  );
}
