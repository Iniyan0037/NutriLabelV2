import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AppScaffold from '../components/AppScaffold';
import MotionPressable from '../components/MotionPressable';
import { getRecommendations, normalizeProfiles, saveHistoryItem } from '../services/api';
import { getStatusConfig } from '../services/accessibility';

function normaliseAnalysis(routeParams) {
  const params = routeParams || {};
  const apiResult = params.apiResult || null;
  const productResult = params.result || null;

  if (productResult?.analysis) {
    return {
      productName: productResult.product_name || params.productName || 'Product Analysis',
      ingredientText: productResult.ingredient_text || params.ingredientText || '',
      analysis: productResult.analysis,
      selectedProfiles: normalizeProfiles(params.selectedProfiles || params.profile || productResult.analysis?.selected_profiles || []),
      fromHistory: Boolean(params.fromHistory),
      nutrition: productResult.nutrition || params.nutrition || null,
      productImageUrl: productResult.product_image_url || productResult.image_url || params.productImageUrl || '',
    };
  }

  const analysis = apiResult || productResult || {};
  return {
    productName: params.productName || analysis.product_name || 'Manual Analysis',
    ingredientText: params.ingredientText || analysis.ingredient_text || '',
    analysis,
    selectedProfiles: normalizeProfiles(params.selectedProfiles || params.profile || analysis.selected_profiles || []),
    fromHistory: Boolean(params.fromHistory),
    nutrition: params.nutrition || analysis.nutrition || null,
    productImageUrl: params.productImageUrl || analysis.product_image_url || analysis.image_url || '',
  };
}

export default function ResultScreen({ route, navigation }) {
  const { productName, ingredientText, analysis, selectedProfiles, fromHistory, nutrition, productImageUrl } = useMemo(
    () => normaliseAnalysis(route.params),
    [route.params]
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(fromHistory);
  const [recommendations, setRecommendations] = useState([]);
  const [autoSaveMessage, setAutoSaveMessage] = useState(fromHistory ? 'Viewing saved history result.' : '');
  const [isReading, setIsReading] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState(productImageUrl || '');
  const hasAutoSaved = useRef(false);
  const hasHapticPlayed = useRef(false);

  const status = analysis?.overall_result || analysis?.status || 'Uncertain';
  const statusConfig = getStatusConfig(status);
  const ingredientRows = analysis?.ingredients || analysis?.ingredients_analysis || [];
  const additiveRows = analysis?.additives_analysis || [];
  const allergenRows = analysis?.allergens_analysis || [];

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const data = await getRecommendations(selectedProfiles);
        setRecommendations(data.recommendations || []);
      } catch {
        setRecommendations([]);
      }
    }
    if (selectedProfiles.length > 0) loadRecommendations();
  }, [selectedProfiles.join(',')]);

  useEffect(() => {
    async function triggerResultHaptics() {
      if (hasHapticPlayed.current) return;
      hasHapticPlayed.current = true;
      try {
        if (Platform.OS === 'web') return;
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        if (statusConfig.label === 'Safe') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (statusConfig.label === 'Restricted') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await wait(120);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await wait(180);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch {}
    }
    triggerResultHaptics();
  }, [statusConfig.label]);

  const buildSpeechMessage = () => {
    const restricted = ingredientRows.filter((item) => (item.status || '').toLowerCase() === 'restricted').slice(0, 5);
    const uncertain = ingredientRows.filter((item) => (item.status || '').toLowerCase() === 'uncertain').slice(0, 5);
    const restrictedText = restricted.length
      ? `Restricted ingredients include ${restricted.map((item) => item.name || item.ingredient || item.matched_name).join(', ')}.`
      : 'No restricted ingredients were highlighted.';
    const uncertainText = uncertain.length
      ? `Ingredients needing further checking include ${uncertain.map((item) => item.name || item.ingredient || item.matched_name).join(', ')}.`
      : '';
    return `Product name: ${productName}. Overall status: ${statusConfig.label}. ${statusConfig.meaning} ${restrictedText} ${uncertainText}`;
  };

  const toggleReading = async () => {
    if (isReading) {
      Speech.stop();
      setIsReading(false);
      return;
    }
    Speech.stop();
    setIsReading(true);
    Speech.speak(buildSpeechMessage(), {
      language: 'en',
      rate: 0.9,
      pitch: 1.0,
      onDone: () => setIsReading(false),
      onStopped: () => setIsReading(false),
      onError: () => setIsReading(false),
    });
  };

  useEffect(() => () => Speech.stop(), []);

  const historyAnalysis = useMemo(() => ({
    ...analysis,
    product_name: productName,
    ingredient_text: ingredientText,
    nutrition,
    product_image_url: displayImageUrl,
  }), [analysis, productName, ingredientText, nutrition, displayImageUrl]);


  const showMessage = (title, message) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const chooseProductImage = async (mode = 'gallery') => {
    try {
      const permission = mode === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showMessage('Permission required', mode === 'camera' ? 'Camera permission is required.' : 'Photo library permission is required.');
        return;
      }
      const pickerResult = mode === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
      if (pickerResult.canceled || !pickerResult.assets?.length) return;
      setDisplayImageUrl(pickerResult.assets[0].uri);
      showMessage('Image added', 'This image will be shown on the result and saved with this history entry.');
    } catch (error) {
      showMessage('Image failed', error.message || 'Could not add the product image.');
    }
  };

  const promptProductImage = () => {
    if (Platform.OS === 'web') {
      chooseProductImage('gallery');
      return;
    }
    Alert.alert('Product image', 'Add a photo for this product.', [
      { text: 'Take Photo', onPress: () => chooseProductImage('camera') },
      { text: 'Choose Gallery', onPress: () => chooseProductImage('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const saveLocalHistoryFallback = async () => {
    const existing = await AsyncStorage.getItem('HISTORY');
    const history = existing ? JSON.parse(existing) : [];
    history.unshift({
      id: Date.now(),
      product_name: productName,
      result: statusConfig.label,
      profile_used: selectedProfiles,
      timestamp: new Date().toISOString(),
      analysis_json: { ...historyAnalysis, localOnly: true },
      ingredients: ingredientText || 'Not available',
      localOnly: true,
    });
    await AsyncStorage.setItem('HISTORY', JSON.stringify(history));
  };

  const saveToHistory = async ({ silent = false } = {}) => {
    if (fromHistory) return;
    try {
      setSaving(true);
      await AsyncStorage.setItem('PROFILE', JSON.stringify(selectedProfiles));
      try {
        await saveHistoryItem({
          productName,
          ingredients: ingredientText || productName,
          result: statusConfig.label,
          analysisJson: historyAnalysis,
          profileUsed: selectedProfiles,
        });
        setAutoSaveMessage('Saved to history.');
      } catch {
        await saveLocalHistoryFallback();
        setAutoSaveMessage('Saved locally. Server history was unavailable.');
      }
      setSaved(true);
      if (!silent) Alert.alert('Saved', 'This analysis has been saved to history.');
    } catch (error) {
      if (!silent) Alert.alert('Save failed', error.message || 'Could not save result.');
      setAutoSaveMessage('Could not save history automatically.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (fromHistory || hasAutoSaved.current || !analysis || Object.keys(analysis).length === 0) return;
    hasAutoSaved.current = true;
    saveToHistory({ silent: true });
  }, []);

  const renderRows = (title, rows, colors, highContrast) => {
    if (!rows || rows.length === 0) return null;
    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {rows.map((item, index) => {
          const rowStatus = getStatusConfig(item.status || 'Uncertain');
          const name = item.name || item.ingredient || item.matched_name || 'Unknown';
          return (
            <View key={`${title}-${index}`} style={[styles.resultRow, { borderTopColor: colors.border }]}> 
              <View style={[styles.statusIcon, { backgroundColor: highContrast ? colors.card2 : rowStatus.bg, borderColor: highContrast ? colors.border : rowStatus.color }]}> 
                <Ionicons name={rowStatus.icon} size={22} color={highContrast ? colors.primary : rowStatus.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ingredientName, { color: colors.text }]}>{name}</Text>
                {item.matched_name && item.matched_name !== name ? <Text style={[styles.matchText, { color: colors.muted }]}>Matched as: {item.matched_name}</Text> : null}
                <Text style={[styles.rowStatus, { color: highContrast ? colors.primary : rowStatus.color }]}>{rowStatus.textIcon} {rowStatus.label}</Text>
                <Text style={[styles.reason, { color: colors.muted }]}>{item.reason || rowStatus.meaning}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <AppScaffold navigation={navigation} current="Results" title="Results">
      {({ colors, highContrast }) => (
        <>
          <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.productRow}>
              <Pressable onPress={promptProductImage} accessibilityRole="button" accessibilityLabel="Add or change product image">
                {displayImageUrl ? (
                  <Image source={{ uri: displayImageUrl }} style={[styles.productImage, { borderColor: colors.border }]} resizeMode="cover" />
                ) : (
                  <View style={[styles.productImageFallback, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
                    <Ionicons name="image-outline" size={30} color={colors.muted} />
                    <Text style={[styles.imageHint, { color: colors.muted }]}>Add photo</Text>
                  </View>
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[styles.productName, { color: colors.text }]}>{productName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: highContrast ? colors.card2 : statusConfig.bg, borderColor: highContrast ? colors.border : statusConfig.color }]}> 
                  <Text style={[styles.statusBadgeText, { color: highContrast ? colors.primary : statusConfig.color }]}>{statusConfig.textIcon} {statusConfig.label}</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.summary, { color: colors.muted }]}>{analysis?.summary || statusConfig.meaning}</Text>
            <MotionPressable
              style={[styles.speechButton, { backgroundColor: isReading ? colors.danger : colors.primary }]}
              onPress={toggleReading}
            >
              <Ionicons name={isReading ? 'stop-circle' : 'volume-high'} size={22} color={isReading ? '#fff' : colors.primaryText} />
              <Text style={[styles.speechButtonText, { color: isReading ? '#fff' : colors.primaryText }]}>{isReading ? 'Stop Reading' : 'Read Result Aloud'}</Text>
            </MotionPressable>
            {autoSaveMessage ? <Text style={[styles.saveNoticeText, { color: colors.muted }]}>{autoSaveMessage}</Text> : null}
          </View>

          {nutrition ? (
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Nutrition found</Text>
              <View style={styles.macroGrid}>
                <Macro colors={colors} label="Calories" value={nutrition.calories_kcal ?? nutrition.calories_100g ?? nutrition.calories ?? 0} unit="kcal" />
                <Macro colors={colors} label="Protein" value={nutrition.protein_g ?? nutrition.protein_100g ?? nutrition.protein ?? 0} unit="g" />
                <Macro colors={colors} label="Carbs" value={nutrition.carbs_g ?? nutrition.carbs_100g ?? nutrition.carbohydrates_100g ?? nutrition.carbohydrates_g ?? nutrition.carbs ?? 0} unit="g" />
                <Macro colors={colors} label="Fat" value={nutrition.fat_g ?? nutrition.fat_100g ?? nutrition.fat ?? 0} unit="g" />
              </View>
            </View>
          ) : null}

          {renderRows('Ingredient results', ingredientRows, colors, highContrast)}
          {renderRows('Allergen results', allergenRows, colors, highContrast)}
          {renderRows('Additive results', additiveRows, colors, highContrast)}

          {recommendations.length > 0 ? (
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommendations</Text>
              {recommendations.map((rec, index) => (
                <View key={index} style={[styles.recommendRow, { borderTopColor: colors.border }]}> 
                  <Ionicons name={rec.type === 'avoid' ? 'warning' : 'checkmark-circle'} size={21} color={rec.type === 'avoid' ? colors.danger : colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recommendItem, { color: colors.text }]}>{rec.type === 'avoid' ? 'Avoid: ' : 'Alternative: '}{rec.item}</Text>
                    <Text style={[styles.reason, { color: colors.muted }]}>{rec.reason}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {!fromHistory ? (
            <MotionPressable style={[styles.primaryButton, { backgroundColor: saved ? '#81C784' : colors.primary }]} onPress={() => saveToHistory({ silent: false })} disabled={saving || saved}> 
              {saving ? <ActivityIndicator color={colors.primaryText} /> : <Text style={[styles.primaryText, { color: colors.primaryText }]}>{saved ? 'Saved to History' : 'Save to History'}</Text>}
            </MotionPressable>
          ) : null}

          <MotionPressable style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={() => navigation.navigate('AddFood', { productName, nutrition, productImageUrl: displayImageUrl })}> 
            <Text style={[styles.secondaryText, { color: colors.secondary }]}>Add to Food Log</Text>
          </MotionPressable>
        </>
      )}
    </AppScaffold>
  );
}

function Macro({ colors, label, value, unit }) {
  const display = Number(value || 0).toFixed(unit === 'kcal' ? 0 : 1);
  return (
    <View style={[styles.macroCard, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
      <Text style={[styles.macroValue, { color: colors.text }]}>{display}</Text>
      <Text style={[styles.macroLabel, { color: colors.muted }]}>{label} ({unit})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: { borderRadius: 26, borderWidth: 1, padding: 18, marginBottom: 14 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  productImage: { width: 82, height: 82, borderRadius: 20, borderWidth: 1 },
  productImageFallback: { width: 82, height: 82, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  imageHint: { fontSize: 10, fontWeight: '900' },
  productName: { fontSize: 22, lineHeight: 27, fontWeight: '900', letterSpacing: -0.4 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, marginTop: 10 },
  statusBadgeText: { fontSize: 13, fontWeight: '900' },
  summary: { fontSize: 14, lineHeight: 21, fontWeight: '700', marginTop: 14 },
  speechButton: { minHeight: 50, borderRadius: 18, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  speechButtonText: { fontWeight: '900', fontSize: 15 },
  saveNoticeText: { marginTop: 10, textAlign: 'center', fontWeight: '800' },
  sectionCard: { borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: '900', marginBottom: 10 },
  resultRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  statusIcon: { width: 42, height: 42, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ingredientName: { fontSize: 16, fontWeight: '900' },
  matchText: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  rowStatus: { fontSize: 13, fontWeight: '900', marginTop: 4 },
  reason: { fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 3 },
  recommendRow: { flexDirection: 'row', gap: 10, borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  recommendItem: { fontSize: 14, fontWeight: '900' },
  primaryButton: { minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  primaryText: { fontWeight: '900', fontSize: 15 },
  secondaryButton: { minHeight: 52, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  secondaryText: { fontWeight: '900', fontSize: 15 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  macroCard: { width: '47.5%', borderWidth: 1, borderRadius: 18, padding: 12 },
  macroValue: { fontSize: 21, fontWeight: '900' },
  macroLabel: { fontSize: 11, fontWeight: '800', marginTop: 3 },
});
