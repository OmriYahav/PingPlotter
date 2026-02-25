import { ScrollView, Text, TextInput, View, Button, StyleSheet } from 'react-native';
import { useAppStore } from '@/lib/store';
import { StatsCard } from '@/components/StatsCard';

export default function MonitorScreen() {
  const {
    mode,
    target,
    intervalMs,
    timeoutMs,
    monitoring,
    backendReachable,
    statusMessage,
    setMode,
    setTarget,
    setIntervalMs,
    setTimeoutMs,
    startMonitoring,
    stopMonitoring,
    stats1m,
    stats5m,
    statsSession,
  } = useAppStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 12 }}>
      {!backendReachable && <Text style={styles.banner}>Backend unreachable</Text>}
      {statusMessage && <Text style={styles.bannerWarn}>{statusMessage}</Text>}

      <Text style={styles.section}>Target mode</Text>
      <View style={styles.row}>
        <Button title="HTTP URL" onPress={() => setMode('http')} color={mode === 'http' ? '#2563eb' : '#6b7280'} />
        <Button title="WS Ping" onPress={() => setMode('ws')} color={mode === 'ws' ? '#2563eb' : '#6b7280'} />
      </View>
      <TextInput value={target} onChangeText={setTarget} style={styles.input} placeholder="Target URL or WS endpoint" autoCapitalize="none" />

      <Text>Interval (0.5s–10s): {intervalMs} ms</Text>
      <TextInput value={String(intervalMs)} onChangeText={(v) => setIntervalMs(Number(v || 0))} keyboardType="numeric" style={styles.input} />
      <Text>Timeout (1s–5s): {timeoutMs} ms</Text>
      <TextInput value={String(timeoutMs)} onChangeText={(v) => setTimeoutMs(Number(v || 0))} keyboardType="numeric" style={styles.input} />

      {!monitoring ? (
        <Button title="Start" onPress={() => void startMonitoring()} />
      ) : (
        <Button title="Stop" color="#dc2626" onPress={() => void stopMonitoring()} />
      )}

      <StatsCard title="1m" stats={stats1m} />
      <StatsCard title="5m" stats={stats5m} />
      <StatsCard title="Session" stats={statsSession} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { fontWeight: '700', marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  input: { borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 8, marginVertical: 6 },
  banner: { backgroundColor: '#fca5a5', color: '#7f1d1d', padding: 8, borderRadius: 6, marginBottom: 8 },
  bannerWarn: { backgroundColor: '#fcd34d', color: '#78350f', padding: 8, borderRadius: 6, marginBottom: 8 },
});
