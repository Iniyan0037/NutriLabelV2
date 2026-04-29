import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { displayProfile, getRecommendations, normalizeProfiles, saveHistoryItem } from '../services/api';
import { getHighContrastPreference, getStatusConfig, goBackSafely, theme } from '../services/accessibility';

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
    };
  }

  const analysis = apiResult || productResult || {};
  return {
    productName: params.productName || analysis.product_name || 'Manual Analysis',
    ingredientText: params.ingredientText || '',
    analysis,
    selectedProfiles: normalizeProfiles(params.selectedProfiles || params.profile || analysis.selected_profiles || []),
    fromHistory: Boolean(params.fromHistory),
  };
}

export default function ResultScreen({ route, navigation }) {
  const { productName, ingredientText, analysis, selectedProfiles, fromHistory } = useMemo(
    () => normaliseAnalysis(route.params),
    [route.params]
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(fromHistory);
  const [highContrast, setHighContrast] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [autoSaveMessage, setAutoSaveMessage] = useState(fromHistory ? 'Viewing saved history result.' : '');
  const [isReading, setIsReading] = useState(false);
  const hasAutoSaved = useRef(false);
  const hasHapticPlayed = useRef(false);

  const colors = theme(highContrast);
  const status = analysis.overall_result || analysis.status || 'Uncertain';
  const statusConfig = getStatusConfig(status);
  const ingredientRows = analysis.ingredients || analysis.ingredients_analysis || [];
  const additiveRows = analysis.additives_analysis || [];
  const allergenRows = analysis.allergens_analysis || [];

  useEffect(() => {
    getHighContrastPreference().then(setHighContrast).catch(() => {});
  }, []);

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

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    async function triggerResultHaptics() {
      if (hasHapticPlayed.current) return;
      hasHapticPlayed.current = true;
      try {
        if (Platform.OS === 'web') return;
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
    const restricted = ingredientRows.filter((item) => item.status === 'Restricted').slice(0, 5);
    const uncertain = ingredientRows.filter((item) => item.status === 'Uncertain').slice(0, 5);

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

  const saveLocalHistoryFallback = async () => {
    const existing = await AsyncStorage.getItem('HISTORY');
    const history = existing ? JSON.parse(existing) : [];
    history.unshift({
      id: Date.now(),
      product_name: productName,
      result: statusConfig.label,
      profile_used: selectedProfiles,
      timestamp: new Date().toISOString(),
      analysis_json: analysis,
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
          analysisJson: analysis,
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

  const renderRows = (title, rows) => {
    if (!rows || rows.length === 0) return null;

    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">{title}</Text>
        {rows.map((item, index) => {
          const rowStatus = getStatusConfig(item.status || 'Uncertain');
          const name = item.name || item.ingredient || item.matched_name || 'Unknown';
          return (
            <View key={`${title}-${index}`} style={[styles.resultRow, { borderTopColor: colors.border }]} accessible accessibilityRole="text" accessibilityLabel={`${name}. Status ${rowStatus.label}. ${item.reason || rowStatus.meaning}`}>
              <View style={[styles.statusIcon, { backgroundColor: highContrast ? colors.card2 : rowStatus.bg, borderColor: highContrast ? colors.border : rowStatus.color }]}>
                <Ionicons name={rowStatus.icon} size={22} color={highContrast ? colors.primary : rowStatus.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ingredientName, { color: colors.text }]}>{name}</Text>
                {item.matched_name && item.matched_name !== name ? <Text style={[styles.matchText, { color: colors.muted }]}>Matched as: {item.matched_name}</Text> : null}
                <Text style={[styles.rowStatus, { color: highContrast ? colors.primary : rowStatus.color }]}>{rowStatus.textIcon} Status: {rowStatus.label}</Text>
                <Text style={[styles.reason, { color: colors.muted }]}>{item.reason || rowStatus.meaning}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topRow}>
            <Pressable onPress={() => goBackSafely(navigation, 'Home')} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={26} color={colors.secondary} />
            </Pressable>
            <Text style={[styles.topTitle, { color: colors.text }]}>Results</Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.bigIcon, { backgroundColor: highContrast ? colors.card2 : statusConfig.bg, borderColor: highContrast ? colors.border : statusConfig.color }]}>
              <Ionicons name={statusConfig.icon} size={58} color={highContrast ? colors.primary : statusConfig.color} />
            </View>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Analysis Complete</Text>
            <Text style={[styles.productName, { color: colors.text }]}>{productName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: highContrast ? colors.primary : statusConfig.bg, borderColor: highContrast ? colors.border : statusConfig.color }]} accessible accessibilityLabel={`Status ${statusConfig.label}. ${statusConfig.meaning}`}>
              <Text style={[styles.statusBadgeText, { color: highContrast ? colors.primaryText : statusConfig.color }]}>{statusConfig.textIcon} Status: {statusConfig.label}</Text>
            </View>
            <Text style={[styles.summary, { color: colors.muted }]}>{analysis.summary || statusConfig.meaning}</Text>
            <Text style={[styles.indicatorHelp, { color: colors.muted }]}>Non-colour indicator: {statusConfig.textIcon} means {statusConfig.label}.</Text>

            <Pressable
              style={[styles.speechButton, { backgroundColor: isReading ? colors.danger : colors.primary }]}
              onPress={toggleReading}
              accessibilityRole="button"
              accessibilityLabel={isReading ? 'Stop reading result aloud' : 'Read result aloud'}
            >
              <Ionicons name={isReading ? 'stop-circle' : 'volume-high'} size={22} color={isReading ? '#fff' : colors.primaryText} />
              <Text style={[styles.speechButtonText, { color: isReading ? '#fff' : colors.primaryText }]}>{isReading ? 'Stop Reading' : 'Read Result Aloud'}</Text>
            </Pressable>

            {autoSaveMessage ? <Text style={[styles.saveNoticeText, { color: colors.muted }]}>{autoSaveMessage}</Text> : null}
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Selected Profiles</Text>
            <View style={styles.tagsWrap}>{selectedProfiles.length > 0 ? selectedProfiles.map((profile) => <View key={profile} style={[styles.profileTag, { borderColor: colors.primary, backgroundColor: colors.card2 }]}><Text style={[styles.profileTagText, { color: colors.text }]}>{displayProfile(profile)}</Text></View>) : <Text style={[styles.emptyText, { color: colors.muted }]}>No profile selected</Text>}</View>
          </View>

          {renderRows('Ingredient Breakdown', ingredientRows)}
          {renderRows('Additives From Product Data', additiveRows)}
          {renderRows('Allergens From Product Data', allergenRows)}

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
            <Pressable style={[styles.primaryButton, { backgroundColor: saved ? '#81C784' : colors.primary }]} onPress={() => saveToHistory({ silent: false })} disabled={saving || saved} accessibilityRole="button" accessibilityLabel={saved ? 'Saved to history' : 'Save to history'}>
              {saving ? <ActivityIndicator color={colors.primaryText} /> : <Text style={[styles.primaryText, { color: colors.primaryText }]}>{saved ? 'Saved to History' : 'Save to History'}</Text>}
            </Pressable>
          ) : null}

          <Pressable style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={() => navigation.navigate('Scan', { selectedProfiles })} accessibilityRole="button" accessibilityLabel="Scan another product"><Text style={[styles.secondaryText, { color: colors.secondary }]}>Scan Another Product</Text></Pressable>
          <Pressable style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={() => navigation.navigate('ManualInput', { selectedProfiles })} accessibilityRole="button" accessibilityLabel="Analyse manual ingredients"><Text style={[styles.secondaryText, { color: colors.secondary }]}>Analyse Manual Ingredients</Text></Pressable>
          <Pressable style={styles.homeButton} onPress={() => navigation.navigate('Home', { profile: selectedProfiles })} accessibilityRole="button" accessibilityLabel="Back to home"><Text style={[styles.homeText, { color: colors.muted }]}>Back to Home</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  topTitle: { fontSize: 22, fontWeight: '900' },
  headerCard: { borderRadius: 26, padding: 24, alignItems: 'center', elevation: 4, marginBottom: 18, borderWidth: 1 },
  bigIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 2 },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  productName: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  statusBadge: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, marginTop: 14, borderWidth: 2 },
  statusBadgeText: { fontSize: 16, fontWeight: '900' },
  summary: { textAlign: 'center', marginTop: 14, lineHeight: 22 },
  indicatorHelp: { textAlign: 'center', marginTop: 8, fontWeight: '700' },
  speechButton: { marginTop: 18, width: '100%', borderRadius: 18, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  speechButtonText: { fontSize: 16, fontWeight: '900' },
  saveNoticeText: { fontSize: 13, fontWeight: '700', marginTop: 12 },
  sectionCard: { borderRadius: 22, padding: 18, marginBottom: 16, elevation: 2, borderWidth: 1 },
  sectionTitle: { fontSize: 19, fontWeight: '900', marginBottom: 12 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profileTag: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  profileTagText: { fontWeight: '800' },
  emptyText: { fontSize: 15 },
  resultRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, paddingTop: 14, marginTop: 14 },
  statusIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  ingredientName: { fontSize: 17, fontWeight: '900', textTransform: 'capitalize' },
  matchText: { fontSize: 13, marginTop: 3 },
  rowStatus: { fontWeight: '900', marginTop: 5 },
  reason: { marginTop: 5, lineHeight: 20 },
  recommendRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 10, borderTopWidth: 1 },
  recommendItem: { fontSize: 16, fontWeight: '900' },
  primaryButton: { paddingVertical: 17, borderRadius: 18, alignItems: 'center', marginTop: 4 },
  primaryText: { fontWeight: '900', fontSize: 16 },
  secondaryButton: { borderWidth: 2, paddingVertical: 15, borderRadius: 18, alignItems: 'center', marginTop: 12 },
  secondaryText: { fontWeight: '900', fontSize: 15 },
  homeButton: { paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  homeText: { fontWeight: '800' },
});
