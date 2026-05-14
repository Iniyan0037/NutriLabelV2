import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MotionPressable from '../components/MotionPressable';
import { loginAccount, registerAccount } from '../services/api';
import { theme } from '../services/accessibility';

export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const colors = theme(false);

  const submit = async () => {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'Enter a shared login name.';
    if (!pin.trim() || pin.trim().length < 4) nextErrors.pin = 'PIN must be at least 4 characters.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      setLoading(true);
      if (mode === 'login') await loginAccount(name.trim(), pin.trim());
      else await registerAccount(name.trim(), pin.trim());
      navigation.replace('Home');
    } catch (e) {
      setErrors({ form: e.message || 'Could not continue. Check the details and try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#F9FFF4', '#EEF7E8', '#E7F1DE']} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrapper}>
          <View style={styles.brandCard}>
            <Image source={require('../assets/NTlogo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Use one shared student-household login, then keep each person’s profile, history and nutrition logs separate.</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.modeRow}>
              <ModeButton active={mode === 'login'} label="Sign in" onPress={() => setMode('login')} />
              <ModeButton active={mode === 'register'} label="Create login" onPress={() => setMode('register')} />
            </View>

            <Field label="Shared login name" value={name} onChangeText={setName} icon="people-outline" error={errors.name} placeholder="e.g. Unit 5 students" />
            <Field label="PIN" value={pin} onChangeText={setPin} icon="lock-closed-outline" error={errors.pin} placeholder="Enter PIN" secureTextEntry />
            {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

            <MotionPressable onPress={submit} disabled={loading} style={styles.submitBtn}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{mode === 'login' ? 'Sign in' : 'Create shared login'}</Text>}
            </MotionPressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function ModeButton({ active, label, onPress }) {
  return <MotionPressable onPress={onPress} style={[styles.modeBtn, active && styles.modeBtnActive]}><Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text></MotionPressable>;
}

function Field({ label, value, onChangeText, icon, error, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        <Ionicons name={icon} size={19} color="#2E7D32" />
        <TextInput value={value} onChangeText={onChangeText} style={styles.input} placeholderTextColor="#7c8a72" {...props} />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { flex: 1, justifyContent: 'center', padding: 22 },
  brandCard: { alignItems: 'center', marginBottom: 18 },
  logo: { width: 220, height: 82, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: '900', color: '#163C25', letterSpacing: -0.8 },
  subtitle: { textAlign: 'center', color: '#48613D', fontSize: 14, lineHeight: 21, fontWeight: '700', marginTop: 8, maxWidth: 430 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 30, borderWidth: 1, borderColor: '#DDECCF', padding: 18, shadowColor: '#000', shadowOpacity: 0.09, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  modeRow: { flexDirection: 'row', backgroundColor: '#EFF6E8', borderRadius: 20, padding: 5, marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 11, borderRadius: 16, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#2E7D32' },
  modeText: { color: '#52684A', fontWeight: '900' },
  modeTextActive: { color: '#FFFFFF' },
  fieldWrap: { marginBottom: 13 },
  fieldLabel: { fontSize: 12, fontWeight: '900', color: '#163C25', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#DDECCF', borderRadius: 18, paddingHorizontal: 14, backgroundColor: '#FAFDF8' },
  inputError: { borderColor: '#EF5350', backgroundColor: '#FFF6F6' },
  input: { flex: 1, minHeight: 50, fontSize: 15, fontWeight: '700', color: '#163C25' },
  errorText: { color: '#D32F2F', fontWeight: '800', fontSize: 12, marginTop: 5 },
  formError: { color: '#D32F2F', fontWeight: '900', lineHeight: 18, marginBottom: 10 },
  submitBtn: { minHeight: 54, borderRadius: 20, backgroundColor: '#163C25', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
