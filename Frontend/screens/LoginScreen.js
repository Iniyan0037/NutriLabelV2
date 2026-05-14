import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { loginAccount, registerAccount } from '../services/api';

export default function LoginScreen({ navigation }) {
  const [familyName, setFamilyName] = useState('');
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);

  const showMessage = (title, message) => Platform.OS === 'web' ? window.alert(`${title}\n\n${message}`) : Alert.alert(title, message);

  const handleSubmit = async () => {
    if (!familyName.trim() || pin.trim().length < 4) {
      showMessage('Details required', 'Enter a family login name and a PIN with at least 4 characters.');
      return;
    }
    try {
      setLoading(true);
      if (mode === 'login') await loginAccount(familyName.trim(), pin.trim());
      else await registerAccount(familyName.trim(), pin.trim());
      navigation.replace('Home');
    } catch (error) {
      showMessage(mode === 'login' ? 'Login failed' : 'Registration failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#FAFDF8', '#F5FAF0', '#EAF5DE']} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
          <View style={styles.iconWrap}><Ionicons name="people-circle" size={74} color="#4CAF50" /></View>
          <Text style={styles.title}>{mode === 'login' ? 'Family Login' : 'Create Family Login'}</Text>
          <Text style={styles.subtitle}>One family login can hold up to six separate dietary profiles. History and food logs stay tied to the selected profile.</Text>

          <TextInput style={styles.input} value={familyName} onChangeText={setFamilyName} placeholder="Family login name" placeholderTextColor="#6F806B" autoCapitalize="words" />
          <TextInput style={styles.input} value={pin} onChangeText={setPin} placeholder="Family PIN" placeholderTextColor="#6F806B" secureTextEntry />

          <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{mode === 'login' ? 'Log In' : 'Create Login'}</Text>}
          </Pressable>

          <Pressable style={styles.switchButton} onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={styles.switchText}>{mode === 'login' ? 'Need a new family login? Create one' : 'Already have a login? Sign in'}</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  iconWrap: { alignSelf: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 30, elevation: 3, marginBottom: 18 },
  title: { textAlign: 'center', fontSize: 34, fontWeight: '900', color: '#1B5E20' },
  subtitle: { textAlign: 'center', marginVertical: 18, lineHeight: 22, color: '#52734D', fontWeight: '700' },
  input: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#DDECCF', borderRadius: 18, padding: 16, marginBottom: 12, fontSize: 16, fontWeight: '700', color: '#1B5E20' },
  primaryButton: { backgroundColor: '#4CAF50', paddingVertical: 17, borderRadius: 18, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 17 },
  switchButton: { paddingVertical: 18, alignItems: 'center' },
  switchText: { color: '#2E7D32', fontWeight: '900' },
});
