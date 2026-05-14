import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchNutritionGoals, updateNutritionGoals } from '../services/api';
import { getHighContrastPreference, theme } from '../services/accessibility';

function validNumber(value) { const n = Number(value); return Number.isFinite(n) && n > 0; }

export default function GoalSettingScreen({ navigation }) {
  const [calories, setCalories] = useState('2000');
  const [protein, setProtein] = useState('80');
  const [carbs, setCarbs] = useState('250');
  const [fat, setFat] = useState('70');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    Promise.all([fetchNutritionGoals(), getHighContrastPreference()]).then(([g, hc]) => {
      setHighContrast(hc);
      setCalories(String(Math.round(g.calories || 2000)));
      setProtein(String(Math.round(g.protein || 80)));
      setCarbs(String(Math.round(g.carbs || 250)));
      setFat(String(Math.round(g.fat || 70)));
    }).finally(() => setLoading(false));
  }, []));

  const colors = theme(highContrast);
  const show = (t, m) => Platform.OS === 'web' ? window.alert(`${t}\n\n${m}`) : Alert.alert(t, m);
  const save = async () => {
    setSubmitted(true);
    if (![calories, protein, carbs, fat].every(validNumber)) {
      show('Check goal values', 'Goals must be positive numbers. Fields with invalid values are highlighted in red.');
      return;
    }
    try { setSaving(true); await updateNutritionGoals({ calories, protein, carbs, fat }); navigation.navigate('Nutrition'); } catch (e) { show('Could not save goals', e.message); } finally { setSaving(false); }
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}><SafeAreaView style={styles.flex}><ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topRow}><Pressable onPress={() => navigation.navigate('Nutrition')}><Ionicons name="arrow-back" size={26} color={colors.primary} /></Pressable><Text style={[styles.topTitle, { color: colors.text }]}>Nutrition goals</Text><View style={{ width: 26 }} /></View>
      <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="flag-outline" size={28} color={colors.primary} /><Text style={[styles.title, { color: colors.text }]}>Set daily targets</Text><Text style={[styles.subtitle, { color: colors.muted }]}>These are simple tracking goals for the selected profile, not medical advice.</Text></View>
      {loading ? <ActivityIndicator color={colors.primary} /> : <>
        <Field colors={colors} label="Calories (kcal)" value={calories} setValue={setCalories} error={submitted && !validNumber(calories)} />
        <Field colors={colors} label="Protein (g)" value={protein} setValue={setProtein} error={submitted && !validNumber(protein)} />
        <Field colors={colors} label="Carbs (g)" value={carbs} setValue={setCarbs} error={submitted && !validNumber(carbs)} />
        <Field colors={colors} label="Fat (g)" value={fat} setValue={setFat} error={submitted && !validNumber(fat)} />
        <Pressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color={colors.primaryText} /> : <Text style={[styles.primaryText, { color: colors.primaryText }]}>Save Goals</Text>}</Pressable>
      </>}
    </ScrollView></SafeAreaView></LinearGradient>
  );
}

function Field({ colors, label, value, setValue, error }) {
  return <View style={styles.fieldWrap}><Text style={[styles.label, { color: colors.text }]}>{label}</Text><TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: error ? colors.danger : colors.border, color: colors.text }]} value={value} onChangeText={(text) => setValue(text.replace(/[^0-9.]/g, ''))} keyboardType="numeric" placeholder={label} placeholderTextColor={colors.muted} />{error ? <Text style={[styles.helper, { color: colors.danger }]}>Enter a positive number.</Text> : null}</View>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, container: { padding: 20, paddingBottom: 40 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, topTitle: { fontSize: 22, fontWeight: '900' }, hero: { borderWidth: 1, borderRadius: 24, padding: 18, marginBottom: 14 }, title: { fontSize: 27, fontWeight: '900', marginTop: 8 }, subtitle: { fontWeight: '700', lineHeight: 22, marginTop: 6 }, fieldWrap: { marginBottom: 10 }, label: { fontWeight: '900', marginBottom: 6 }, input: { borderWidth: 2, borderRadius: 16, padding: 14, fontWeight: '800' }, helper: { fontSize: 12, fontWeight: '700', marginTop: 5 }, primary: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 14 }, primaryText: { fontWeight: '900' } });
