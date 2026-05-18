import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { deleteFoodLog, fetchNutritionSummary, fetchNutritionTrends } from '../services/api';
import AppScaffold from '../components/AppScaffold';
import MotionPressable from '../components/MotionPressable';
import { LineChart } from '../components/Charts';

const today = () => new Date().toISOString().slice(0, 10);

export default function NutritionScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTrend, setSelectedTrend] = useState(null);

  const load = async () => {
    try {
      setError('');
      const s = await fetchNutritionSummary(today());
      setSummary(s);
      const t = await fetchNutritionTrends(7);
      setTrends(t.trends || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const remove = async (id) => {
    const ok = Platform.OS === 'web' ? window.confirm('Remove this food from today?') : true;
    if (!ok) return;
    try { await deleteFoodLog(id); await load(); } catch (e) { Platform.OS === 'web' ? window.alert(e.message) : Alert.alert('Delete failed', e.message); }
  };

  const totals = summary?.totals || {};
  const goals = summary?.goals || {};
  const items = summary?.items || [];
  const hasFoods = items.length > 0;

  return (
    <AppScaffold navigation={navigation} current="Nutrition" title="Track">
      {({ colors }) => (
        <>
          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Ionicons name="nutrition-outline" size={30} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Today’s intake</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Log only what you actually ate. Scanned products can auto-fill macros per 100 g.</Text>
          </View>

          <View style={styles.actions}>
            <MotionPressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('AddFood')}><Ionicons name="add" size={20} color={colors.primaryText} /><Text style={[styles.primaryText, { color: colors.primaryText }]}>Add Food</Text></MotionPressable>
            <MotionPressable style={[styles.secondary, { backgroundColor: colors.card, borderColor: colors.primary }]} onPress={() => navigation.navigate('GoalSetting')}><Ionicons name="flag-outline" size={20} color={colors.primary} /><Text style={[styles.secondaryText, { color: colors.primary }]}>Goals</Text></MotionPressable>
          </View>

          {loading ? <ActivityIndicator color={colors.primary} /> : error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Macro summary</Text>
              <Macro colors={colors} label="Calories" value={totals.calories} goal={goals.calories} unit="kcal" />
              <Macro colors={colors} label="Protein" value={totals.protein} goal={goals.protein} unit="g" />
              <Macro colors={colors} label="Carbs" value={totals.carbs} goal={goals.carbs} unit="g" />
              <Macro colors={colors} label="Fat" value={totals.fat} goal={goals.fat} unit="g" />
              <Text style={[styles.body, { color: colors.muted }]}>Missing values are excluded instead of guessed.</Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Food log</Text>
              {hasFoods ? items.map((item) => <View key={item.id} style={[styles.foodRow, { borderTopColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.foodName, { color: colors.text }]}>{item.food_name}</Text><Text style={[styles.body, { color: colors.muted }]}>{item.serving_size || 'Serving not set'} • {Math.round(item.calories || 0)} kcal</Text></View><MotionPressable onPress={() => remove(item.id)}><Ionicons name="trash-outline" size={22} color={colors.danger} /></MotionPressable></View>) : <EmptyState colors={colors} navigation={navigation} />}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <Text style={[styles.sectionTitle, { color: colors.text }]}>7-day calorie trend</Text>
              {trends.length ? <CalorieTrend colors={colors} trends={trends} goal={goals.calories || 2000} selectedTrend={selectedTrend} setSelectedTrend={setSelectedTrend} /> : <Text style={[styles.body, { color: colors.muted }]}>Log food on multiple days to see trends.</Text>}
            </View>
          </>}
        </>
      )}
    </AppScaffold>
  );
}

function EmptyState({ colors, navigation }) {
  return <View style={[styles.empty, { backgroundColor: colors.card2, borderColor: colors.border }]}><Ionicons name="restaurant-outline" size={28} color={colors.primary} /><Text style={[styles.foodName, { color: colors.text }]}>No food logged yet</Text><Text style={[styles.body, { color: colors.muted, textAlign: 'center' }]}>Add a scanned product or manual food to make this page useful.</Text><MotionPressable style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('AddFood')}><Text style={[styles.primaryText, { color: colors.primaryText }]}>Add first food</Text></MotionPressable></View>;
}

function Macro({ colors, label, value = 0, goal = 1, unit }) {
  const pct = Math.min((Number(value || 0) / Math.max(Number(goal || 1), 1)) * 100, 100);
  return <View style={styles.macro}><View style={styles.macroHeader}><Text style={[styles.macroLabel, { color: colors.text }]}>{label}</Text><Text style={[styles.macroValue, { color: colors.primary }]}>{Math.round(value || 0)} / {Math.round(goal || 0)} {unit}</Text></View><View style={[styles.track, { backgroundColor: colors.card2 }]}><View style={[styles.fill, { backgroundColor: colors.primary, width: `${pct}%` }]} /></View></View>;
}

function CalorieTrend({ colors, trends, goal, selectedTrend, setSelectedTrend }) {
  const data = trends.map((day) => ({ label: day.date.slice(5), value: Math.round(day.calories || 0) }));
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const average = Math.round(total / Math.max(data.length, 1));
  const highest = data.reduce((best, item) => item.value > best.value ? item : best, data[0] || { label: '-', value: 0 });
  const chosen = selectedTrend || data[data.length - 1] || highest;
  return (
    <View>
      <View style={styles.trendStats}>
        <View style={[styles.trendStatCard, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
          <Text style={[styles.trendStatValue, { color: colors.primary }]}>{average}</Text>
          <Text style={[styles.trendStatLabel, { color: colors.muted }]}>avg kcal/day</Text>
        </View>
        <View style={[styles.trendStatCard, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
          <Text style={[styles.trendStatValue, { color: colors.primary }]}>{highest.value}</Text>
          <Text style={[styles.trendStatLabel, { color: colors.muted }]}>peak on {highest.label}</Text>
        </View>
      </View>
      <LineChart colors={colors} data={data} selectedLabel={chosen?.label} onPointPress={setSelectedTrend} />
      <View style={[styles.selectedTrend, { backgroundColor: colors.card2, borderColor: colors.border }]}>
        <Ionicons name="analytics-outline" size={20} color={colors.primary} />
        <Text style={[styles.selectedTrendText, { color: colors.text }]}>{chosen?.label || '-'}: {chosen?.value || 0} kcal</Text>
      </View>
      <Text style={[styles.body, { color: colors.muted, marginTop: 10 }]}>Goal reference: {Math.round(goal)} kcal/day.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { padding: 20, paddingBottom: 40 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, topTitle: { fontSize: 22, fontWeight: '900' },
  hero: { borderWidth: 1, borderRadius: 26, padding: 18, marginBottom: 14 }, title: { fontSize: 28, fontWeight: '900', marginTop: 8 }, subtitle: { fontWeight: '700', lineHeight: 22, marginTop: 5 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 14 }, primary: { flex: 1, paddingVertical: 15, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, primaryText: { fontWeight: '900' }, secondary: { flex: 1, borderWidth: 2, paddingVertical: 15, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, secondaryText: { fontWeight: '900' },
  card: { borderRadius: 22, padding: 16, borderWidth: 1, marginBottom: 14 }, sectionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 12 }, body: { fontWeight: '700', lineHeight: 20 },
  macro: { marginBottom: 13 }, macroHeader: { flexDirection: 'row', justifyContent: 'space-between' }, macroLabel: { fontWeight: '900' }, macroValue: { fontWeight: '900' }, track: { height: 12, borderRadius: 999, overflow: 'hidden', marginTop: 7 }, fill: { height: 12, borderRadius: 999 },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12, marginTop: 12, gap: 10 }, foodName: { fontWeight: '900', fontSize: 15 }, empty: { alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 16, gap: 7 }, smallBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, marginTop: 6 },
  trendStats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  trendStatCard: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 12, alignItems: 'center' },
  trendStatValue: { fontSize: 22, fontWeight: '900' },
  trendStatLabel: { fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 3 },
  selectedTrend: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 12, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  selectedTrendText: { fontSize: 14, fontWeight: '900' },
  error: { fontWeight: '900' },
});
