import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  BackHandler,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generateOnboardingProfile,
  saveProfile,
  displayProfile,
  normalizeProfiles,
} from '../services/api';
import { getHighContrastPreference, goBackSafely, theme } from '../services/accessibility';

const QUESTIONS = [
  { id: 'country', question: 'What is your country of origin?', icon: 'earth', color: '#2196F3', single: true, options: ['China', 'India', 'Australia', 'Other'] },
  { id: 'religious', question: 'Do you follow any religious dietary rules?', icon: 'moon', color: '#9C27B0', single: false, options: ['Halal', 'None'] },
  { id: 'allergies', question: 'Do you have any food allergies or intolerances?', icon: 'warning', color: '#FF9800', single: false, options: ['Dairy', 'Gluten', 'Nuts', 'None'] },
  { id: 'diet', question: 'What is your dietary preference?', icon: 'leaf', color: '#4CAF50', single: true, options: ['Vegan', 'Vegetarian', 'Eggetarian', 'Jain', 'No restriction'] },
];

const ALL_RESTRICTIONS = ['vegan', 'vegetarian', 'eggetarian', 'Jain', 'halal', 'nut-free', 'dairy-free', 'gluten-free'];

const PROFILE_EXPLANATIONS = {
  vegan: 'Avoids animal-derived ingredients such as milk, egg, gelatin and honey.',
  vegetarian: 'Avoids meat, fish and animal slaughter-derived ingredients.',
  eggetarian: 'Allows eggs but avoids meat, fish and other non-egg animal-derived ingredients.',
  Jain: 'Avoids root vegetables and animal-derived ingredients that conflict with Jain restrictions.',
  halal: 'Requires ingredients to comply with halal dietary requirements.',
  'nut-free': 'Avoids nuts and nut-derived ingredients such as peanut, almond, cashew and hazelnut.',
  'dairy-free': 'Avoids dairy-derived ingredients such as milk, whey, casein and lactose.',
  'gluten-free': 'Avoids gluten-containing ingredients such as wheat, barley, rye and malt.',
};

function makeDefaultProfileName(restrictions) {
  if (!restrictions || restrictions.length === 0) return 'My Dietary Profile';
  return restrictions.map(displayProfile).join(' + ');
}

export default function QuestionnaireScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [editableRestrictions, setEditableRestrictions] = useState([]);
  const [profileName, setProfileName] = useState('');
  const [highContrast, setHighContrast] = useState(false);
  const colors = theme(highContrast);

  useEffect(() => {
    getHighContrastPreference().then(setHighContrast).catch(() => {});
  }, []);

  const current = QUESTIONS[step];
  const currentAnswer = answers[current.id] || [];
  const progressPercent = useMemo(() => ((step + 1) / QUESTIONS.length) * 100, [step]);

  const handleBack = () => {
    if (generated) {
      setGenerated(null);
      return true;
    }
    if (step > 0) {
      setStep((currentStep) => currentStep - 1);
      return true;
    }
    goBackSafely(navigation, 'Home');
    return true;
  };

  useFocusEffect(
    React.useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
      return () => subscription.remove();
    }, [step, generated])
  );

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
      next = next.includes(option) ? next.filter((item) => item !== option) : [...next, option];
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
      const normalisedProfile = normalizeProfiles(result.profile || []);
      setGenerated({ ...result, profile: normalisedProfile });
      setEditableRestrictions(normalisedProfile);
      setProfileName(makeDefaultProfileName(normalisedProfile));
    } catch (error) {
      Alert.alert('Profile generation failed', error.message || 'Could not generate profile.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRestriction = (restriction) => {
    setEditableRestrictions((currentItems) => {
      if (currentItems.includes(restriction)) return currentItems.filter((item) => item !== restriction);
      return [...currentItems, restriction];
    });
  };

  const buildFinalExplanation = () => {
    const explanation = { ...(generated?.explanation || {}) };
    editableRestrictions.forEach((restriction) => {
      if (!explanation[restriction]) {
        explanation[restriction] = PROFILE_EXPLANATIONS[restriction] || 'Added manually by the user during profile review.';
      }
    });
    return explanation;
  };

  const handleConfirm = async () => {
    const finalRestrictions = normalizeProfiles(editableRestrictions);
    const finalName = profileName.trim();

    if (!finalName) {
      Alert.alert('Profile name required', 'Please enter a name for this profile before saving.');
      return;
    }
    if (finalRestrictions.length === 0) {
      Alert.alert('No restrictions selected', 'Please select at least one restriction before saving.');
      return;
    }

    try {
      setLoading(true);
      const finalExplanation = buildFinalExplanation();
      const saved = await saveProfile(finalName, finalRestrictions, finalExplanation);
      await AsyncStorage.setItem('PROFILE', JSON.stringify(finalRestrictions));
      await AsyncStorage.setItem('ACTIVE_PROFILE', JSON.stringify(saved));
      navigation.navigate('Home', { profile: finalRestrictions, activeProfile: saved });
    } catch (error) {
      Alert.alert('Save failed', error.message || 'Could not save profile.');
    } finally {
      setLoading(false);
    }
  };

  if (generated) {
    return (
      <LinearGradient colors={colors.gradient} style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.headerRow}>
              <Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel="Back to questionnaire">
                <Ionicons name="arrow-back" size={26} color={colors.secondary} />
              </Pressable>
              <Text style={[styles.stepText, { color: colors.muted }]}>Review Profile</Text>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Your Generated Profile</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Name this profile and adjust restrictions before saving.</Text>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card2, borderColor: colors.border, color: colors.text }]}
                value={profileName}
                onChangeText={setProfileName}
                placeholder="Example: Vegan + Nut-Free"
                placeholderTextColor={colors.muted}
                accessibilityLabel="Profile name input"
              />
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityLabel="Generated profile summary">
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Summary</Text>
              {editableRestrictions.length > 0 ? editableRestrictions.map((profile) => (
                <View key={profile} style={styles.profileRow} accessibilityLabel={`${displayProfile(profile)}. ${generated.explanation?.[profile] || PROFILE_EXPLANATIONS[profile] || 'Added manually.'}`}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.profileName, { color: colors.text }]}>{displayProfile(profile)}</Text>
                    <Text style={[styles.profileReason, { color: colors.muted }]}>{generated.explanation?.[profile] || PROFILE_EXPLANATIONS[profile] || 'Added during profile review.'}</Text>
                  </View>
                </View>
              )) : <Text style={[styles.emptyText, { color: colors.muted }]}>No restrictions are selected.</Text>}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Restrictions</Text>
              <View style={styles.restrictionGrid}>
                {ALL_RESTRICTIONS.map((restriction) => {
                  const selected = editableRestrictions.includes(restriction);
                  return (
                    <Pressable key={restriction} style={[styles.restrictionChip, { borderColor: colors.primary }, selected && { backgroundColor: colors.primary }]} onPress={() => toggleRestriction(restriction)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={`${displayProfile(restriction)} restriction`}>
                      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selected ? colors.primaryText : colors.primary} />
                      <Text style={[styles.restrictionChipText, { color: selected ? colors.primaryText : colors.secondary }]}>{displayProfile(restriction)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleConfirm} disabled={loading} accessibilityRole="button" accessibilityLabel="Confirm and save named profile">
              {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={[styles.primaryText, { color: colors.primaryText }]}>Confirm & Save Profile</Text>}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel={step > 0 ? 'Back to previous question' : 'Back'}>
              <Ionicons name="arrow-back" size={26} color={colors.secondary} />
            </Pressable>
            <Text style={[styles.stepText, { color: colors.muted }]}>Step {step + 1} of {QUESTIONS.length}</Text>
          </View>

          <View style={[styles.progressOuter, { backgroundColor: colors.card2 }]}>
            <View style={[styles.progressInner, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
          </View>

          <View style={[styles.iconCircle, { backgroundColor: highContrast ? '#1B1B1B' : `${current.color}20`, borderColor: colors.border }]}>
            <Ionicons name={current.icon} size={42} color={highContrast ? colors.primary : current.color} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{current.question}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{current.single ? 'Choose one option.' : 'Choose all that apply.'}</Text>

          <View style={styles.optionsBox}>
            {current.options.map((option) => {
              const selected = currentAnswer.includes(option);
              return (
                <Pressable key={option} style={[styles.option, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]} onPress={() => toggleAnswer(option)} accessibilityRole={current.single ? 'radio' : 'checkbox'} accessibilityState={{ checked: selected }} accessibilityLabel={option}>
                  <Text style={[styles.optionText, { color: selected ? colors.text : colors.muted, fontWeight: selected ? '800' : '600' }]}>{option}</Text>
                  <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? colors.primary : colors.muted} />
                </Pressable>
              );
            })}
          </View>

          <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleNext} disabled={loading} accessibilityRole="button" accessibilityLabel={step === QUESTIONS.length - 1 ? 'Generate profile' : 'Next question'}>
            {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={[styles.primaryText, { color: colors.primaryText }]}>{step === QUESTIONS.length - 1 ? 'Generate Profile' : 'Next'}</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  stepText: { fontWeight: '800' },
  progressOuter: { height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 24 },
  progressInner: { height: '100%', borderRadius: 999 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 2 },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  optionsBox: { gap: 14 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, padding: 18, borderRadius: 18 },
  optionText: { fontSize: 17 },
  input: { borderWidth: 2, borderRadius: 16, padding: 14, fontSize: 16, fontWeight: '700' },
  primaryButton: { marginTop: 26, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  primaryText: { fontSize: 17, fontWeight: '900' },
  card: { borderRadius: 22, padding: 18, gap: 14, elevation: 3, marginBottom: 18, borderWidth: 1 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  profileRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 8 },
  profileName: { fontSize: 18, fontWeight: '900' },
  profileReason: { marginTop: 4, fontSize: 14, lineHeight: 20 },
  emptyText: { textAlign: 'center', fontSize: 16, lineHeight: 22 },
  restrictionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  restrictionChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  restrictionChipText: { fontWeight: '900' },
});
