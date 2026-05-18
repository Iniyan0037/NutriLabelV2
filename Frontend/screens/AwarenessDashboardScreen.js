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
  const [selectedDetectionYear, setSelectedDetectionYear] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
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
        const detectionLineData = detectionByYear.map((item) => ({ label: String(item.year), value: item.customer_complaint }));
        const selectedDetection = selectedDetectionYear || detectionLineData[detectionLineData.length - 1];

        return (
          <>
            <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <View style={[styles.heroIcon, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
                <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitle, { color: colors.text }]}>Food label awareness</Text>
                <Text style={[styles.heroText, { color: colors.muted }]}>Use Australian recall data and profile tools to spot label risks before shopping.</Text>
              </View>
            </View>

            <View style={styles.quickGrid}>
              <QuickAction colors={colors} icon="game-controller-outline" label="Daily game" onPress={() => navigation.navigate('LearningGame')} />
              <QuickAction colors={colors} icon="flask-outline" label="Additives" onPress={() => navigation.navigate('AdditiveInfo')} />
              <QuickAction colors={colors} icon="person-outline" label="Insights" onPress={() => navigation.navigate('PersonalInsights')} />
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
                  <Kpi colors={colors} value={String(totalRecalls)} label="Allergen recalls" />
                  <Kpi colors={colors} value={String(highestYearValue)} label={`Peak in ${highestYear}`} />
                  <Kpi colors={colors} value="Customer reports" label="Top detection method" />
                </View>

                <ChartCard colors={colors} title="Undeclared allergen recalls" subtitle="Australia, 2021–2025">
                  <VerticalBarChart colors={colors} data={yearly} maxValue={Math.max(...yearly.map((item) => item.value), 1)} />
                </ChartCard>

                <ChartCard colors={colors} title="How allergen problems are found" subtitle="Tap a year to see the number of customer-reported detections.">
                  <LineChart
                    colors={colors}
                    data={detectionLineData}
                    selectedLabel={selectedDetection?.label}
                    onPointPress={(item) => setSelectedDetectionYear(item)}
                  />
                  {selectedDetection ? (
                    <View style={[styles.selectedPoint, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
                      <Text style={[styles.selectedPointValue, { color: colors.primary }]}>{selectedDetection.value}</Text>
                      <Text style={[styles.selectedPointText, { color: colors.muted }]}>customer-reported detections in {selectedDetection.label}</Text>
                    </View>
                  ) : null}
                </ChartCard>

                <ChartCard colors={colors} title="Detection methods" subtitle="How recalls were first identified.">
                  <HorizontalBarChart colors={colors} data={detectionTotals} />
                </ChartCard>

                <ChartCard colors={colors} title="Recall share by year">
                  <DonutLegend colors={colors} data={yearly.map((d) => ({ label: d.label, value: d.value }))} />
                </ChartCard>

                <ChartCard colors={colors} title="Food types most involved" subtitle="Undeclared allergen recalls by food type.">
                  <HorizontalBarChart colors={colors} data={foodTypes} />
                </ChartCard>

                <ChartCard colors={colors} title="NutriLabel allergen library" subtitle="Common allergen categories used by the app.">
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
    <MotionPressable onPress={onPress} scaleTo={1.035} style={[styles.quick, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text numberOfLines={2} style={[styles.quickText, { color: colors.text }]}>{label}</Text>
    </MotionPressable>
  );
}

function Kpi({ colors, value, label }) {
  return (
    <View style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.kpiValue, { color: colors.primary }]}>{value}</Text>
      <Text numberOfLines={2} style={[styles.kpiLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 26, padding: 16, marginBottom: 14 },
  heroIcon: { width: 54, height: 54, borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  heroText: { fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 5 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  quick: { flexGrow: 1, flexBasis: '23%', minWidth: 130, height: 88, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', gap: 7 },
  quickText: { fontSize: 12, lineHeight: 15, fontWeight: '900', textAlign: 'center' },
  loadingCard: { borderWidth: 1, borderRadius: 24, padding: 22, alignItems: 'center', marginBottom: 14 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpi: { flex: 1, minWidth: 150, minHeight: 86, borderWidth: 1, borderRadius: 20, padding: 12, justifyContent: 'center' },
  kpiValue: { fontSize: 19, lineHeight: 23, fontWeight: '900' },
  kpiLabel: { fontSize: 11, lineHeight: 15, fontWeight: '800', marginTop: 3 },
  error: { fontWeight: '900', marginBottom: 12 },
  selectedPoint: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 12, alignItems: 'center' },
  selectedPointValue: { fontSize: 24, fontWeight: '900' },
  selectedPointText: { fontSize: 12, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  sourceText: { fontSize: 11, fontWeight: '700', lineHeight: 17, marginTop: 2, marginBottom: 18 },
});
