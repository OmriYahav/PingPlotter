import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, ScrollView, Text } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { LatencyChart } from '@/components/LatencyChart';
import { StatsCard } from '@/components/StatsCard';
import { deleteSession, getSessionSamples, samplesToCsv } from '@/lib/db';
import { computeStats, windowSamples } from '@/lib/metrics';
import { Sample } from '@/lib/types';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);
  const [samples, setSamples] = useState<Sample[]>([]);

  useEffect(() => {
    if (sessionId) void getSessionSamples(sessionId).then(setSamples);
  }, [sessionId]);

  const stats1m = useMemo(() => computeStats(windowSamples(samples, 60_000)), [samples]);
  const statsSession = useMemo(() => computeStats(samples), [samples]);

  const onExport = async () => {
    const csv = samplesToCsv(samples);
    const fileUri = `${FileSystem.cacheDirectory}session-${sessionId}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' });
    }
  };

  const onClear = async () => {
    await deleteSession(sessionId);
    setSamples([]);
    Alert.alert('Session cleared');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Text style={{ fontWeight: '700', marginBottom: 8 }}>Session {sessionId}</Text>
      <Button title="Export CSV" onPress={() => void onExport()} />
      <Button title="Clear session" color="#dc2626" onPress={() => void onClear()} />
      <LatencyChart samples={samples} />
      <StatsCard title="1m" stats={stats1m} />
      <StatsCard title="Session" stats={statsSession} />
    </ScrollView>
  );
}
