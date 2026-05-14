import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { saveFoodLog } from '../services/api';

function asNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : '';
}

function scaledValue(per100g, grams) {
  const value = asNumber(per100g);
  const serving = asNumber(grams);
  if (value === '' || serving === '') return '';
  return String(Math.round(((value * serving) / 100) * 10) / 10);
}

function getInitialServing(nutrition) {
  const servingQuantity = asNumber(nutrition?.serving_quantity);
  if (servingQuantity !== '') return String(servingQuantity);
  return '100';
}

export default function AddFoodScreen({ route, navigation }) {
  const params = route.params || {};
  const nutrition = params.nutrition || {};
  const [foodName, setFoodName] = useState(params.productName || '');
  const [servingGrams, setServingGrams] = useState(getInitialServing(nutrition));
  const [calories, setCalories] = useState(String(params.calories || scaledValue(nutrition.calories_100g, getInitialServing(nutrition)) || ''));
  const [protein, setProtein] = useState(String(params.protein || scaledValue(nutrition.protein_100g, getInitialServing(nutrition)) || ''));
  const [carbs, setCarbs] = useState(String(params.carbs || scaledValue(nutrition.carbs_100g, getInitialServing(nutrition)) || ''));
  const [fat, setFat] = useState(String(params.fat || scaledValue(nutrition.fat_100g, getInitialServing(nutrition)) || ''));
  const [loading, setLoading] = useState(false);

  const hasAutoNutrition = useMemo(() => ['calories_100g', 'protein_100g', 'carbs_100g', 'fat_100g'].some((key) => nutrition[key] !== undefined && nutrition[key] !== null && nutrition[key] !== ''), [nutrition]);
  const show = (title, message) => Platform.OS === 'web' ? window.alert(`${title}\n\n${message}`) : Alert.alert(title, message);

  const recalculateFromServing = (grams) => {
    setServingGrams(grams.replace(/[^0-9.]/g, ''));
    if (!hasAutoNutrition) return;
    setCalories(scaledValue(nutrition.calories_100g, grams));
    setProtein(scaledValue(nutrition.protein_100g, grams));
    setCarbs(scaledValue(nutrition.carbs_100g, grams));
    setFat(scaledValue(nutrition.fat_100g, grams));
  };

  const save = async () => {
    if (!foodName.trim()) {
      show('Food name required', 'Please enter a food name.');
      return;
    }
    try {
      setLoading(true);
      await saveFoodLog({
        food_name: foodName.trim(),
        serving_size: `${servingGrams || 0} g`,
        calories,
        protein,
        carbs,
        fat,
        log_date: new Date().toISOString().slice(0, 10),
        source: hasAutoNutrition ? nutrition.data_source || 'product_nutrition' : params.productName ? 'analysis_result' : 'manual',
      });
      navigation.navigate('Nutrition');
    } catch (error) {
      show('Could not save food', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#FAFDF8', '#EEF7E7']} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <Pressable onPress={() => navigation.navigate('Nutrition')}><Ionicons name="arrow-back" size={26} color="#2E7D32" /></Pressable>
          <Text style={styles.title}>Add Food</Text>
          <Text style={styles.subtitle}>{hasAutoNutrition ? 'Nutrition values were pre-filled from the scanned product. Change the grams if your serving is different.' : 'Enter available nutrition values. Leave unknown fields blank.'}</Text>

          {hasAutoNutrition ? (
            <View style={styles.sourceBox}>
              <Ionicons name="cloud-done" size={22} color="#2E7D32" />
              <Text style={styles.sourceText}>Auto-filled from {nutrition.data_source || 'product data'} per 100 g.</Text>
            </View>
          ) : null}

          <Field label="Food name" value={foodName} setValue={setFoodName} />
          <Field label="Serving size (grams)" value={servingGrams} setValue={recalculateFromServing} keyboardType="numeric" />
          <Field label="Calories (kcal)" value={calories} setValue={setCalories} keyboardType="numeric" />
          <Field label="Protein (g)" value={protein} setValue={setProtein} keyboardType="numeric" />
          <Field label="Carbs (g)" value={carbs} setValue={setCarbs} keyboardType="numeric" />
          <Field label="Fat (g)" value={fat} setValue={setFat} keyboardType="numeric" />

          <Pressable style={styles.primary} onPress={save} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save to Food Log</Text>}</Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Field({ label, value, setValue, keyboardType }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={setValue} keyboardType={keyboardType || 'default'} placeholder={label} placeholderTextColor="#6F806B" />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '900', color: '#1B5E20', textAlign: 'center' },
  subtitle: { color: '#5f6f52', fontWeight: '700', textAlign: 'center', lineHeight: 21, marginVertical: 12 },
  sourceBox: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 16, padding: 14, marginBottom: 12 },
  sourceText: { flex: 1, color: '#1B5E20', fontWeight: '800', lineHeight: 20 },
  label: { color: '#1B5E20', fontWeight: '900', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#DDECCF', borderRadius: 16, padding: 14, color: '#1B5E20', fontWeight: '700' },
  primary: { backgroundColor: '#4CAF50', borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 18 },
  primaryText: { color: '#fff', fontWeight: '900' },
});
