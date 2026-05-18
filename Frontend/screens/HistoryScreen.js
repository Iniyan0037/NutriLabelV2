import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppScaffold from '../components/AppScaffold';
import MotionPressable from '../components/MotionPressable';
import { deleteHistoryItem, displayProfile, fetchHistory, fetchHistoryDetail } from '../services/api';
import { getStatusConfig } from '../services/accessibility';

function formatTimestamp(timestamp) {
  if (!timestamp) return 'No timestamp';
  try { return new Date(timestamp).toLocaleString(); } catch { return timestamp; }
}

function getHistoryImage(item) {
  return item?.product_image_url || item?.image_url || item?.analysis_json?.product_image_url || item?.analysis_json?.image_url || '';
}

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingKey, setDeletingKey] = useState(null);

  const showMessage = (title, message) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const serverHistory = await fetchHistory();
      const local = await AsyncStorage.getItem('HISTORY');
      const localHistory = local ? JSON.parse(local) : [];
      const combined = [...serverHistory, ...localHistory];
      const unique = [];
      const seen = new Set();
      combined.forEach((item) => {
        const key = `${item.id}-${item.product_name || item.name}-${item.timestamp || item.date}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      });
      setHistory(unique);
    } catch {
      try {
        const local = await AsyncStorage.getItem('HISTORY');
        setHistory(local ? JSON.parse(local) : []);
      } catch {
        setHistory([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadHistory(); }, []));

  const openHistoryItem = async (item) => {
    try {
      if (item.localOnly || item.analysis_json) {
        navigation.navigate('Results', {
          apiResult: item.analysis_json,
          selectedProfiles: item.profile_used || item.profile || [],
          productName: item.product_name || item.name || item.analysis_json?.product_name || 'Saved Analysis',
          ingredientText: item.ingredients || item.analysis_json?.ingredient_text || '',
          productImageUrl: getHistoryImage(item),
          fromHistory: true,
        });
        return;
      }
      const detail = await fetchHistoryDetail(item.id);
      navigation.navigate('Results', {
        apiResult: detail.analysis_json,
        selectedProfiles: detail.profile_used || [],
        productName: detail.product_name || detail.analysis_json?.product_name || 'Saved Analysis',
        ingredientText: detail.ingredients || detail.analysis_json?.ingredient_text || '',
        productImageUrl: getHistoryImage(detail),
        fromHistory: true,
      });
    } catch (error) {
      showMessage('Could not open history', error.message || 'Please try again.');
    }
  };

  const removeLocalHistoryItem = async (targetItem) => {
    const local = await AsyncStorage.getItem('HISTORY');
    const localHistory = local ? JSON.parse(local) : [];
    const targetKey = `${targetItem.id}-${targetItem.product_name || targetItem.name}-${targetItem.timestamp || targetItem.date}`;
    const filtered = localHistory.filter((item) => {
      const itemKey = `${item.id}-${item.product_name || item.name}-${item.timestamp || item.date}`;
      return itemKey !== targetKey;
    });
    await AsyncStorage.setItem('HISTORY', JSON.stringify(filtered));
  };

  const performDeleteHistory = async (item) => {
    const key = `${item.id}-${item.timestamp || item.date}`;
    try {
      setDeletingKey(key);
      if (item.localOnly || item.analysis_json?.localOnly) await removeLocalHistoryItem(item);
      else await deleteHistoryItem(item.id);
      setHistory((current) => current.filter((historyItem) => `${historyItem.id}-${historyItem.timestamp || historyItem.date}` !== key));
      showMessage('Removed', 'History item removed successfully.');
    } catch (error) {
      showMessage('Delete failed', error.message || 'Could not remove history item.');
    } finally {
      setDeletingKey(null);
    }
  };

  const handleDeleteHistory = async (item) => {
    const itemName = item.product_name || item.name || 'this saved result';
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove "${itemName}" from history?`)) await performDeleteHistory(item);
      return;
    }
    Alert.alert('Remove From History', `Remove "${itemName}" from history?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => performDeleteHistory(item) },
    ]);
  };

  return (
    <AppScaffold navigation={navigation} current="History" title="History">
      {({ colors, highContrast }) => (
        <>
          {loading ? (
            <View style={[styles.centerBox, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.muted }]}>Loading history...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <Ionicons name="time-outline" size={64} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No history yet</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>Analysed products will appear here for the selected profile.</Text>
              <MotionPressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Analyze')}> 
                <Text style={[styles.primaryText, { color: colors.primaryText }]}>Analyse food</Text>
              </MotionPressable>
            </View>
          ) : (
            <>
              <MotionPressable onPress={loadHistory} style={[styles.refreshButton, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                <Ionicons name="refresh" size={18} color={colors.primary} />
                <Text style={[styles.refreshText, { color: colors.text }]}>Refresh</Text>
              </MotionPressable>
              {history.map((item, index) => {
                const result = item.result || item.status || item.analysis_json?.overall_result || 'Uncertain';
                const statusConfig = getStatusConfig(result);
                const profiles = item.profile_used || item.profile || [];
                const key = `${item.id || index}-${item.timestamp || item.date || index}`;
                const deleteKey = `${item.id}-${item.timestamp || item.date}`;
                const isDeleting = deletingKey === deleteKey;
                const imageUrl = getHistoryImage(item);
                return (
                  <View key={key} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                    <MotionPressable onPress={() => openHistoryItem(item)} scaleTo={1.02} style={styles.historyPress}> 
                      <View style={styles.historyTopRow}>
                        {imageUrl ? (
                          <Image source={{ uri: imageUrl }} style={[styles.productImage, { borderColor: colors.border }]} resizeMode="cover" />
                        ) : (
                          <View style={[styles.statusIcon, { backgroundColor: highContrast ? colors.card2 : statusConfig.bg, borderColor: highContrast ? colors.border : statusConfig.color }]}> 
                            <Ionicons name={statusConfig.icon} size={24} color={highContrast ? colors.primary : statusConfig.color} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={2} style={[styles.productName, { color: colors.text }]}>{item.product_name || item.name || 'Product Analysis'}</Text>
                          <Text style={[styles.resultText, { color: highContrast ? colors.primary : statusConfig.color }]}>{statusConfig.textIcon} {statusConfig.label}</Text>
                          <Text style={[styles.dateText, { color: colors.muted }]}>{formatTimestamp(item.timestamp || item.date)}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color={colors.muted} />
                      </View>
                      <View style={styles.tagsWrap}>
                        {profiles.length > 0 ? profiles.map((profile) => (
                          <View key={profile} style={[styles.profileTag, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
                            <Text numberOfLines={1} style={[styles.profileTagText, { color: colors.text }]}>{displayProfile(profile)}</Text>
                          </View>
                        )) : <Text style={[styles.noProfileText, { color: colors.muted }]}>No profile recorded</Text>}
                      </View>
                    </MotionPressable>
                    <MotionPressable
                      style={[styles.deleteButton, { borderColor: colors.danger, backgroundColor: colors.card2, opacity: isDeleting ? 0.7 : 1 }]}
                      onPress={() => handleDeleteHistory(item)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? <ActivityIndicator color={colors.danger} /> : <><Ionicons name="trash" size={17} color={colors.danger} /><Text style={[styles.deleteButtonText, { color: colors.danger }]}>Remove</Text></>}
                    </MotionPressable>
                  </View>
                );
              })}
            </>
          )}
        </>
      )}
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  centerBox: { borderWidth: 1, borderRadius: 24, padding: 34, alignItems: 'center' },
  loadingText: { marginTop: 12, fontWeight: '800' },
  emptyCard: { borderRadius: 26, padding: 28, alignItems: 'center', borderWidth: 1 },
  emptyTitle: { fontSize: 23, fontWeight: '900', marginTop: 14 },
  emptyText: { textAlign: 'center', lineHeight: 22, marginTop: 8, fontWeight: '700' },
  primaryButton: { minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, marginTop: 18 },
  primaryText: { fontWeight: '900', fontSize: 15 },
  refreshButton: { alignSelf: 'flex-end', minHeight: 40, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  refreshText: { fontWeight: '900' },
  historyCard: { borderRadius: 24, padding: 14, marginBottom: 12, borderWidth: 1 },
  historyPress: { width: '100%' },
  historyTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productImage: { width: 58, height: 58, borderRadius: 16, borderWidth: 1 },
  statusIcon: { width: 58, height: 58, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 16, lineHeight: 20, fontWeight: '900' },
  resultText: { fontSize: 13, fontWeight: '900', marginTop: 3 },
  dateText: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  profileTag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '48%' },
  profileTagText: { fontSize: 11, fontWeight: '900' },
  noProfileText: { fontSize: 12, fontWeight: '800' },
  deleteButton: { minHeight: 42, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12 },
  deleteButtonText: { fontWeight: '900' },
});
