import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function ChartCard({ colors, title, subtitle, children }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function VerticalBarChart({ colors, data, maxValue }) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.verticalWrap}>
      {data.map((item) => (
        <View key={item.label} style={styles.verticalItem}>
          <View style={[styles.verticalTrack, { backgroundColor: colors.card2, borderColor: colors.border }]}>
            <View style={[styles.verticalFill, { backgroundColor: colors.primary, height: `${Math.max((item.value / max) * 100, 6)}%` }]} />
          </View>
          <Text style={[styles.value, { color: colors.text }]}>{item.value}</Text>
          <Text style={[styles.axisLabel, { color: colors.muted }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function HorizontalBarChart({ colors, data, valueSuffix = '' }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ gap: 12 }}>
      {data.map((item) => (
        <View key={item.label}>
          <View style={styles.hHeader}>
            <Text style={[styles.hLabel, { color: colors.text }]}>{item.label}</Text>
            <Text style={[styles.hValue, { color: colors.muted }]}>{item.note || `${item.value}${valueSuffix}`}</Text>
          </View>
          <View style={[styles.hTrack, { backgroundColor: colors.card2 }]}>
            <View style={[styles.hFill, { backgroundColor: colors.primary, width: `${Math.max((item.value / max) * 100, 7)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function LineChart({ colors, data, valueKey = 'value', labelKey = 'label' }) {
  const width = 280;
  const height = 136;
  const pad = 18;
  const values = data.map((d) => Number(d[valueKey] || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = data.map((d, i) => {
    const x = pad + (i * (width - pad * 2)) / Math.max(data.length - 1, 1);
    const y = height - pad - ((Number(d[valueKey] || 0) - min) / range) * (height - pad * 2);
    return { x, y, item: d };
  });

  return (
    <View style={styles.lineWrap}>
      <View style={[styles.plot, { width, height, backgroundColor: colors.card2, borderColor: colors.border }]}> 
        {[0, 1, 2].map((line) => <View key={line} style={[styles.gridLine, { top: pad + line * ((height - pad * 2) / 2), backgroundColor: colors.border }]} />)}
        {points.slice(0, -1).map((p, i) => {
          const n = points[i + 1];
          const dx = n.x - p.x;
          const dy = n.y - p.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = `${Math.atan2(dy, dx)}rad`;
          return <View key={`${p.item[labelKey]}-${n.item[labelKey]}`} style={[styles.segment, { left: p.x, top: p.y, width: length, backgroundColor: colors.primary, transform: [{ rotate: angle }] }]} />;
        })}
        {points.map((p) => <View key={p.item[labelKey]} style={[styles.dot, { left: p.x - 5, top: p.y - 5, backgroundColor: colors.primary, borderColor: colors.card }]} />)}
      </View>
      <View style={styles.xLabels}>
        {data.map((d) => <Text key={d[labelKey]} style={[styles.axisLabel, { color: colors.muted }]}>{d[labelKey]}</Text>)}
      </View>
    </View>
  );
}

export function DonutLegend({ colors, data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <View style={styles.donutRow}>
      <View style={[styles.donut, { borderColor: colors.primary, backgroundColor: colors.card2 }]}>
        <Text style={[styles.donutText, { color: colors.text }]}>{total}</Text>
        <Text style={[styles.donutSub, { color: colors.muted }]}>total</Text>
      </View>
      <View style={{ flex: 1, gap: 10 }}>
        {data.map((item) => (
          <View key={item.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendLabel, { color: colors.text }]}>{item.label}</Text>
            <Text style={[styles.legendValue, { color: colors.muted }]}>{Math.round((item.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 26, padding: 18, borderWidth: 1, marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '900', letterSpacing: -0.2 },
  subtitle: { fontSize: 12, fontWeight: '700', marginTop: 4, marginBottom: 16, lineHeight: 18 },
  verticalWrap: { height: 190, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  verticalItem: { flex: 1, alignItems: 'center' },
  verticalTrack: { height: 120, width: '80%', borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 1 },
  verticalFill: { width: '100%', borderRadius: 12 },
  value: { fontWeight: '900', marginTop: 8, fontSize: 13 },
  axisLabel: { fontWeight: '800', fontSize: 10, marginTop: 3 },
  hHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 },
  hLabel: { flex: 1, fontWeight: '900', fontSize: 13 },
  hValue: { fontWeight: '900', fontSize: 12 },
  hTrack: { height: 12, borderRadius: 999, overflow: 'hidden' },
  hFill: { height: 12, borderRadius: 999 },
  lineWrap: { alignItems: 'center' },
  plot: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 12, right: 12, height: 1, opacity: 0.55 },
  segment: { position: 'absolute', height: 4, borderRadius: 999, transformOrigin: 'left center' },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 999, borderWidth: 2 },
  xLabels: { width: 290, flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donut: { width: 104, height: 104, borderRadius: 999, borderWidth: 14, alignItems: 'center', justifyContent: 'center' },
  donutText: { fontSize: 24, fontWeight: '900' },
  donutSub: { fontSize: 10, fontWeight: '800' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 9, height: 9, borderRadius: 999 },
  legendLabel: { flex: 1, fontWeight: '800', fontSize: 12 },
  legendValue: { fontWeight: '900', fontSize: 12 },
});
