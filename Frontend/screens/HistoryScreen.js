import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchHistory, fetchHistoryDetail, displayProfile } from '../services/api';

function statusColor(status) {
  if (status === 'Safe' || status === 'Allowed') return '#4CAF50';
  if (status === 'Restricted') return '#EF5350';
  return '#FF9800';
}

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const serverHistory = await fetchHistory();
      setHistory(serverHistory);
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

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const openHistoryItem = async (item) => {
    try {
      if (item.localOnly || item.analysis_json) {
        navigation.navigate('Results', {
          apiResult: item.analysis_json,
          selectedProfiles: item.profile_used || item.profile || [],
          productName: item.product_name || item.name,
          ingredientText: item.ingredients || '',
        });
        return;
      }

      const detail = await fetchHistoryDetail(item.id);
      navigation.navigate('Results', {
        apiResult: detail.analysis_json,
        selectedProfiles: detail.profile_used || [],
        productName: detail.product_name,
        ingredientText: detail.ingredients || '',
      });
    } catch (error) {
      Alert.alert('Could not open history', error.message || 'Please try again.');
    }
  };

  return (
    <LinearGradient colors={['#FAFDF8', '#F5FAF0', '#EFF6E8']} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={26} color="#2E7D32" />
            </Pressable>
            <Text style={styles.title}>Analysis History</Text>
            <View style={{ width: 26 }} />
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading history...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="time-outline" size={70} color="#9E9E9E" />
              <Text style={styles.emptyTitle}>No History Yet</Text>
              <Text style={styles.emptyText}>Analysed products will appear here after you save results.</Text>
              <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.primaryText}>Go Home</Text>
              </Pressable>
            </View>
          ) : (
            history.map((item) => {
              const result = item.result || item.status || 'Uncertain';
              const color = statusColor(result);
              const profiles = item.profile_used || item.profile || [];

              return (
                <Pressable key={item.id} style={styles.historyCard} onPress={() => openHistoryItem(item)}>
                  <View style={styles.historyTopRow}>
                    <View style={[styles.statusDot, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{item.product_name || item.name || 'Product Analysis'}</Text>
                      <Text style={[styles.resultText, { color }]}>{result}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#999" />
                  </View>

                  <Text style={styles.dateText}>{item.timestamp || item.date || 'No timestamp'}</Text>

                  <View style={styles.tagsWrap}>
                    {profiles.map((profile) => (
                      <View key={profile} style={styles.profileTag}>
                        <Text style={styles.profileTagText}>{displayProfile(profile)}</Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '900', color: '#1B5E20' },
  centerBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#555' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 26, padding: 30, alignItems: 'center', elevation: 3 },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: '#333', marginTop: 14 },
  emptyText: { color: '#666', textAlign: 'center', lineHeight: 22, marginTop: 8 },
  primaryButton: { marginTop: 22, backgroundColor: '#4CAF50', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 },
  primaryText: { color: '#fff', fontWeight: '900' },
  historyCard: { backgroundColor: '#fff', borderRadius: 22, padding: 18, marginBottom: 14, elevation: 2 },
  historyTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  productName: { fontSize: 17, fontWeight: '900', color: '#222' },
  resultText: { fontSize: 14, fontWeight: '900', marginTop: 3 },
  dateText: { color: '#777', fontSize: 13, marginTop: 12 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  profileTag: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  profileTagText: { color: '#2E7D32', fontWeight: '800', fontSize: 12 },
});
