import React, { useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { saveFoodLog, uploadImageForOCR } from '../services/api';
import { getHighContrastPreference, theme } from '../services/accessibility';

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
  const initialServing = getInitialServing(nutrition);
  const [foodName, setFoodName] = useState(params.productName || '');
  const [servingGrams, setServingGrams] = useState(initialServing);
  const [calories, setCalories] = useState(String(params.calories || scaledValue(nutrition.calories_100g, initialServing) || ''));
  const [protein, setProtein] = useState(String(params.protein || scaledValue(nutrition.protein_100g, initialServing) || ''));
  const [carbs, setCarbs] = useState(String(params.carbs || scaledValue(nutrition.carbs_100g, initialServing) || ''));
  const [fat, setFat] = useState(String(params.fat || scaledValue(nutrition.fat_100g, initialServing) || ''));
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [productImageUrl, setProductImageUrl] = useState(params.productImageUrl || '');

  useFocusEffect(useCallback(() => { getHighContrastPreference().then(setHighContrast); }, []));
  const colors = theme(highContrast);


  const applyNutrition = (incoming = {}, baseServing = servingGrams || '100') => {
    const hasPer100 = ['calories_100g', 'protein_100g', 'carbs_100g', 'fat_100g'].some((key) => incoming[key] !== undefined && incoming[key] !== null && incoming[key] !== '');
    if (hasPer100) {
      setCalories(scaledValue(incoming.calories_100g, baseServing));
      setProtein(scaledValue(incoming.protein_100g, baseServing));
      setCarbs(scaledValue(incoming.carbs_100g, baseServing));
      setFat(scaledValue(incoming.fat_100g, baseServing));
      return;
    }
    if (incoming.calories_kcal !== undefined || incoming.calories !== undefined) setCalories(String(incoming.calories_kcal ?? incoming.calories ?? ''));
    if (incoming.protein_g !== undefined || incoming.protein !== undefined) setProtein(String(incoming.protein_g ?? incoming.protein ?? ''));
    if (incoming.carbs_g !== undefined || incoming.carbohydrates_g !== undefined || incoming.carbs !== undefined) setCarbs(String(incoming.carbs_g ?? incoming.carbohydrates_g ?? incoming.carbs ?? ''));
    if (incoming.fat_g !== undefined || incoming.fat !== undefined) setFat(String(incoming.fat_g ?? incoming.fat ?? ''));
  };

  const compressImageForOCR = async (asset) => {
    if (Platform.OS === 'web') return asset;
    const manipulated = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 900 } }], { compress: 0.35, format: ImageManipulator.SaveFormat.JPEG, base64: false });
    return { uri: manipulated.uri, fileName: 'nutrition-label.jpg', mimeType: 'image/jpeg' };
  };

  const scanNutritionLabel = async (mode = 'gallery') => {
    try {
      setOcrLoading(true);
      const permission = mode === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        show('Permission required', mode === 'camera' ? 'Camera permission is required.' : 'Photo library permission is required.');
        return;
      }
      const pickerResult = mode === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.65, allowsEditing: true, aspect: [4, 3] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: Platform.OS === 'web' ? 1 : 0.65, allowsEditing: true });
      if (pickerResult.canceled || !pickerResult.assets?.length) return;
      const asset = pickerResult.assets[0];
      setProductImageUrl(asset.uri || productImageUrl);
      const prepared = await compressImageForOCR(asset);
      const response = await uploadImageForOCR(prepared);
      const extracted = response.nutrition || {};
      const hasValues = Object.keys(extracted).some((key) => key !== 'data_source' && extracted[key] !== null && extracted[key] !== undefined && extracted[key] !== '');
      if (!hasValues) {
        show('No macros found', 'OCR could not confidently find calories, protein, carbs or fat. You can still type them manually.');
        return;
      }
      applyNutrition(extracted, servingGrams || '100');
      show('Nutrition extracted', 'Macro fields were filled from the nutrition label. Please review before saving.');
    } catch (error) {
      show('OCR failed', error.message || 'Could not extract nutrition from the image.');
    } finally {
      setOcrLoading(false);
    }
  };

  const promptScanNutrition = () => {
    if (Platform.OS === 'web') {
      scanNutritionLabel('gallery');
      return;
    }
    Alert.alert('Scan nutrition label', 'Use the nutrition panel on the package to auto-fill macros.', [
      { text: 'Take Photo', onPress: () => scanNutritionLabel('camera') },
      { text: 'Choose Gallery', onPress: () => scanNutritionLabel('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const hasAutoNutrition = useMemo(() => ['calories_100g', 'protein_100g', 'carbs_100g', 'fat_100g'].some((key) => nutrition[key] !== undefined && nutrition[key] !== null && nutrition[key] !== ''), [nutrition]);
  const show = (title, message) => Platform.OS === 'web' ? window.alert(`${title}\n\n${message}`) : Alert.alert(title, message);

  const recalculateFromServing = (grams) => {
    const clean = grams.replace(/[^0-9.]/g, '');
    setServingGrams(clean);
    if (!hasAutoNutrition) return;
    setCalories(scaledValue(nutrition.calories_100g, clean));
    setProtein(scaledValue(nutrition.protein_100g, clean));
    setCarbs(scaledValue(nutrition.carbs_100g, clean));
    setFat(scaledValue(nutrition.fat_100g, clean));
  };

  const hasNameError = submitted && !foodName.trim();
  const hasServingError = submitted && (asNumber(servingGrams) === '' || Number(servingGrams) <= 0);

  const save = async () => {
    setSubmitted(true);
    if (!foodName.trim() || asNumber(servingGrams) === '' || Number(servingGrams) <= 0) {
      show('Missing food details', 'Please enter a food name and a valid serving size in grams. Required fields are highlighted in red.');
      return;
    }
    try {
      setLoading(true);
      await saveFoodLog({
        food_name: foodName.trim(),
        serving_size: `${servingGrams} g`,
        calories,
        protein,
        carbs,
        fat,
        log_date: new Date().toISOString().slice(0, 10),
        source: hasAutoNutrition ? nutrition.data_source || 'product_nutrition' : params.productName ? 'analysis_result' : 'manual',
        product_image_url: productImageUrl,
      });
      navigation.navigate('Nutrition');
    } catch (error) {
      show('Could not save food', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topRow}><Pressable onPress={() => navigation.navigate('Nutrition')}><Ionicons name="arrow-back" size={26} color={colors.primary} /></Pressable><Text style={[styles.topTitle, { color: colors.text }]}>Add food</Text><View style={{ width: 26 }} /></View>

          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={hasAutoNutrition ? 'cloud-done-outline' : 'create-outline'} size={28} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>{hasAutoNutrition ? 'Auto-filled macros' : 'Manual nutrition entry'}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{hasAutoNutrition ? 'Change the serving grams and the macros will recalculate from the product values per 100 g.' : 'Enter only what you know. Unknown macro fields can stay blank.'}</Text>
          </View>

          {hasAutoNutrition ? <View style={[styles.sourceBox, { backgroundColor: colors.card2, borderColor: colors.border }]}><Ionicons name="information-circle-outline" size={22} color={colors.primary} /><Text style={[styles.sourceText, { color: colors.text }]}>Source: {nutrition.data_source || 'Open Food Facts / OCR nutrition data'} per 100 g.</Text></View> : null}

          <View style={[styles.ocrBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {productImageUrl ? <Image source={{ uri: productImageUrl }} style={[styles.previewImage, { borderColor: colors.border }]} /> : <View style={[styles.previewFallback, { backgroundColor: colors.card2, borderColor: colors.border }]}><Ionicons name="image-outline" size={28} color={colors.muted} /></View>}
            <View style={{ flex: 1 }}>
              <Text style={[styles.ocrTitle, { color: colors.text }]}>Scan nutrition panel</Text>
              <Text style={[styles.ocrText, { color: colors.muted }]}>Use OCR to fill calories, protein, carbs and fat from the package.</Text>
              <Pressable style={[styles.ocrButton, { backgroundColor: colors.primary }]} onPress={promptScanNutrition} disabled={ocrLoading}>
                {ocrLoading ? <ActivityIndicator color={colors.primaryText} /> : <><Ionicons name="camera" size={18} color={colors.primaryText} /><Text style={[styles.ocrButtonText, { color: colors.primaryText }]}>Scan macros</Text></>}
              </Pressable>
            </View>
          </View>

          <Field colors={colors} label="Food name" value={foodName} setValue={setFoodName} required error={hasNameError} />
          <Field colors={colors} label="Serving size (grams)" value={servingGrams} setValue={recalculateFromServing} keyboardType="numeric" required error={hasServingError} helper="Use a number only, for example 30 or 100." />
          <Field colors={colors} label="Calories (kcal)" value={calories} setValue={setCalories} keyboardType="numeric" />
          <Field colors={colors} label="Protein (g)" value={protein} setValue={setProtein} keyboardType="numeric" />
          <Field colors={colors} label="Carbs (g)" value={carbs} setValue={setCarbs} keyboardType="numeric" />
          <Field colors={colors} label="Fat (g)" value={fat} setValue={setFat} keyboardType="numeric" />

          <Pressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={save} disabled={loading}>{loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={[styles.primaryText, { color: colors.primaryText }]}>Save to Food Log</Text>}</Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Field({ colors, label, value, setValue, keyboardType, required, error, helper }) {
  return <View style={styles.fieldWrap}><Text style={[styles.label, { color: colors.text }]}>{label}{required ? ' *' : ''}</Text><TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: error ? colors.danger : colors.border, color: colors.text }]} value={value} onChangeText={setValue} keyboardType={keyboardType || 'default'} placeholder={label} placeholderTextColor={colors.muted} />{helper || error ? <Text style={[styles.helper, { color: error ? colors.danger : colors.muted }]}>{error ? 'This field is required.' : helper}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { padding: 20, paddingBottom: 40 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, topTitle: { fontSize: 22, fontWeight: '900' },
  hero: { borderWidth: 1, borderRadius: 24, padding: 18, marginBottom: 14 }, title: { fontSize: 27, fontWeight: '900', marginTop: 8 }, subtitle: { fontWeight: '700', lineHeight: 22, marginTop: 6 },
  sourceBox: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 }, sourceText: { flex: 1, fontWeight: '800', lineHeight: 20 },
  ocrBox: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1 },
  previewImage: { width: 74, height: 74, borderRadius: 16, borderWidth: 1 },
  previewFallback: { width: 74, height: 74, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ocrTitle: { fontSize: 15, fontWeight: '900' },
  ocrText: { fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3 },
  ocrButton: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginTop: 9 },
  ocrButtonText: { fontSize: 12, fontWeight: '900' },
  fieldWrap: { marginBottom: 10 }, label: { fontWeight: '900', marginBottom: 6 }, input: { borderWidth: 2, borderRadius: 16, padding: 14, fontWeight: '800' }, helper: { fontSize: 12, fontWeight: '700', marginTop: 5 },
  primary: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 14 }, primaryText: { fontWeight: '900' },
});
