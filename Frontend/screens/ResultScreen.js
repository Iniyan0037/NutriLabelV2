import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { displayProfile, getRecommendations, normalizeProfiles, saveHistoryItem } from '../services/api';

function getStatusConfig(status) {
  if (status === 'Safe' || status === 'Allowed') {
    return { label: 'Safe', color: '#4CAF50', bg: '#E8F5E9', icon: 'checkmark-circle' };
  }
  if (status === 'Restricted') {
    return { label: 'Restricted', color: '#EF5350', bg: '#FFEBEE', icon: 'close-circle' };
  }
  return { label: 'Uncertain', color: '#FF9800', bg: '#FFF3E0', icon: 'help-circle' };
}

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
    };
  }

  const analysis = apiResult || productResult || {};

  return {
    productName: params.productName || analysis.product_name || 'Manual Analysis',
    ingredientText: params.ingredientText || '',
    analysis,
    selectedProfiles: normalizeProfiles(params.selectedProfiles || params.profile || analysis.selected_profiles || []),
  };
}

export default function ResultScreen({ route, navigation }) {
  const { productName, ingredientText, analysis, selectedProfiles } = useMemo(
    () => normaliseAnalysis(route.params),
    [route.params]
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const status = analysis.overall_result || analysis.status || 'Uncertain';
  const statusConfig = getStatusConfig(status);

  const ingredientRows =
    analysis.ingredients ||
    analysis.ingredients_analysis ||
    [];

  const additiveRows = analysis.additives_analysis || [];
  const allergenRows = analysis.allergens_analysis || [];

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const data = await getRecommendations(selectedProfiles);
        setRecommendations(data.recommendations || []);
      } catch {
        setRecommendations([]);
      }
    }

    if (selectedProfiles.length > 0) {
      loadRecommendations();
    }
  }, [selectedProfiles.join(',')]);

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

  const handleSave = async () => {
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
      } catch {
        await saveLocalHistoryFallback();
      }

      setSaved(true);
      Alert.alert('Saved', 'This analysis has been saved to history.');
    } catch (error) {
      Alert.alert('Save failed', error.message || 'Could not save result.');
    } finally {
      setSaving(false);
    }
  };

  const renderRows = (title, rows) => {
    if (!rows || rows.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {rows.map((item, index) => {
          const rowStatus = getStatusConfig(item.status || 'Uncertain');
          const name = item.name || item.ingredient || item.matched_name || 'Unknown';
          return (
            <View key={`${title}-${index}`} style={styles.resultRow}>
              <View style={[styles.statusIcon, { backgroundColor: rowStatus.bg }]}>
                <Ionicons name={rowStatus.icon} size={22} color={rowStatus.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ingredientName}>{name}</Text>
                {item.matched_name && item.matched_name !== name ? (
                  <Text style={styles.matchText}>Matched as: {item.matched_name}</Text>
                ) : null}
                <Text style={[styles.rowStatus, { color: rowStatus.color }]}>{rowStatus.label}</Text>
                <Text style={styles.reason}>{item.reason || 'No explanation available.'}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <LinearGradient colors={['#F5F9F0', '#E8F5E9', '#FAFDF8']} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerCard}>
            <View style={[styles.bigIcon, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={58} color={statusConfig.color} />
            </View>
            <Text style={styles.title}>Analysis Complete</Text>
            <Text style={styles.productName}>{productName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}> 
              <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
            <Text style={styles.summary}>{analysis.summary || 'Analysis completed.'}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Selected Profiles</Text>
            <View style={styles.tagsWrap}>
              {selectedProfiles.length > 0 ? selectedProfiles.map((profile) => (
                <View key={profile} style={styles.profileTag}>
                  <Text style={styles.profileTagText}>{displayProfile(profile)}</Text>
                </View>
              )) : <Text style={styles.emptyText}>No profile selected</Text>}
            </View>
          </View>

          {renderRows('Ingredient Breakdown', ingredientRows)}
          {renderRows('Additives From Product Data', additiveRows)}
          {renderRows('Allergens From Product Data', allergenRows)}

          {recommendations.length > 0 ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendRow}>
                  <Ionicons name={rec.type === 'avoid' ? 'warning' : 'checkmark-circle'} size={21} color={rec.type === 'avoid' ? '#EF5350' : '#4CAF50'} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recommendItem}>{rec.item}</Text>
                    <Text style={styles.reason}>{rec.reason}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable style={[styles.primaryButton, saved && styles.savedButton]} onPress={handleSave} disabled={saving || saved}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{saved ? 'Saved to History' : 'Save to History'}</Text>}
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Scan', { selectedProfiles })}>
            <Text style={styles.secondaryText}>Scan Another Product</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('ManualInput', { selectedProfiles })}>
            <Text style={styles.secondaryText}>Analyse Manual Ingredients</Text>
          </Pressable>
          <Pressable style={styles.homeButton} onPress={() => navigation.navigate('Home', { profile: selectedProfiles })}>
            <Text style={styles.homeText}>Back to Home</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  headerCard: { backgroundColor: '#fff', borderRadius: 26, padding: 24, alignItems: 'center', elevation: 4, marginBottom: 18 },
  bigIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '800', color: '#1B5E20', textAlign: 'center' },
  productName: { fontSize: 18, fontWeight: '700', color: '#333', textAlign: 'center', marginTop: 8 },
  statusBadge: { marginTop: 14, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8 },
  statusBadgeText: { fontSize: 18, fontWeight: '900' },
  summary: { marginTop: 12, fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 22, padding: 18, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1B5E20', marginBottom: 14 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  profileTag: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  profileTagText: { color: '#2E7D32', fontWeight: '800' },
  emptyText: { color: '#777' },
  resultRow: { flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 12 },
  statusIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  ingredientName: { fontSize: 16, fontWeight: '800', color: '#222' },
  matchText: { fontSize: 13, color: '#777', marginTop: 2 },
  rowStatus: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  reason: { fontSize: 13, color: '#555', marginTop: 5, lineHeight: 19 },
  recommendRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  recommendItem: { fontSize: 15, fontWeight: '800', color: '#333' },
  primaryButton: { backgroundColor: '#4CAF50', paddingVertical: 17, borderRadius: 18, alignItems: 'center', marginTop: 6 },
  savedButton: { backgroundColor: '#81C784' },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  secondaryButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#4CAF50', paddingVertical: 15, borderRadius: 18, alignItems: 'center', marginTop: 12 },
  secondaryText: { color: '#2E7D32', fontSize: 16, fontWeight: '800' },
  homeButton: { alignItems: 'center', paddingVertical: 18 },
  homeText: { color: '#558B2F', fontWeight: '800' },
});
