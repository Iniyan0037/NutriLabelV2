import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  deleteHistoryItem,
  displayProfile,
  fetchHistory,
  fetchHistoryDetail,
} from '../services/api';

import {
  getHighContrastPreference,
  getStatusConfig,
  goBackSafely,
  theme,
} from '../services/accessibility';

function formatTimestamp(timestamp) {
  if (!timestamp) return 'No timestamp';

  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingKey, setDeletingKey] = useState(null);
  const [highContrast, setHighContrast] = useState(false);

  const colors = theme(highContrast);

  const showMessage = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
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
    } catch (error) {
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

  useFocusEffect(
    useCallback(() => {
      getHighContrastPreference().then(setHighContrast).catch(() => {});
      loadHistory();
    }, [])
  );

  const openHistoryItem = async (item) => {
    try {
      if (item.localOnly || item.analysis_json) {
        navigation.navigate('Results', {
          apiResult: item.analysis_json,
          selectedProfiles: item.profile_used || item.profile || [],
          productName: item.product_name || item.name || 'Saved Analysis',
          ingredientText: item.ingredients || '',
          fromHistory: true,
        });

        return;
      }

      const detail = await fetchHistoryDetail(item.id);

      navigation.navigate('Results', {
        apiResult: detail.analysis_json,
        selectedProfiles: detail.profile_used || [],
        productName: detail.product_name || 'Saved Analysis',
        ingredientText: detail.ingredients || '',
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

      if (item.localOnly || item.analysis_json?.localOnly) {
        await removeLocalHistoryItem(item);
      } else {
        await deleteHistoryItem(item.id);
      }

      setHistory((current) =>
        current.filter((historyItem) => {
          const historyKey = `${historyItem.id}-${historyItem.timestamp || historyItem.date}`;
          return historyKey !== key;
        })
      );

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
      const confirmed = window.confirm(
        `Are you sure you want to remove "${itemName}" from history?`
      );

      if (confirmed) {
        await performDeleteHistory(item);
      }

      return;
    }

    Alert.alert(
      'Remove From History',
      `Are you sure you want to remove "${itemName}" from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await performDeleteHistory(item);
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => goBackSafely(navigation, 'Home')}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={26} color={colors.secondary} />
            </Pressable>

            <Text
              style={[styles.title, { color: colors.text }]}
              accessibilityRole="header"
            >
              Analysis History
            </Text>

            <Pressable
              onPress={loadHistory}
              accessibilityRole="button"
              accessibilityLabel="Refresh history"
            >
              <Ionicons name="refresh" size={24} color={colors.secondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.muted }]}>
                Loading history...
              </Text>
            </View>
          ) : history.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="time-outline" size={70} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No History Yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Analysed products will appear here automatically after results are generated.
              </Text>

              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={[styles.primaryText, { color: colors.primaryText }]}>
                  Go Home
                </Text>
              </Pressable>
            </View>
          ) : (
            history.map((item, index) => {
              const result = item.result || item.status || 'Uncertain';
              const statusConfig = getStatusConfig(result);
              const profiles = item.profile_used || item.profile || [];
              const key = `${item.id || index}-${item.timestamp || item.date || index}`;
              const deleteKey = `${item.id}-${item.timestamp || item.date}`;
              const isDeleting = deletingKey === deleteKey;

              return (
                <View
                  key={key}
                  style={[
                    styles.historyCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Pressable
                    onPress={() => openHistoryItem(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.product_name || item.name || 'Product Analysis'}. Status ${statusConfig.label}. Open saved result.`}
                  >
                    <View style={styles.historyTopRow}>
                      <View
                        style={[
                          styles.statusIcon,
                          {
                            backgroundColor: highContrast ? colors.card2 : statusConfig.bg,
                            borderColor: highContrast ? colors.border : statusConfig.color,
                          },
                        ]}
                      >
                        <Ionicons
                          name={statusConfig.icon}
                          size={24}
                          color={highContrast ? colors.primary : statusConfig.color}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.productName, { color: colors.text }]}>
                          {item.product_name || item.name || 'Product Analysis'}
                        </Text>

                        <Text
                          style={[
                            styles.resultText,
                            { color: highContrast ? colors.primary : statusConfig.color },
                          ]}
                        >
                          {statusConfig.textIcon} Status: {statusConfig.label}
                        </Text>
                      </View>

                      <Ionicons name="chevron-forward" size={24} color={colors.muted} />
                    </View>

                    <Text style={[styles.dateText, { color: colors.muted }]}>
                      {formatTimestamp(item.timestamp || item.date)}
                    </Text>

                    <View style={styles.tagsWrap}>
                      {profiles.length > 0 ? (
                        profiles.map((profile) => (
                          <View
                            key={profile}
                            style={[
                              styles.profileTag,
                              { backgroundColor: colors.card2, borderColor: colors.primary },
                            ]}
                          >
                            <Text style={[styles.profileTagText, { color: colors.text }]}>
                              {displayProfile(profile)}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.noProfileText, { color: colors.muted }]}>
                          No profile recorded
                        </Text>
                      )}
                    </View>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.deleteButton,
                      {
                        borderColor: highContrast ? colors.border : '#EF5350',
                        backgroundColor: highContrast ? colors.card2 : '#FFEBEE',
                        opacity: isDeleting ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => handleDeleteHistory(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.product_name || item.name || 'saved result'} from history`}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator color="#EF5350" />
                    ) : (
                      <>
                        <Ionicons name="trash" size={18} color="#EF5350" />
                        <Text style={styles.deleteButtonText}>
                          Remove From History
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  emptyCard: {
    borderRadius: 26,
    padding: 30,
    alignItems: 'center',
    elevation: 3,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 14,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  primaryButton: {
    marginTop: 22,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryText: {
    fontWeight: '900',
  },
  historyCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    borderWidth: 1,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  productName: {
    fontSize: 17,
    fontWeight: '900',
  },
  resultText: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
  },
  dateText: {
    fontSize: 13,
    marginTop: 12,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  profileTag: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  profileTagText: {
    fontWeight: '800',
    fontSize: 12,
  },
  noProfileText: {
    fontSize: 13,
  },
  deleteButton: {
    marginTop: 14,
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteButtonText: {
    color: '#EF5350',
    fontWeight: '900',
  },
});
