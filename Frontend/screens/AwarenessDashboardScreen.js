import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAllergenDashboard } from '../services/api';

export default function AwarenessDashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { try { setError(''); setData(await fetchAllergenDashboard()); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  useFocusEffect(useCallback(() => { load(); }, []));

  const allergens = data?.allergens || [];
  const max = Math.max(...allergens.map((a) => Number(String(a.prevalence_percent || '1').match(/[0-9.]+/)?.[0] || 1)), 1);

  return <LinearGradient colors={['#FAFDF8', '#EEF7E7']} style={styles.flex}><SafeAreaView style={styles.flex}><ScrollView contentContainerStyle={styles.container}>
    <View style={styles.topRow}><Pressable onPress={() => navigation.navigate('Home')}><Ionicons name="arrow-back" size={26} color="#2E7D32" /></Pressable><Text style={styles.topTitle}>Awareness Dashboard</Text><View style={{ width: 26 }} /></View>
    <Text style={styles.subtitle}>Allergen graphs, additive information, personal insights, and shopping tips.</Text>
    <View style={styles.actions}><Action label="Additives" icon="flask" onPress={() => navigation.navigate('AdditiveInfo')} /><Action label="Personal Insights" icon="analytics" onPress={() => navigation.navigate('PersonalInsights')} /><Action label="Tips" icon="bulb" onPress={() => navigation.navigate('AwarenessTips')} /></View>
    {loading ? <ActivityIndicator color="#4CAF50" /> : error ? <Text style={styles.error}>{error}</Text> : <View style={styles.card}><Text style={styles.sectionTitle}>Common Allergen Categories</Text><Text style={styles.body}>Source: {data?.source || 'Awareness dataset'}. The graph gives a simple awareness summary, not medical advice.</Text>{allergens.length ? allergens.map((item) => { const val = Number(String(item.prevalence_percent || '1').match(/[0-9.]+/)?.[0] || 1); return <View key={item.id} style={styles.barRow}><View style={styles.barHeader}><Text style={styles.barLabel}>{item.icon_label || item.allergen_name}</Text><Text style={styles.barValue}>{item.severity}</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${Math.max((val / max) * 100, 10)}%` }]} /></View><Text style={styles.body}>{item.description}</Text></View>; }) : <Text style={styles.body}>No allergen data available.</Text>}</View>}
  </ScrollView></SafeAreaView></LinearGradient>;
}
function Action({ label, icon, onPress }) { return <Pressable style={styles.action} onPress={onPress}><Ionicons name={icon} size={24} color="#4CAF50" /><Text style={styles.actionText}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ flex:{flex:1}, container:{padding:20,paddingBottom:40}, topRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14}, topTitle:{fontSize:22,fontWeight:'900',color:'#1B5E20'}, subtitle:{color:'#5f6f52',fontWeight:'700',lineHeight:21,textAlign:'center',marginBottom:14}, actions:{flexDirection:'row',gap:10,marginBottom:16}, action:{flex:1,backgroundColor:'#fff',borderWidth:1,borderColor:'#DDECCF',borderRadius:18,padding:12,alignItems:'center',gap:6}, actionText:{color:'#1B5E20',fontWeight:'900',fontSize:12,textAlign:'center'}, card:{backgroundColor:'#fff',borderRadius:22,padding:18,borderWidth:1,borderColor:'#DDECCF'}, sectionTitle:{fontSize:20,fontWeight:'900',color:'#1B5E20',marginBottom:8}, body:{color:'#5f6f52',fontWeight:'600',lineHeight:20,marginTop:6}, barRow:{marginTop:16}, barHeader:{flexDirection:'row',justifyContent:'space-between'}, barLabel:{color:'#1B5E20',fontWeight:'900'}, barValue:{color:'#5f6f52',fontWeight:'700'}, track:{height:12,borderRadius:999,backgroundColor:'#E8F5E9',overflow:'hidden',marginTop:6}, fill:{height:12,backgroundColor:'#4CAF50'}, error:{color:'#D32F2F',fontWeight:'800'} });
