import { VictoryAxis, VictoryChart, VictoryLine, VictoryScatter, VictoryTheme } from 'victory-native';
import { Sample } from '@/lib/types';

export function LatencyChart({ samples }: { samples: Sample[] }) {
  const success = samples.filter((s) => s.success && s.latencyMs !== null).map((s) => ({ x: new Date(s.timestamp), y: s.latencyMs as number }));
  const loss = samples.filter((s) => !s.success).map((s) => ({ x: new Date(s.timestamp), y: 0 }));

  return (
    <VictoryChart theme={VictoryTheme.material} scale={{ x: 'time' }} height={260}>
      <VictoryAxis fixLabelOverlap tickFormat={(t) => `${t.getMinutes()}:${String(t.getSeconds()).padStart(2, '0')}`} />
      <VictoryAxis dependentAxis tickFormat={(t) => `${t}ms`} />
      <VictoryLine data={success} interpolation="monotoneX" />
      <VictoryScatter data={loss} size={3} style={{ data: { fill: '#ef4444' } }} />
    </VictoryChart>
  );
}
