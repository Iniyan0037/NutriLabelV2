import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAwarenessTips, normalizeProfiles } from '../services/api';

export default function AwarenessTipsScreen({ navigation }) {
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=async()=>{ try{ setError(''); const raw=await AsyncStorage.getItem('PROFILE'); const profiles=raw?normalizeProfiles(JSON.parse(raw)):[]; setData(await fetchAwarenessTips(profiles)); }catch(e){setError(e.message)}finally{setLoading(false)} };
  useFocusEffect(useCallback(()=>{load()},[]));
  return <LinearGradient colors={['#FAFDF8','#EEF7E7']} style={styles.flex}><SafeAreaView style={styles.flex}><ScrollView contentContainerStyle={styles.container}>
    <View style={styles.topRow}><Pressable onPress={()=>navigation.navigate('AwarenessDashboard')}><Ionicons name="arrow-back" size={26} color="#2E7D32" /></Pressable><Text style={styles.topTitle}>Awareness Tips</Text><View style={{width:26}} /></View>
    {loading?<ActivityIndicator color="#4CAF50"/>:error?<Text style={styles.error}>{error}</Text>:(data?.tips||[]).map((tip)=><View key={tip.id} style={styles.card}><View style={styles.tipHeader}><Text style={styles.category}>{tip.category}</Text><Text style={styles.badge}>{tip.relevance || 'general'}</Text></View><Text style={styles.tip}>{tip.tip_text}</Text><Text style={styles.source}>{tip.source || 'NutriLabel awareness rules'}</Text></View>)}
  </ScrollView></SafeAreaView></LinearGradient>;
}
const styles=StyleSheet.create({flex:{flex:1},container:{padding:20,paddingBottom:40},topRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},topTitle:{fontSize:22,fontWeight:'900',color:'#1B5E20'},card:{backgroundColor:'#fff',borderRadius:20,padding:16,borderWidth:1,borderColor:'#DDECCF',marginBottom:12},tipHeader:{flexDirection:'row',justifyContent:'space-between',marginBottom:8},category:{color:'#2E7D32',fontWeight:'900'},badge:{backgroundColor:'#E8F5E9',color:'#1B5E20',paddingHorizontal:10,paddingVertical:3,borderRadius:999,overflow:'hidden',fontWeight:'800'},tip:{color:'#1B5E20',fontWeight:'800',lineHeight:22},source:{color:'#5f6f52',fontWeight:'600',marginTop:8},error:{color:'#D32F2F',fontWeight:'800'}});
