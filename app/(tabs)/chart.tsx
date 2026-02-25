import { useMemo, useState } from 'react';
import { ScrollView, Text, View, Button } from 'react-native';
import { LatencyChart } from '@/components/LatencyChart';
import { useAppStore } from '@/lib/store';

export default function ChartScreen() {
  const samples = useAppStore((s) => s.samples);
  const [windowMs, setWindowMs] = useState(5 * 60_000);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - windowMs;
    return samples.filter((s) => s.timestamp >= cutoff);
  }, [samples, windowMs]);

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Text style={{ fontWeight: '700', marginBottom: 8 }}>Latency Time Series</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Button title="1m" onPress={() => setWindowMs(60_000)} />
        <Button title="5m" onPress={() => setWindowMs(5 * 60_000)} />
        <Button title="30m" onPress={() => setWindowMs(30 * 60_000)} />
      </View>
      <LatencyChart samples={filtered} />
    </ScrollView>
  );
}
