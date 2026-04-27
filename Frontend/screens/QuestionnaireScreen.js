import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateOnboardingProfile, saveProfile, displayProfile } from '../services/api';

const QUESTIONS = [
  {
    id: 'country',
    question: 'What is your country of origin?',
    icon: 'earth',
    color: '#2196F3',
    single: true,
    options: ['China', 'India', 'Australia', 'Other'],
  },
  {
    id: 'religious',
    question: 'Do you follow any religious dietary rules?',
    icon: 'moon',
    color: '#9C27B0',
    single: false,
    options: ['Halal', 'None'],
  },
  {
    id: 'allergies',
    question: 'Do you have any food allergies or intolerances?',
    icon: 'warning',
    color: '#FF9800',
    single: false,
    options: ['Dairy', 'Gluten', 'Nuts', 'None'],
  },
  {
    id: 'diet',
    question: 'What is your dietary preference?',
    icon: 'leaf',
    color: '#4CAF50',
    single: true,
    options: ['Vegan', 'Vegetarian', 'Eggetarian', 'Jain', 'No restriction'],
  },
];

export default function QuestionnaireScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);

  const current = QUESTIONS[step];
  const currentAnswer = answers[current.id] || [];

  const toggleAnswer = (option) => {
    const isNone = option === 'None' || option === 'No restriction';

    if (current.single) {
      setAnswers({ ...answers, [current.id]: [option] });
      return;
    }

    let next = Array.isArray(currentAnswer) ? [...currentAnswer] : [];
    const hasNone = next.includes('None') || next.includes('No restriction');

    if (isNone) {
      next = [option];
    } else {
      if (hasNone) next = [];
      next = next.includes(option)
        ? next.filter((item) => item !== option)
        : [...next, option];
    }

    setAnswers({ ...answers, [current.id]: next });
  };

  const buildPayload = () => {
    const dietAnswer = (answers.diet || [])[0] || '';
    const religious = (answers.religious || []).filter((item) => item !== 'None');
    const allergies = (answers.allergies || []).filter((item) => item !== 'None');

    return {
      country: (answers.country || [])[0] || '',
      diet: dietAnswer === 'No restriction' ? '' : dietAnswer.toLowerCase(),
      religious: religious.map((item) => item.toLowerCase()),
      allergies: allergies.map((item) => item.toLowerCase()),
    };
  };

  const handleNext = async () => {
    if (!currentAnswer || currentAnswer.length === 0) {
      Alert.alert('Answer required', 'Please answer this question before continuing.');
      return;
    }

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }

    try {
      setLoading(true);
      const result = await generateOnboardingProfile(buildPayload());
      setGenerated(result);
    } catch (error) {
      Alert.alert('Profile generation failed', error.message || 'Could not generate profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!generated?.profile?.length) {
      navigation.navigate('Home', { profile: [] });
      return;
    }

    try {
      setLoading(true);
      await saveProfile('My Dietary Profile', generated.profile, generated.explanation || {});
      await AsyncStorage.setItem('PROFILE', JSON.stringify(generated.profile));
      navigation.navigate('Home', { profile: generated.profile });
    } catch (error) {
      Alert.alert('Save failed', error.message || 'Could not save profile.');
    } finally {
      setLoading(false);
    }
  };

  if (generated) {
    return (
      <LinearGradient colors={['#FAFDF8', '#E8F5E9']} style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Your Generated Profile</Text>
            <Text style={styles.subtitle}>Review the restrictions created from your answers.</Text>

            <View style={styles.card}>
              {generated.profile.length > 0 ? (
                generated.profile.map((profile) => (
                  <View key={profile} style={styles.profileRow}>
                    <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileName}>{displayProfile(profile)}</Text>
                      <Text style={styles.profileReason}>
                        {generated.explanation?.[profile] || 'Selected based on your questionnaire answers.'}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No restrictions were generated.</Text>
              )}
            </View>

            <Pressable style={styles.primaryButton} onPress={handleConfirm} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Confirm & Save Profile</Text>}
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => setGenerated(null)} disabled={loading}>
              <Text style={styles.secondaryText}>Edit Answers</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#FAFDF8', '#F5FAF0', '#EFF6E8']} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => (step > 0 ? setStep(step - 1) : navigation.goBack())}>
              <Ionicons name="arrow-back" size={26} color="#2E7D32" />
            </Pressable>
            <Text style={styles.stepText}>Step {step + 1} of {QUESTIONS.length}</Text>
          </View>

          <View style={[styles.iconCircle, { backgroundColor: current.color + '20' }]}>
            <Ionicons name={current.icon} size={42} color={current.color} />
          </View>

          <Text style={styles.title}>{current.question}</Text>
          <Text style={styles.subtitle}>{current.single ? 'Choose one option.' : 'Choose all that apply.'}</Text>

          <View style={styles.optionsBox}>
            {current.options.map((option) => {
              const selected = currentAnswer.includes(option);
              return (
                <Pressable
                  key={option}
                  style={[styles.option, selected && { borderColor: current.color, backgroundColor: current.color + '12' }]}
                  onPress={() => toggleAnswer(option)}
                >
                  <Text style={[styles.optionText, selected && { color: current.color, fontWeight: '700' }]}>{option}</Text>
                  {selected ? <Ionicons name="checkmark-circle" size={24} color={current.color} /> : <Ionicons name="ellipse-outline" size={24} color="#bbb" />}
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.primaryButton} onPress={handleNext} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{step === QUESTIONS.length - 1 ? 'Generate Profile' : 'Next'}</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  stepText: { color: '#558B2F', fontWeight: '700' },
  iconCircle: { width: 90, height: 90, borderRadius: 45, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', color: '#1B5E20', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#5f6f52', marginBottom: 24 },
  optionsBox: { gap: 14 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#e0e0e0', backgroundColor: '#fff', padding: 18, borderRadius: 18 },
  optionText: { fontSize: 17, color: '#333' },
  primaryButton: { marginTop: 26, backgroundColor: '#4CAF50', borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  secondaryButton: { marginTop: 14, borderWidth: 2, borderColor: '#4CAF50', borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  secondaryText: { color: '#2E7D32', fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 18, gap: 14, elevation: 3 },
  profileRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 8 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#1B5E20' },
  profileReason: { marginTop: 4, fontSize: 14, color: '#566' },
  emptyText: { textAlign: 'center', color: '#666', fontSize: 16 },
});
