import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAdditives } from '../services/api';
import { getHighContrastPreference, theme } from '../services/accessibility';

export default function AdditiveInfoScreen({ navigation }) {
  const [q, setQ] = useState(''); const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [highContrast, setHighContrast] = useState(false);
  const load = async (query = q) => { try { setError(''); setHighContrast(await getHighContrastPreference()); const data = await fetchAdditives({ q: query, perPage: 30 }); setItems(data.items || data.additives || data || []); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  useFocusEffect(useCallback(() => { load(''); }, []));
  const colors = theme(highContrast);
  return <LinearGradient colors={colors.gradient} style={styles.flex}><SafeAreaView style={styles.flex}><ScrollView contentContainerStyle={styles.container}>
    <View style={styles.topRow}><Pressable onPress={()=>navigation.navigate('AwarenessDashboard')}><Ionicons name="arrow-back" size={26} color={colors.primary}/></Pressable><Text style={[styles.topTitle,{color:colors.text}]}>Additives</Text><View style={{width:26}}/></View>
    <View style={[styles.hero,{backgroundColor:colors.card,borderColor:colors.border}]}><Ionicons name="flask-outline" size={28} color={colors.primary}/><Text style={[styles.title,{color:colors.text}]}>Decode E-numbers</Text><Text style={[styles.subtitle,{color:colors.muted}]}>Search additive codes such as E120, E322 or names such as lecithin.</Text></View>
    <View style={[styles.searchBox,{backgroundColor:colors.card,borderColor:colors.border}]}><TextInput style={[styles.search,{color:colors.text}]} value={q} onChangeText={setQ} placeholder="Search E-number or additive" placeholderTextColor={colors.muted}/><Pressable style={[styles.searchBtn,{backgroundColor:colors.primary}]} onPress={()=>load(q)}><Ionicons name="search" size={20} color={colors.primaryText}/></Pressable></View>
    {loading?<ActivityIndicator color={colors.primary}/>:error?<Text style={[styles.error,{color:colors.danger}]}>{error}</Text>:items.length?items.map((item,index)=><View key={item.id || item.e_number || index} style={[styles.card,{backgroundColor:colors.card,borderColor:colors.border}]}><Text style={[styles.addCode,{color:colors.primary}]}>{item.e_number || item.code || 'Additive'}</Text><Text style={[styles.addName,{color:colors.text}]}>{item.name || item.additive_name || 'Unnamed additive'}</Text><Text style={[styles.body,{color:colors.muted}]}>{item.origin ? `Origin: ${item.origin}` : item.category ? `Category: ${item.category}` : 'Check product packaging for final suitability.'}</Text>{item.notes ? <Text style={[styles.body,{color:colors.muted}]}>{item.notes}</Text> : null}</View>):<Text style={[styles.body,{color:colors.muted}]}>No additives found.</Text>}
  </ScrollView></SafeAreaView></LinearGradient>;
}
const styles=StyleSheet.create({flex:{flex:1},container:{padding:20,paddingBottom:40},topRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},topTitle:{fontSize:22,fontWeight:'900'},hero:{borderWidth:1,borderRadius:24,padding:18,marginBottom:14},title:{fontSize:27,fontWeight:'900',marginTop:8},subtitle:{fontWeight:'700',lineHeight:22,marginTop:6},searchBox:{borderWidth:1,borderRadius:18,padding:8,flexDirection:'row',alignItems:'center',marginBottom:14},search:{flex:1,fontWeight:'800',paddingHorizontal:8},searchBtn:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},card:{borderWidth:1,borderRadius:20,padding:16,marginBottom:12},addCode:{fontSize:18,fontWeight:'900'},addName:{fontWeight:'900',fontSize:16,marginTop:3},body:{fontWeight:'700',lineHeight:21,marginTop:6},error:{fontWeight:'900'}});
