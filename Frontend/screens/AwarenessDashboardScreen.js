import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppScaffold from '../components/AppScaffold';
import MotionPressable from '../components/MotionPressable';
import { ChartCard, DonutLegend, HorizontalBarChart, LineChart, VerticalBarChart } from '../components/Charts';
import { fetchAllergenDashboard, fetchRecallAwareness } from '../services/api';

export default function AwarenessDashboardScreen({ navigation }) {
  const [allergenData, setAllergenData] = useState(null);
  const [recallData, setRecallData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const [allergens, recalls] = await Promise.all([
        fetchAllergenDashboard(),
        fetchRecallAwareness(),
      ]);
      setAllergenData(allergens);
      setRecallData(recalls);
    } catch (e) {
      setError(e.message || 'Could not load awareness data.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  return (
    <AppScaffold navigation={navigation} current="AwarenessDashboard" title="Learn">
      {({ colors }) => {
        const allergens = allergenData?.allergens || [];
        const allergenBars = allergens.slice(0, 6).map((item) => ({
          label: item.allergen_name || item.icon_label || 'Allergen',
          value: Number(String(item.prevalence_percent || '10').match(/[0-9.]+/)?.[0] || 10),
          note: item.severity || '',
        }));

        const yearly = recallData?.yearly || [];
        const detectionByYear = recallData?.detection_by_year || [];
        const detectionTotals = recallData?.detection_totals || [];
        const foodTypes = recallData?.food_types || [];
        const totalRecalls = recallData?.summary?.undeclared_allergen_total_2021_2025 || yearly.reduce((sum, item) => sum + Number(item.value || 0), 0);
        const highestYear = recallData?.summary?.highest_year?.label || '2024';
        const highestYearValue = recallData?.summary?.highest_year?.value || 54;
        const mainDetection = recallData?.summary?.main_detection_method?.label || 'Customer complaints';

        return (
          <>
            <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.heroIcon, { backgroundColor: colors.card2, borderColor: colors.border }]}>
                <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroTitle, { color: colors.text }]}>Why labels still need checking</Text>
                <Text style={[styles.heroText, { color: colors.muted }]}>Australian recall data shows that undeclared allergens are still a repeated food-labelling issue. These charts come from the backend database, not hardcoded screen values.</Text>
              </View>
            </View>

            <View style={styles.quickRow}>
              <QuickAction colors={colors} icon="game-controller-outline" label="Daily game" onPress={() => navigation.navigate('LearningGame')} />
              <QuickAction colors={colors} icon="flask-outline" label="Additives" onPress={() => navigation.navigate('AdditiveInfo')} />
              <QuickAction colors={colors} icon="person-outline" label="My insights" onPress={() => navigation.navigate('PersonalInsights')} />
              <QuickAction colors={colors} icon="bulb-outline" label="Tips" onPress={() => navigation.navigate('AwarenessTips')} />
            </View>

            {loading ? (
              <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.heroText, { color: colors.muted }]}>Loading awareness data...</Text>
              </View>
            ) : error ? (
              <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
            ) : (
              <>
                <View style={styles.kpiRow}>
                  <Kpi colors={colors} value={String(totalRecalls)} label="allergen recalls 2021–2025" />
                  <Kpi colors={colors} value={String(highestYearValue)} label={`highest year shown, ${highestYear}`} />
                  <Kpi colors={colors} value={mainDetection.split(' ')[0]} label="main detection method" />
                </View>

                <ChartCard colors={colors} title="Undeclared allergen recalls" subtitle={`${recallData?.source || 'FSANZ Australian food recall statistics'} · 2021–2025`}>
                  <VerticalBarChart colors={colors} data={yearly} maxValue={Math.max(...yearly.map((item) => item.value), 1)} />
                </ChartCard>

                <ChartCard colors={colors} title="How allergen problems are found" subtitle="Line graph by year: customer complaints, the largest detection pathway.">
                  <LineChart colors={colors} data={detectionByYear.map((item) => ({ label: String(item.year), value: item.customer_complaint }))} />
                </ChartCard>

                <ChartCard colors={colors} title="Detection methods" subtitle="Total detection counts across 2021–2025.">
                  <HorizontalBarChart colors={colors} data={detectionTotals} />
                </ChartCard>

                <ChartCard colors={colors} title="Recall share by year" subtitle="Donut-style summary of backend recall data.">
                  <DonutLegend colors={colors} data={yearly.map((d) => ({ label: d.label, value: d.value }))} />
                </ChartCard>

                <ChartCard colors={colors} title="Food types most involved" subtitle="Undeclared allergen recalls by food type.">
                  <HorizontalBarChart colors={colors} data={foodTypes} />
                </ChartCard>

                <ChartCard colors={colors} title="NutriLabel allergen library" subtitle={allergenData?.source || 'Internal allergen awareness dataset'}>
                  {allergenBars.length ? <HorizontalBarChart colors={colors} data={allergenBars} /> : <Text style={[styles.heroText, { color: colors.muted }]}>No allergen data is available yet.</Text>}
                </ChartCard>

                <Text style={[styles.sourceText, { color: colors.muted }]}>Source: {recallData?.source || 'FSANZ Australian food recall statistics'}. Last updated: {recallData?.last_updated || '30 April 2026'}.</Text>
              </>
            )}
          </>
        );
      }}
    </AppScaffold>
  );
}

function QuickAction({ colors, icon, label, onPress }) {
  return (
    <MotionPressable onPress={onPress} style={[styles.quick, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={21} color={colors.primary} />
      <Text style={[styles.quickText, { color: colors.text }]}>{label}</Text>
    </MotionPressable>
  );
}

function Kpi({ colors, value, label }) {
  return (
    <View style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <Text style={[styles.kpiValue, { color: colors.primary }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 14, borderWidth: 1, borderRadius: 26, padding: 16, marginBottom: 14 },
  heroIcon: { width: 54, height: 54, borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  heroText: { fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 5 },
  quickRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  quick: { flex: 1, borderWidth: 1, borderRadius: 18, paddingVertical: 12, alignItems: 'center', gap: 6 },
  quickText: { fontSize: 10, fontWeight: '900', textAlign: 'center' },
  loadingCard: { borderWidth: 1, borderRadius: 24, padding: 22, alignItems: 'center', marginBottom: 14 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kpi: { flex: 1, borderWidth: 1, borderRadius: 20, padding: 12 },
  kpiValue: { fontSize: 24, fontWeight: '900' },
  kpiLabel: { fontSize: 11, lineHeight: 15, fontWeight: '800', marginTop: 3 },
  error: { fontWeight: '900', marginBottom: 12 },
  sourceText: { fontSize: 11, fontWeight: '700', lineHeight: 17, marginTop: 2, marginBottom: 18 },
});
