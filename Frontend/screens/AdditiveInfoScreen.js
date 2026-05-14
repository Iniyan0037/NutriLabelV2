import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fetchAdditives } from '../services/api';

export default function AdditiveInfoScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = async (q = query) => { try { setLoading(true); setError(''); setData(await fetchAdditives({ q, perPage: 60 })); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  useEffect(() => { load(''); }, []);
  const additives = data?.additives || [];
  return <LinearGradient colors={['#FAFDF8', '#EEF7E7']} style={styles.flex}><SafeAreaView style={styles.flex}><ScrollView contentContainerStyle={styles.container}>
    <View style={styles.topRow}><Pressable onPress={() => navigation.navigate('AwarenessDashboard')}><Ionicons name="arrow-back" size={26} color="#2E7D32" /></Pressable><Text style={styles.topTitle}>Additives & E-numbers</Text><View style={{ width: 26 }} /></View>
    <Text style={styles.subtitle}>Search additive codes such as E120, E322 or E471 and check basic dietary relevance.</Text>
    <View style={styles.searchRow}><TextInput style={styles.input} value={query} onChangeText={setQuery} placeholder="Search E-number or additive" placeholderTextColor="#6F806B" /><Pressable style={styles.searchButton} onPress={() => load(query)}><Ionicons name="search" size={22} color="#fff" /></Pressable></View>
    {loading ? <ActivityIndicator color="#4CAF50" /> : error ? <Text style={styles.error}>{error}</Text> : additives.length ? additives.map((item) => <View key={item.id} style={styles.card}><Text style={styles.code}>{item.e_number} — {item.name}</Text><Text style={styles.meta}>{item.category || 'Category unavailable'}</Text><Text style={styles.body}>{item.notes || item.origin || 'No extra notes available.'}</Text>{(item.dietary_flags || []).map((flag, idx) => <View key={idx} style={styles.flag}><Text style={styles.flagText}>{flag.profile}: {flag.status}</Text><Text style={styles.body}>{flag.reason}</Text></View>)}</View>) : <Text style={styles.body}>No additive records found.</Text>}
  </ScrollView></SafeAreaView></LinearGradient>;
}
const styles = StyleSheet.create({ flex:{flex:1}, container:{padding:20,paddingBottom:40}, topRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14}, topTitle:{fontSize:21,fontWeight:'900',color:'#1B5E20'}, subtitle:{textAlign:'center',color:'#5f6f52',fontWeight:'700',lineHeight:21,marginBottom:14}, searchRow:{flexDirection:'row',gap:10,marginBottom:14}, input:{flex:1,backgroundColor:'#fff',borderWidth:2,borderColor:'#DDECCF',borderRadius:16,padding:14,color:'#1B5E20',fontWeight:'700'}, searchButton:{backgroundColor:'#4CAF50',borderRadius:16,width:54,alignItems:'center',justifyContent:'center'}, card:{backgroundColor:'#fff',borderWidth:1,borderColor:'#DDECCF',borderRadius:20,padding:16,marginBottom:12}, code:{fontSize:18,fontWeight:'900',color:'#1B5E20'}, meta:{color:'#2E7D32',fontWeight:'900',marginTop:4}, body:{color:'#5f6f52',fontWeight:'600',lineHeight:20,marginTop:6}, flag:{borderTopWidth:1,borderTopColor:'#DDECCF',paddingTop:8,marginTop:8}, flagText:{fontWeight:'900',color:'#D32F2F'}, error:{color:'#D32F2F',fontWeight:'800'} });
