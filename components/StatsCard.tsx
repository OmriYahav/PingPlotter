import { View, Text, StyleSheet } from 'react-native';
import { Stats } from '@/lib/types';

export function StatsCard({ title, stats }: { title: string; stats: Stats }) {
  const num = (v: number | null) => (v === null ? '-' : v.toFixed(1));
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text>Current: {num(stats.current)} ms</Text>
      <Text>Avg: {num(stats.avg)} ms</Text>
      <Text>Min/Max: {num(stats.min)} / {num(stats.max)} ms</Text>
      <Text>P95: {num(stats.p95)} ms</Text>
      <Text>Jitter: {num(stats.jitter)} ms</Text>
      <Text>Loss: {stats.lossPct.toFixed(1)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#374151', borderRadius: 8, padding: 12, marginVertical: 6, gap: 3 },
  title: { fontWeight: '700', marginBottom: 4 },
});
