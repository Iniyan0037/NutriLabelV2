import React, { useMemo, useState } from 'react';
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
import {
  generateOnboardingProfile,
  saveProfile,
  displayProfile,
  normalizeProfiles,
} from '../services/api';

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

const ALL_RESTRICTIONS = [
  'vegan',
  'vegetarian',
  'eggetarian',
  'Jain',
  'halal',
  'nut-free',
  'dairy-free',
  'gluten-free',
];

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

export default function QuestionnaireScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [editableRestrictions, setEditableRestrictions] = useState([]);

  const current = QUESTIONS[step];
  const currentAnswer = answers[current.id] || [];

  const progressPercent = useMemo(() => {
    return ((step + 1) / QUESTIONS.length) * 100;
  }, [step]);

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
      const normalisedProfile = normalizeProfiles(result.profile || []);
      setGenerated({
        ...result,
        profile: normalisedProfile,
      });
      setEditableRestrictions(normalisedProfile);
    } catch (error) {
      Alert.alert('Profile generation failed', error.message || 'Could not generate profile.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRestriction = (restriction) => {
    setEditableRestrictions((currentItems) => {
      if (currentItems.includes(restriction)) {
        return currentItems.filter((item) => item !== restriction);
      }

      return [...currentItems, restriction];
    });
  };

  const buildFinalExplanation = () => {
    const explanation = { ...(generated?.explanation || {}) };

    editableRestrictions.forEach((restriction) => {
      if (!explanation[restriction]) {
        explanation[restriction] =
          PROFILE_EXPLANATIONS[restriction] || 'Added manually by the user during profile review.';
      }
    });

    return explanation;
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);

      const finalRestrictions = normalizeProfiles(editableRestrictions);
      const finalExplanation = buildFinalExplanation();

      await AsyncStorage.setItem('PROFILE', JSON.stringify(finalRestrictions));

      if (finalRestrictions.length > 0) {
        await saveProfile('My Dietary Profile', finalRestrictions, finalExplanation);
      }

      navigation.navigate('Home', { profile: finalRestrictions });
    } catch (error) {
      Alert.alert('Save failed', error.message || 'Could not save profile.');
    } finally {
      setLoading(false);
    }
  };

  const restartQuestionnaire = () => {
    setGenerated(null);
    setEditableRestrictions([]);
    setStep(0);
  };

  if (generated) {
    return (
      <LinearGradient colors={['#FAFDF8', '#E8F5E9']} style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Your Generated Profile</Text>
            <Text style={styles.subtitle}>
              Review the generated restrictions. You can add or remove restrictions before saving.
            </Text>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Profile Summary</Text>

              {editableRestrictions.length > 0 ? (
                editableRestrictions.map((profile) => (
                  <View key={profile} style={styles.profileRow}>
                    <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileName}>{displayProfile(profile)}</Text>
                      <Text style={styles.profileReason}>
                        {generated.explanation?.[profile] ||
                          PROFILE_EXPLANATIONS[profile] ||
                          'Added during profile review.'}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No restrictions are currently selected.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Edit Restrictions</Text>
              <Text style={styles.sectionHelper}>
                Toggle restrictions below to make sure the profile matches your actual needs.
              </Text>

              <View style={styles.restrictionGrid}>
                {ALL_RESTRICTIONS.map((restriction) => {
                  const selected = editableRestrictions.includes(restriction);

                  return (
                    <Pressable
                      key={restriction}
                      style={[styles.restrictionChip, selected && styles.restrictionChipSelected]}
                      onPress={() => toggleRestriction(restriction)}
                    >
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={selected ? '#fff' : '#4CAF50'}
                      />
                      <Text
                        style={[
                          styles.restrictionChipText,
                          selected && styles.restrictionChipTextSelected,
                        ]}
                      >
                        {displayProfile(restriction)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable style={styles.primaryButton} onPress={handleConfirm} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Confirm & Save Profile</Text>
              )}
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => setGenerated(null)} disabled={loading}>
              <Text style={styles.secondaryText}>Edit Last Answer</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={restartQuestionnaire} disabled={loading}>
              <Text style={styles.secondaryText}>Restart Questionnaire</Text>
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

          <View style={styles.progressOuter}>
            <View style={[styles.progressInner, { width: `${progressPercent}%` }]} />
          </View>

          <View style={[styles.iconCircle, { backgroundColor: `${current.color}20` }]}>
            <Ionicons name={current.icon} size={42} color={current.color} />
          </View>

          <Text style={styles.title}>{current.question}</Text>
          <Text style={styles.subtitle}>
            {current.single ? 'Choose one option.' : 'Choose all that apply.'}
          </Text>

          <View style={styles.optionsBox}>
            {current.options.map((option) => {
              const selected = currentAnswer.includes(option);

              return (
                <Pressable
                  key={option}
                  style={[
                    styles.option,
                    selected && {
                      borderColor: current.color,
                      backgroundColor: `${current.color}12`,
                    },
                  ]}
                  onPress={() => toggleAnswer(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && { color: current.color, fontWeight: '700' },
                    ]}
                  >
                    {option}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={24} color={current.color} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={24} color="#bbb" />
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.primaryButton} onPress={handleNext} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>
                {step === QUESTIONS.length - 1 ? 'Generate Profile' : 'Next'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  stepText: { color: '#558B2F', fontWeight: '700' },
  progressOuter: {
    height: 8,
    backgroundColor: '#DDECCF',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressInner: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 999,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: '#1B5E20',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#5f6f52',
    marginBottom: 24,
    lineHeight: 22,
  },
  optionsBox: { gap: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 18,
  },
  optionText: { fontSize: 17, color: '#333' },
  primaryButton: {
    marginTop: 26,
    backgroundColor: '#4CAF50',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  secondaryButton: {
    marginTop: 14,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryText: { color: '#2E7D32', fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    gap: 14,
    elevation: 3,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1B5E20',
  },
  sectionHelper: {
    color: '#607060',
    lineHeight: 20,
  },
  profileRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  profileName: { fontSize: 18, fontWeight: '800', color: '#1B5E20' },
  profileReason: { marginTop: 4, fontSize: 14, color: '#566', lineHeight: 20 },
  emptyText: { textAlign: 'center', color: '#666', fontSize: 16, lineHeight: 22 },
  restrictionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  restrictionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  restrictionChipSelected: {
    backgroundColor: '#4CAF50',
  },
  restrictionChipText: {
    color: '#2E7D32',
    fontWeight: '800',
  },
  restrictionChipTextSelected: {
    color: '#fff',
  },
});
