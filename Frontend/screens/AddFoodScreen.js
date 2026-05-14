import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { saveFoodLog } from '../services/api';

export default function AddFoodScreen({ route, navigation }) {
  const params = route.params || {};
  const [foodName, setFoodName] = useState(params.productName || '');
  const [servingSize, setServingSize] = useState('1 serving');
  const [calories, setCalories] = useState(String(params.calories || ''));
  const [protein, setProtein] = useState(String(params.protein || ''));
  const [carbs, setCarbs] = useState(String(params.carbs || ''));
  const [fat, setFat] = useState(String(params.fat || ''));
  const [loading, setLoading] = useState(false);
  const show = (t,m) => Platform.OS === 'web' ? window.alert(`${t}\n\n${m}`) : Alert.alert(t,m);
  const save = async () => { if (!foodName.trim()) { show('Food name required','Please enter a food name.'); return; } try { setLoading(true); await saveFoodLog({ food_name: foodName.trim(), serving_size: servingSize, calories, protein, carbs, fat, log_date: new Date().toISOString().slice(0,10), source: params.productName ? 'analysis_result' : 'manual' }); navigation.navigate('Nutrition'); } catch(e) { show('Could not save food', e.message); } finally { setLoading(false); } };
  return <LinearGradient colors={['#FAFDF8','#EEF7E7']} style={styles.flex}><SafeAreaView style={styles.flex}><ScrollView contentContainerStyle={styles.container}>
    <Pressable onPress={() => navigation.navigate('Nutrition')}><Ionicons name="arrow-back" size={26} color="#2E7D32" /></Pressable><Text style={styles.title}>Add Food</Text><Text style={styles.subtitle}>Enter available nutrition values. Leave unknown fields blank.</Text>
    <Field label="Food name" value={foodName} setValue={setFoodName} />
    <Field label="Serving size" value={servingSize} setValue={setServingSize} />
    <Field label="Calories (kcal)" value={calories} setValue={setCalories} keyboardType="numeric" />
    <Field label="Protein (g)" value={protein} setValue={setProtein} keyboardType="numeric" />
    <Field label="Carbs (g)" value={carbs} setValue={setCarbs} keyboardType="numeric" />
    <Field label="Fat (g)" value={fat} setValue={setFat} keyboardType="numeric" />
    <Pressable style={styles.primary} onPress={save} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save to Food Log</Text>}</Pressable>
  </ScrollView></SafeAreaView></LinearGradient>;
}
function Field({ label, value, setValue, keyboardType }) { return <><Text style={styles.label}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={setValue} keyboardType={keyboardType || 'default'} placeholder={label} placeholderTextColor="#6F806B" /></>; }
const styles=StyleSheet.create({flex:{flex:1},container:{padding:20,paddingBottom:40},title:{fontSize:30,fontWeight:'900',color:'#1B5E20',textAlign:'center'},subtitle:{color:'#5f6f52',fontWeight:'700',textAlign:'center',lineHeight:21,marginVertical:12},label:{color:'#1B5E20',fontWeight:'900',marginTop:10,marginBottom:6},input:{backgroundColor:'#fff',borderWidth:2,borderColor:'#DDECCF',borderRadius:16,padding:14,color:'#1B5E20',fontWeight:'700'},primary:{backgroundColor:'#4CAF50',borderRadius:18,paddingVertical:16,alignItems:'center',marginTop:18},primaryText:{color:'#fff',fontWeight:'900'}});
