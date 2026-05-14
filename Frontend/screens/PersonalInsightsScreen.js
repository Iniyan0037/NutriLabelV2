import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchPersonalInsights } from '../services/api';
import { getHighContrastPreference, theme } from '../services/accessibility';

export default function PersonalInsightsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highContrast, setHighContrast] = useState(false);

  const load = async () => {
    try {
      setError('');
      setHighContrast(await getHighContrastPreference());
      setData(await fetchPersonalInsights());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const colors = theme(highContrast);
  const breakdown = data?.result_breakdown || {};
  const maxBreakdown = Math.max(...['Safe', 'Uncertain', 'Restricted'].map((key) => Number(breakdown[key] || 0)), 1);

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topRow}><Pressable onPress={() => navigation.navigate('AwarenessDashboard')}><Ionicons name="arrow-back" size={26} color={colors.primary} /></Pressable><Text style={[styles.topTitle, { color: colors.text }]}>Personal Insights</Text><View style={{ width: 26 }} /></View>
          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="person-outline" size={28} color={colors.primary} /><Text style={[styles.title, { color: colors.text }]}>Your scan patterns</Text><Text style={[styles.subtitle, { color: colors.muted }]}>This page becomes useful after you analyse products under the active profile.</Text></View>
          {loading ? <ActivityIndicator color={colors.primary} /> : error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : !data?.has_data ? <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>No insights yet</Text><Text style={[styles.body, { color: colors.muted }]}>{data?.message || 'Analyse products to see personal awareness insights.'}</Text><Pressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Scan')}><Text style={[styles.primaryText, { color: colors.primaryText }]}>Scan Product</Text></Pressable></View> : <>
            <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.score, { color: colors.primary }]}>{data.safety_score}%</Text><Text style={[styles.sectionTitle, { color: colors.text }]}>Safety Score</Text><Text style={[styles.body, { color: colors.muted }]}>Based on {data.total_scans} saved results for the active profile.</Text></View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>Result Breakdown</Text>{['Safe', 'Uncertain', 'Restricted'].map((key) => <View key={key} style={styles.chartRow}><View style={styles.chartHeader}><Text style={[styles.rowLabel, { color: colors.text }]}>{key}</Text><Text style={[styles.rowValue, { color: colors.primary }]}>{breakdown[key] || 0}</Text></View><View style={[styles.track, { backgroundColor: colors.card2 }]}><View style={[styles.fill, { width: `${Math.max(((breakdown[key] || 0) / maxBreakdown) * 100, breakdown[key] ? 8 : 0)}%`, backgroundColor: colors.primary }]} /></View></View>)}</View>
            <List colors={colors} title="Common Restricted Ingredients" items={data.top_restricted_ingredients} />
            <List colors={colors} title="Common Uncertain Ingredients" items={data.top_uncertain_ingredients} />
          </>}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function List({ colors, title, items = [] }) {
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>{items.length ? items.map((item) => <View key={item.name} style={[styles.row, { borderTopColor: colors.border }]}><Text style={[styles.rowLabel, { color: colors.text }]}>{item.name}</Text><Text style={[styles.rowValue, { color: colors.primary }]}>{item.count}x</Text></View>) : <Text style={[styles.body, { color: colors.muted }]}>No repeated items found.</Text>}</View>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, container: { padding: 20, paddingBottom: 40 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, topTitle: { fontSize: 22, fontWeight: '900' }, hero: { borderWidth: 1, borderRadius: 24, padding: 18, marginBottom: 14 }, title: { fontSize: 27, fontWeight: '900', marginTop: 8 }, subtitle: { fontWeight: '700', lineHeight: 22, marginTop: 6 }, card: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 14 }, scoreCard: { borderRadius: 24, padding: 22, borderWidth: 1, marginBottom: 14, alignItems: 'center' }, score: { fontSize: 46, fontWeight: '900' }, sectionTitle: { fontSize: 19, fontWeight: '900', marginBottom: 8 }, body: { fontWeight: '700', lineHeight: 20 }, row: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10, marginTop: 10 }, rowLabel: { fontWeight: '900', textTransform: 'capitalize' }, rowValue: { fontWeight: '900' }, primary: { paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginTop: 14 }, primaryText: { fontWeight: '900' }, error: { fontWeight: '900' }, chartRow: { marginTop: 10 }, chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }, track: { height: 12, borderRadius: 999, overflow: 'hidden' }, fill: { height: 12, borderRadius: 999 } });
