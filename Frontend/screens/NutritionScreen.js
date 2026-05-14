import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { deleteFoodLog, fetchNutritionSummary, fetchNutritionTrends } from '../services/api';
import { getHighContrastPreference, theme } from '../services/accessibility';

const today = () => new Date().toISOString().slice(0, 10);

export default function NutritionScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highContrast, setHighContrast] = useState(false);

  const load = async () => {
    try {
      setError('');
      setHighContrast(await getHighContrastPreference());
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

  const colors = theme(highContrast);
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
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topRow}><Pressable onPress={() => navigation.navigate('Home')}><Ionicons name="arrow-back" size={26} color={colors.primary} /></Pressable><Text style={[styles.topTitle, { color: colors.text }]}>Nutrition</Text><View style={{ width: 26 }} /></View>

          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Ionicons name="nutrition-outline" size={30} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Today’s intake</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Log what you actually ate. Products scanned from Open Food Facts can auto-fill macros per 100 g.</Text>
          </View>

          <View style={styles.actions}>
            <Pressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('AddFood')}><Ionicons name="add" size={20} color={colors.primaryText} /><Text style={[styles.primaryText, { color: colors.primaryText }]}>Add Food</Text></Pressable>
            <Pressable style={[styles.secondary, { backgroundColor: colors.card, borderColor: colors.primary }]} onPress={() => navigation.navigate('GoalSetting')}><Ionicons name="flag-outline" size={20} color={colors.primary} /><Text style={[styles.secondaryText, { color: colors.primary }]}>Goals</Text></Pressable>
          </View>

          {loading ? <ActivityIndicator color={colors.primary} /> : error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Macro summary</Text>
              <Macro colors={colors} label="Calories" value={totals.calories} goal={goals.calories} unit="kcal" />
              <Macro colors={colors} label="Protein" value={totals.protein} goal={goals.protein} unit="g" />
              <Macro colors={colors} label="Carbs" value={totals.carbs} goal={goals.carbs} unit="g" />
              <Macro colors={colors} label="Fat" value={totals.fat} goal={goals.fat} unit="g" />
              <Text style={[styles.body, { color: colors.muted }]}>Unknown values are shown as missing/zero instead of guessed.</Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Food log</Text>
              {hasFoods ? items.map((item) => <View key={item.id} style={[styles.foodRow, { borderTopColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.foodName, { color: colors.text }]}>{item.food_name}</Text><Text style={[styles.body, { color: colors.muted }]}>{item.serving_size || 'Serving not set'} • {Math.round(item.calories || 0)} kcal</Text></View><Pressable onPress={() => remove(item.id)}><Ionicons name="trash-outline" size={22} color={colors.danger} /></Pressable></View>) : <EmptyState colors={colors} navigation={navigation} />}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <Text style={[styles.sectionTitle, { color: colors.text }]}>7-day calorie trend</Text>
              {trends.length ? trends.map((day) => <TrendRow key={day.date} colors={colors} day={day} goal={goals.calories || 2000} />) : <Text style={[styles.body, { color: colors.muted }]}>Log food on multiple days to see trends.</Text>}
            </View>
          </>}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function EmptyState({ colors, navigation }) {
  return <View style={[styles.empty, { backgroundColor: colors.card2, borderColor: colors.border }]}><Ionicons name="restaurant-outline" size={28} color={colors.primary} /><Text style={[styles.foodName, { color: colors.text }]}>No food logged yet</Text><Text style={[styles.body, { color: colors.muted, textAlign: 'center' }]}>Add a scanned product or manual food to make this page useful.</Text><Pressable style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('AddFood')}><Text style={[styles.primaryText, { color: colors.primaryText }]}>Add first food</Text></Pressable></View>;
}

function Macro({ colors, label, value = 0, goal = 1, unit }) {
  const pct = Math.min((Number(value || 0) / Math.max(Number(goal || 1), 1)) * 100, 100);
  return <View style={styles.macro}><View style={styles.macroHeader}><Text style={[styles.macroLabel, { color: colors.text }]}>{label}</Text><Text style={[styles.macroValue, { color: colors.primary }]}>{Math.round(value || 0)} / {Math.round(goal || 0)} {unit}</Text></View><View style={[styles.track, { backgroundColor: colors.card2 }]}><View style={[styles.fill, { backgroundColor: colors.primary, width: `${pct}%` }]} /></View></View>;
}

function TrendRow({ colors, day, goal }) {
  const pct = Math.min(((day.calories || 0) / Math.max(goal, 1)) * 100, 100);
  return <View style={styles.trendRow}><Text style={[styles.trendDate, { color: colors.text }]}>{day.date.slice(5)}</Text><View style={[styles.track, { backgroundColor: colors.card2, flex: 1 }]}><View style={[styles.fill, { backgroundColor: colors.primary, width: `${pct}%` }]} /></View><Text style={[styles.trendValue, { color: colors.muted }]}>{Math.round(day.calories || 0)}</Text></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { padding: 20, paddingBottom: 40 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, topTitle: { fontSize: 22, fontWeight: '900' },
  hero: { borderWidth: 1, borderRadius: 26, padding: 18, marginBottom: 14 }, title: { fontSize: 28, fontWeight: '900', marginTop: 8 }, subtitle: { fontWeight: '700', lineHeight: 22, marginTop: 5 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 14 }, primary: { flex: 1, paddingVertical: 15, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, primaryText: { fontWeight: '900' }, secondary: { flex: 1, borderWidth: 2, paddingVertical: 15, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, secondaryText: { fontWeight: '900' },
  card: { borderRadius: 22, padding: 16, borderWidth: 1, marginBottom: 14 }, sectionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 12 }, body: { fontWeight: '700', lineHeight: 20 },
  macro: { marginBottom: 13 }, macroHeader: { flexDirection: 'row', justifyContent: 'space-between' }, macroLabel: { fontWeight: '900' }, macroValue: { fontWeight: '900' }, track: { height: 12, borderRadius: 999, overflow: 'hidden', marginTop: 7 }, fill: { height: 12, borderRadius: 999 },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12, marginTop: 12, gap: 10 }, foodName: { fontWeight: '900', fontSize: 15 }, empty: { alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 16, gap: 7 }, smallBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, marginTop: 6 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }, trendDate: { width: 45, fontWeight: '900' }, trendValue: { width: 44, textAlign: 'right', fontWeight: '900' }, error: { fontWeight: '900' },
});
