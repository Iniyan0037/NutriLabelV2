import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchPersonalInsights } from '../services/api';

export default function PersonalInsightsScreen({ navigation }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = async () => { try { setError(''); setData(await fetchPersonalInsights()); } catch(e) { setError(e.message); } finally { setLoading(false); } };
  useFocusEffect(useCallback(() => { load(); }, []));
  const breakdown = data?.result_breakdown || {};
  return <LinearGradient colors={['#FAFDF8','#EEF7E7']} style={styles.flex}><SafeAreaView style={styles.flex}><ScrollView contentContainerStyle={styles.container}>
    <View style={styles.topRow}><Pressable onPress={() => navigation.navigate('AwarenessDashboard')}><Ionicons name="arrow-back" size={26} color="#2E7D32" /></Pressable><Text style={styles.topTitle}>Personal Insights</Text><View style={{width:26}} /></View>
    {loading ? <ActivityIndicator color="#4CAF50" /> : error ? <Text style={styles.error}>{error}</Text> : !data?.has_data ? <View style={styles.card}><Text style={styles.sectionTitle}>No insights yet</Text><Text style={styles.body}>{data?.message || 'Analyse products to see personal awareness insights.'}</Text><Pressable style={styles.primary} onPress={() => navigation.navigate('Scan')}><Text style={styles.primaryText}>Scan Product</Text></Pressable></View> : <>
      <View style={styles.scoreCard}><Text style={styles.score}>{data.safety_score}%</Text><Text style={styles.sectionTitle}>Safety Score</Text><Text style={styles.body}>Based on {data.total_scans} saved results for the active profile.</Text></View>
      <View style={styles.card}><Text style={styles.sectionTitle}>Result Breakdown</Text>{['Safe','Uncertain','Restricted'].map((key) => <View key={key} style={styles.row}><Text style={styles.rowLabel}>{key}</Text><Text style={styles.rowValue}>{breakdown[key] || 0}</Text></View>)}</View>
      <List title="Common Restricted Ingredients" items={data.top_restricted_ingredients} />
      <List title="Common Uncertain Ingredients" items={data.top_uncertain_ingredients} />
    </>}
  </ScrollView></SafeAreaView></LinearGradient>;
}
function List({ title, items = [] }) { return <View style={styles.card}><Text style={styles.sectionTitle}>{title}</Text>{items.length ? items.map((item) => <View key={item.name} style={styles.row}><Text style={styles.rowLabel}>{item.name}</Text><Text style={styles.rowValue}>{item.count}x</Text></View>) : <Text style={styles.body}>No repeated items found.</Text>}</View>; }
const styles = StyleSheet.create({ flex:{flex:1}, container:{padding:20,paddingBottom:40}, topRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14}, topTitle:{fontSize:22,fontWeight:'900',color:'#1B5E20'}, card:{backgroundColor:'#fff',borderRadius:20,padding:16,borderWidth:1,borderColor:'#DDECCF',marginBottom:14}, scoreCard:{backgroundColor:'#fff',borderRadius:24,padding:22,borderWidth:1,borderColor:'#DDECCF',marginBottom:14,alignItems:'center'}, score:{fontSize:46,fontWeight:'900',color:'#4CAF50'}, sectionTitle:{fontSize:19,fontWeight:'900',color:'#1B5E20',marginBottom:8}, body:{color:'#5f6f52',fontWeight:'600',lineHeight:20}, row:{flexDirection:'row',justifyContent:'space-between',borderTopWidth:1,borderTopColor:'#DDECCF',paddingTop:10,marginTop:10}, rowLabel:{color:'#1B5E20',fontWeight:'800',textTransform:'capitalize'}, rowValue:{color:'#2E7D32',fontWeight:'900'}, primary:{backgroundColor:'#4CAF50',paddingVertical:15,borderRadius:16,alignItems:'center',marginTop:14}, primaryText:{color:'#fff',fontWeight:'900'}, error:{color:'#D32F2F',fontWeight:'800'} });
