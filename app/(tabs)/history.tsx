import { useEffect, useState } from 'react';
import { ScrollView, Text, View, Button } from 'react-native';
import { Link } from 'expo-router';
import { listSessions } from '@/lib/db';
import { Session } from '@/lib/types';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    void listSessions().then(setSessions);
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Button title="Refresh" onPress={() => void listSessions().then(setSessions)} />
      {sessions.map((s) => (
        <View key={s.id} style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 10, marginTop: 8 }}>
          <Text style={{ fontWeight: '700' }}>{s.target}</Text>
          <Text>{s.mode.toUpperCase()} • {new Date(s.startedAt).toLocaleString()}</Text>
          <Link href={`/history/${s.id}`}>Open details</Link>
        </View>
      ))}
      {!sessions.length && <Text>No saved sessions yet.</Text>}
    </ScrollView>
  );
}
