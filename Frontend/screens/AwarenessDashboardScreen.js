import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAllergenDashboard } from '../services/api';
import { getHighContrastPreference, theme } from '../services/accessibility';

const ALLERGEN_RECALLS = [
  { year: '2021', recalls: 38, percent: 48 },
  { year: '2022', recalls: 29, percent: 39 },
  { year: '2023', recalls: 41, percent: 47 },
  { year: '2024', recalls: 54, percent: 57 },
  { year: '2025', recalls: 35, percent: 38 },
];

const DETECTION_TOTALS = [
  { label: 'Customer complaints', value: 91 },
  { label: 'Company testing', value: 28 },
  { label: 'Government testing', value: 25 },
  { label: 'Retailer complaints', value: 10 },
  { label: 'Other / unknown', value: 43 },
];

const FOOD_TYPES = [
  { label: 'Mixed / processed foods', value: 65, note: '33%' },
  { label: 'Breads and bakery', value: 31, note: '16%' },
  { label: 'Confectionery', value: 28, note: '14%' },
];

export default function AwarenessDashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highContrast, setHighContrast] = useState(false);

  const load = async () => {
    try {
      setError('');
      setHighContrast(await getHighContrastPreference());
      setData(await fetchAllergenDashboard());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const colors = theme(highContrast);
  const allergens = data?.allergens || [];
  const maxAllergen = Math.max(...allergens.map((a) => Number(String(a.prevalence_percent || '1').match(/[0-9.]+/)?.[0] || 1)), 1);

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <Header colors={colors} navigation={navigation} />

          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={[styles.heroIcon, { backgroundColor: colors.card2, borderColor: colors.border }]}><Ionicons name="analytics-outline" size={28} color={colors.primary} /></View>
            <Text style={[styles.title, { color: colors.text }]}>Australian food-risk insights</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Use these charts before shopping: recalls show why allergen labels and ingredient changes matter.</Text>
          </View>

          <View style={styles.actionRow}>
            <Action colors={colors} label="Additives" icon="flask-outline" onPress={() => navigation.navigate('AdditiveInfo')} />
            <Action colors={colors} label="My Insights" icon="person-outline" onPress={() => navigation.navigate('PersonalInsights')} />
            <Action colors={colors} label="Tips" icon="bulb-outline" onPress={() => navigation.navigate('AwarenessTips')} />
          </View>

          <KpiRow colors={colors} />

          <ChartCard colors={colors} title="Undeclared allergen recalls in Australia" subtitle="FSANZ 2021–2025 recall statistics">
            <BarChart colors={colors} data={ALLERGEN_RECALLS.map((d) => ({ label: d.year, value: d.recalls, helper: `${d.percent}% of recalls` }))} max={54} />
            <Text style={[styles.note, { color: colors.muted }]}>Peak year shown: 2024 with 54 undeclared allergen recalls.</Text>
          </ChartCard>

          <ChartCard colors={colors} title="How allergen problems are found" subtitle="FSANZ detection totals for 2021–2025">
            <HorizontalChart colors={colors} data={DETECTION_TOTALS} />
          </ChartCard>

          <ChartCard colors={colors} title="Food types most involved" subtitle="Undeclared allergen recalls by food type, 2021–2025">
            <HorizontalChart colors={colors} data={FOOD_TYPES} />
          </ChartCard>

          {loading ? <ActivityIndicator color={colors.primary} /> : error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : (
            <ChartCard colors={colors} title="Common allergen categories in NutriLabel" subtitle={data?.source || 'Internal awareness dataset'}>
              {allergens.length ? allergens.map((item) => {
                const val = Number(String(item.prevalence_percent || '1').match(/[0-9.]+/)?.[0] || 1);
                return (
                  <View key={item.id} style={styles.barRow}>
                    <View style={styles.barHeader}>
                      <Text style={[styles.barLabel, { color: colors.text }]}>{item.icon_label || item.allergen_name}</Text>
                      <Text style={[styles.barValue, { color: colors.muted }]}>{item.severity}</Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.card2 }]}><View style={[styles.fill, { backgroundColor: colors.primary, width: `${Math.max((val / maxAllergen) * 100, 10)}%` }]} /></View>
                    <Text style={[styles.note, { color: colors.muted }]}>{item.description}</Text>
                  </View>
                );
              }) : <Text style={[styles.note, { color: colors.muted }]}>No allergen data available.</Text>}
            </ChartCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Header({ colors, navigation }) {
  return <View style={styles.topRow}><Pressable onPress={() => navigation.navigate('Home')}><Ionicons name="arrow-back" size={26} color={colors.primary} /></Pressable><Text style={[styles.topTitle, { color: colors.text }]}>Awareness</Text><View style={{ width: 26 }} /></View>;
}

function KpiRow({ colors }) {
  const items = [
    { value: '197', label: 'allergen recalls 2021–2025' },
    { value: '57%', label: 'of 2024 recalls were allergen-related' },
    { value: '91', label: 'found by customer complaints' },
  ];
  return <View style={styles.kpiRow}>{items.map((item) => <View key={item.label} style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.kpiValue, { color: colors.primary }]}>{item.value}</Text><Text style={[styles.kpiLabel, { color: colors.muted }]}>{item.label}</Text></View>)}</View>;
}

function Action({ colors, label, icon, onPress }) {
  return <Pressable style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress}><Ionicons name={icon} size={23} color={colors.primary} /><Text style={[styles.actionText, { color: colors.text }]}>{label}</Text></Pressable>;
}

function ChartCard({ colors, title, subtitle, children }) {
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.cardSub, { color: colors.muted }]}>{subtitle}</Text>{children}</View>;
}

function BarChart({ colors, data, max }) {
  return <View style={styles.columnChart}>{data.map((item) => <View key={item.label} style={styles.columnItem}><View style={[styles.columnTrack, { backgroundColor: colors.card2 }]}><View style={[styles.columnFill, { height: `${Math.max((item.value / max) * 100, 8)}%`, backgroundColor: colors.primary }]} /></View><Text style={[styles.columnValue, { color: colors.text }]}>{item.value}</Text><Text style={[styles.columnLabel, { color: colors.muted }]}>{item.label}</Text></View>)}</View>;
}

function HorizontalChart({ colors, data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return <View>{data.map((item) => <View key={item.label} style={styles.hRow}><View style={styles.barHeader}><Text style={[styles.barLabel, { color: colors.text }]}>{item.label}</Text><Text style={[styles.barValue, { color: colors.muted }]}>{item.note || item.value}</Text></View><View style={[styles.track, { backgroundColor: colors.card2 }]}><View style={[styles.fill, { backgroundColor: colors.primary, width: `${Math.max((item.value / max) * 100, 8)}%` }]} /></View></View>)}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  topTitle: { fontSize: 22, fontWeight: '900' },
  hero: { borderRadius: 26, padding: 18, borderWidth: 1, marginBottom: 14 },
  heroIcon: { width: 50, height: 50, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '900', lineHeight: 34 },
  subtitle: { fontSize: 15, fontWeight: '700', lineHeight: 22, marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  action: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 12, alignItems: 'center', gap: 6 },
  actionText: { fontWeight: '900', fontSize: 12, textAlign: 'center' },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kpi: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 12 },
  kpiValue: { fontSize: 22, fontWeight: '900' },
  kpiLabel: { fontSize: 11, fontWeight: '800', lineHeight: 16, marginTop: 4 },
  card: { borderRadius: 24, padding: 18, borderWidth: 1, marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  cardSub: { fontSize: 12, fontWeight: '700', marginTop: 3, marginBottom: 14 },
  columnChart: { height: 190, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  columnItem: { flex: 1, alignItems: 'center' },
  columnTrack: { height: 120, width: '78%', borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end' },
  columnFill: { width: '100%', borderRadius: 12 },
  columnValue: { fontWeight: '900', marginTop: 8 },
  columnLabel: { fontWeight: '800', fontSize: 11, marginTop: 2 },
  hRow: { marginBottom: 12 },
  barRow: { marginTop: 14 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  barLabel: { fontWeight: '900', flex: 1 },
  barValue: { fontWeight: '800' },
  track: { height: 12, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 12, borderRadius: 999 },
  note: { fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 8 },
  error: { fontWeight: '900' },
});
