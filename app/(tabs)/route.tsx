import { ScrollView, Text, View, Button } from 'react-native';
import { useAppStore } from '@/lib/store';

export default function RouteScreen() {
  const hops = useAppStore((s) => s.routeHops);
  const refreshRoute = useAppStore((s) => s.refreshRoute);

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Button title="Refresh now" onPress={() => void refreshRoute()} />
      <View style={{ marginTop: 10, borderWidth: 1, borderColor: '#9ca3af' }}>
        <Text style={{ fontWeight: '700', padding: 6 }}>Hop | Host/IP | Avg | Loss%</Text>
        {hops.map((h) => (
          <Text key={h.hop} style={{ padding: 6, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
            {h.hop}. {h.host || '-'} ({h.ip || '-'}) | {h.avgLatency?.toFixed(1) ?? '-'} ms | {h.lossPct.toFixed(1)}%
          </Text>
        ))}
        {!hops.length && <Text style={{ padding: 8 }}>No route data yet.</Text>}
      </View>
    </ScrollView>
  );
}
