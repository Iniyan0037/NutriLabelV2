import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAwarenessTips, getActiveProfile } from '../services/api';
import { getHighContrastPreference, theme } from '../services/accessibility';

export default function AwarenessTipsScreen({ navigation }) {
  const [tips, setTips] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [highContrast, setHighContrast] = useState(false);
  useFocusEffect(useCallback(() => { (async () => { try { setError(''); setHighContrast(await getHighContrastPreference()); const active = await getActiveProfile(); const profile = active?.restrictions || active?.profile || []; const data = await fetchAwarenessTips(profile); setTips(Array.isArray(data) ? data : data.tips || []); } catch (e) { setError(e.message); } finally { setLoading(false); } })(); }, []));
  const colors = theme(highContrast);
  return <LinearGradient colors={colors.gradient} style={styles.flex}><SafeAreaView style={styles.flex}><ScrollView contentContainerStyle={styles.container}>
    <View style={styles.topRow}><Pressable onPress={() => navigation.navigate('AwarenessDashboard')}><Ionicons name="arrow-back" size={26} color={colors.primary} /></Pressable><Text style={[styles.topTitle, { color: colors.text }]}>Awareness Tips</Text><View style={{ width:26 }} /></View>
    <View style={[styles.hero,{backgroundColor:colors.card,borderColor:colors.border}]}><Ionicons name="bulb-outline" size={28} color={colors.primary}/><Text style={[styles.title,{color:colors.text}]}>Shop smarter</Text><Text style={[styles.subtitle,{color:colors.muted}]}>Short reminders based on allergens, additives and your active profile where available.</Text></View>
    {loading?<ActivityIndicator color={colors.primary}/>:error?<Text style={[styles.error,{color:colors.danger}]}>{error}</Text>:tips.length?tips.map((tip, index)=><View key={tip.id || index} style={[styles.card,{backgroundColor:colors.card,borderColor:colors.border}]}><Text style={[styles.tipTitle,{color:colors.text}]}>{tip.title || tip.category || `Tip ${index+1}`}</Text><Text style={[styles.body,{color:colors.muted}]}>{tip.content || tip.tip || tip.description}</Text></View>):<Text style={[styles.body,{color:colors.muted}]}>No tips available.</Text>}
  </ScrollView></SafeAreaView></LinearGradient>;
}
const styles=StyleSheet.create({flex:{flex:1},container:{padding:20,paddingBottom:40},topRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},topTitle:{fontSize:22,fontWeight:'900'},hero:{borderWidth:1,borderRadius:24,padding:18,marginBottom:14},title:{fontSize:27,fontWeight:'900',marginTop:8},subtitle:{fontWeight:'700',lineHeight:22,marginTop:6},card:{borderWidth:1,borderRadius:20,padding:16,marginBottom:12},tipTitle:{fontWeight:'900',fontSize:17,marginBottom:6},body:{fontWeight:'700',lineHeight:21},error:{fontWeight:'900'}});
