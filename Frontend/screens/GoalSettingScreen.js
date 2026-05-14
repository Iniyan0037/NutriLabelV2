import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchNutritionGoals, updateNutritionGoals } from '../services/api';

export default function GoalSettingScreen({ navigation }) {
  const [calories,setCalories]=useState('2000'); const [protein,setProtein]=useState('80'); const [carbs,setCarbs]=useState('250'); const [fat,setFat]=useState('70'); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  useFocusEffect(useCallback(()=>{ fetchNutritionGoals().then(g=>{setCalories(String(Math.round(g.calories||2000)));setProtein(String(Math.round(g.protein||80)));setCarbs(String(Math.round(g.carbs||250)));setFat(String(Math.round(g.fat||70)));}).finally(()=>setLoading(false)); },[]));
  const show=(t,m)=>Platform.OS==='web'?window.alert(`${t}\n\n${m}`):Alert.alert(t,m);
  const save=async()=>{ try{ setSaving(true); await updateNutritionGoals({calories,protein,carbs,fat}); navigation.navigate('Nutrition'); }catch(e){ show('Could not save goals',e.message); }finally{setSaving(false)} };
  return <LinearGradient colors={['#FAFDF8','#EEF7E7']} style={styles.flex}><SafeAreaView style={styles.flex}><ScrollView contentContainerStyle={styles.container}>
    <Pressable onPress={()=>navigation.navigate('Nutrition')}><Ionicons name="arrow-back" size={26} color="#2E7D32" /></Pressable><Text style={styles.title}>Nutrition Goals</Text><Text style={styles.subtitle}>Set simple daily targets for the active profile.</Text>
    {loading?<ActivityIndicator color="#4CAF50"/>:<><Field label="Calories (kcal)" value={calories} setValue={setCalories}/><Field label="Protein (g)" value={protein} setValue={setProtein}/><Field label="Carbs (g)" value={carbs} setValue={setCarbs}/><Field label="Fat (g)" value={fat} setValue={setFat}/><Pressable style={styles.primary} onPress={save} disabled={saving}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>Save Goals</Text>}</Pressable></>}
  </ScrollView></SafeAreaView></LinearGradient>;
}
function Field({label,value,setValue}){return <><Text style={styles.label}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={setValue} keyboardType="numeric" placeholder={label} placeholderTextColor="#6F806B"/></>}
const styles=StyleSheet.create({flex:{flex:1},container:{padding:20,paddingBottom:40},title:{fontSize:30,fontWeight:'900',color:'#1B5E20',textAlign:'center'},subtitle:{color:'#5f6f52',fontWeight:'700',textAlign:'center',lineHeight:21,marginVertical:12},label:{color:'#1B5E20',fontWeight:'900',marginTop:10,marginBottom:6},input:{backgroundColor:'#fff',borderWidth:2,borderColor:'#DDECCF',borderRadius:16,padding:14,color:'#1B5E20',fontWeight:'700'},primary:{backgroundColor:'#4CAF50',borderRadius:18,paddingVertical:16,alignItems:'center',marginTop:18},primaryText:{color:'#fff',fontWeight:'900'}});
