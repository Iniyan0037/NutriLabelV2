import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  displayProfile,
  getRecommendations,
  normalizeProfiles,
  saveHistoryItem,
} from '../services/api';

function getStatusConfig(status) {
  if (status === 'Safe' || status === 'Allowed') {
    return {
      label: 'Safe',
      color: '#4CAF50',
      bg: '#E8F5E9',
      icon: 'checkmark-circle',
      textIcon: '✅',
    };
  }

  if (status === 'Restricted') {
    return {
      label: 'Restricted',
      color: '#EF5350',
      bg: '#FFEBEE',
      icon: 'close-circle',
      textIcon: '❌',
    };
  }

  return {
    label: 'Uncertain',
    color: '#FF9800',
    bg: '#FFF3E0',
    icon: 'help-circle',
    textIcon: '⚠️',
  };
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
      selectedProfiles: normalizeProfiles(
        params.selectedProfiles ||
          params.profile ||
          productResult.analysis?.selected_profiles ||
          []
      ),
      fromHistory: Boolean(params.fromHistory),
    };
  }

  const analysis = apiResult || productResult || {};

  return {
    productName: params.productName || analysis.product_name || 'Manual Analysis',
    ingredientText: params.ingredientText || '',
    analysis,
    selectedProfiles: normalizeProfiles(
      params.selectedProfiles ||
        params.profile ||
        analysis.selected_profiles ||
        []
    ),
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
  const [recommendations, setRecommendations] = useState([]);
  const [autoSaveMessage, setAutoSaveMessage] = useState(
    fromHistory ? 'Viewing saved history result.' : ''
  );

  const hasAutoSaved = useRef(false);

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

  const saveToHistory = async ({ silent = false } = {}) => {
    if (fromHistory) {
      return;
    }

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

      if (!silent) {
        Alert.alert('Saved', 'This analysis has been saved to history.');
      }
    } catch (error) {
      if (!silent) {
        Alert.alert('Save failed', error.message || 'Could not save result.');
      }
      setAutoSaveMessage('Could not save history automatically.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (fromHistory) {
      return;
    }

    if (hasAutoSaved.current) {
      return;
    }

    if (!analysis || Object.keys(analysis).length === 0) {
      return;
    }

    hasAutoSaved.current = true;
    saveToHistory({ silent: true });
  }, []);

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

                <Text style={[styles.rowStatus, { color: rowStatus.color }]}>
                  {rowStatus.textIcon} {rowStatus.label}
                </Text>

                <Text style={styles.reason}>
                  {item.reason || 'No explanation available.'}
                </Text>
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
              <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                {statusConfig.textIcon} {statusConfig.label}
              </Text>
            </View>

            <Text style={styles.summary}>
              {analysis.summary || 'Analysis completed.'}
            </Text>

            {autoSaveMessage ? (
              <View style={styles.saveNotice}>
                <Ionicons
                  name={saved ? 'checkmark-circle' : 'information-circle'}
                  size={18}
                  color={saved ? '#4CAF50' : '#777'}
                />
                <Text style={styles.saveNoticeText}>{autoSaveMessage}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Selected Profiles</Text>

            <View style={styles.tagsWrap}>
              {selectedProfiles.length > 0 ? (
                selectedProfiles.map((profile) => (
                  <View key={profile} style={styles.profileTag}>
                    <Text style={styles.profileTagText}>{displayProfile(profile)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No profile selected</Text>
              )}
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
                  <Ionicons
                    name={rec.type === 'avoid' ? 'warning' : 'checkmark-circle'}
                    size={21}
                    color={rec.type === 'avoid' ? '#EF5350' : '#4CAF50'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recommendItem}>
                      {rec.type === 'avoid' ? 'Avoid: ' : 'Alternative: '}
                      {rec.item}
                    </Text>
                    <Text style={styles.reason}>{rec.reason}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {!fromHistory ? (
            <Pressable
              style={[styles.primaryButton, saved && styles.savedButton]}
              onPress={() => saveToHistory({ silent: false })}
              disabled={saving || saved}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>
                  {saved ? 'Saved to History' : 'Save to History'}
                </Text>
              )}
            </Pressable>
          ) : null}

          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Scan', { selectedProfiles })}
          >
            <Text style={styles.secondaryText}>Scan Another Product</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('ManualInput', { selectedProfiles })}
          >
            <Text style={styles.secondaryText}>Analyse Manual Ingredients</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.secondaryText}>View History</Text>
          </Pressable>

          <Pressable
            style={styles.homeButton}
            onPress={() => navigation.navigate('Home', { profile: selectedProfiles })}
          >
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
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    marginBottom: 18,
  },
  bigIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1B5E20',
    textAlign: 'center',
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    marginTop: 14,
  },
  statusBadgeText: {
    fontSize: 16,
    fontWeight: '900',
  },
  summary: {
    color: '#5a5a5a',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 22,
  },
  saveNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  saveNoticeText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1B5E20',
    marginBottom: 12,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileTag: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  profileTagText: {
    color: '#2E7D32',
    fontWeight: '800',
  },
  emptyText: {
    color: '#777',
    fontSize: 15,
  },
  resultRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 14,
    marginTop: 14,
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#222',
    textTransform: 'capitalize',
  },
  matchText: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  rowStatus: {
    fontWeight: '900',
    marginTop: 5,
  },
  reason: {
    color: '#666',
    marginTop: 5,
    lineHeight: 20,
  },
  recommendRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  recommendItem: {
    fontSize: 16,
    fontWeight: '900',
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 17,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  savedButton: {
    backgroundColor: '#81C784',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryText: {
    color: '#2E7D32',
    fontWeight: '900',
    fontSize: 15,
  },
  homeButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  homeText: {
    color: '#666',
    fontWeight: '800',
  },
});
