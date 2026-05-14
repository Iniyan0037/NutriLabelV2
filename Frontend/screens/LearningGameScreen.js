import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { displayProfile, getActiveProfile, normalizeProfiles } from '../services/api';

const CARD_BANK = [
  { id: 'milk', name: 'Skim milk powder', emoji: '🥛', tags: ['vegan', 'dairy-free'], status: 'Restricted', reason: 'Milk is animal-derived and is also a dairy allergen.' },
  { id: 'hazelnut', name: 'Hazelnuts', emoji: '🌰', tags: ['nut-free'], status: 'Restricted', reason: 'Hazelnut is a tree nut, so it is risky for a nut-free profile.' },
  { id: 'gelatin', name: 'Gelatin', emoji: '🍬', tags: ['vegan', 'vegetarian', 'halal', 'Jain'], status: 'Uncertain', reason: 'Gelatin can be animal-derived. The source must be checked for vegan, halal, Jain, and vegetarian users.' },
  { id: 'lecithin', name: 'Soy lecithin / E322', emoji: '🧪', tags: ['soy-aware'], status: 'Uncertain', reason: 'Lecithin may come from soy. It is usually okay for many diets, but soy-allergic users should check it.' },
  { id: 'wheat', name: 'Wheat flour', emoji: '🌾', tags: ['gluten-free'], status: 'Restricted', reason: 'Wheat contains gluten and is not suitable for a gluten-free profile.' },
  { id: 'honey', name: 'Honey', emoji: '🍯', tags: ['vegan'], status: 'Restricted', reason: 'Honey is animal-produced, so many vegan users avoid it.' },
  { id: 'dates', name: 'Dates', emoji: '🌴', tags: ['safe-general'], status: 'Safe', reason: 'Dates are usually plant-based and not a common major allergen, but packaging should still be checked.' },
  { id: 'palm-oil', name: 'Vegetable oil', emoji: '🫒', tags: ['safe-general'], status: 'Safe', reason: 'Vegetable oil is usually plant-based, though some users may still consider health or sustainability factors.' },
  { id: 'e120', name: 'E120 carmine', emoji: '🔴', tags: ['vegan', 'vegetarian', 'Jain'], status: 'Restricted', reason: 'E120/carmine is insect-derived, so it is restricted for vegan, vegetarian, and Jain profiles.' },
  { id: 'alcohol', name: 'Alcohol flavour', emoji: '🍾', tags: ['halal'], status: 'Restricted', reason: 'Alcohol-based flavouring can be restricted for halal users.' },
];

const FALLBACK_PROFILE = 'vegan';
const PREVIEW_SECONDS = 6;

function buildMission(profile) {
  const value = normalizeProfiles([profile])[0] || FALLBACK_PROFILE;
  const missionText = {
    vegan: 'Find the hidden cards that are risky for a vegan profile.',
    vegetarian: 'Find the hidden cards that are risky for a vegetarian profile.',
    eggetarian: 'Find the hidden cards that may need extra checking for an eggetarian profile.',
    halal: 'Find the hidden cards that are restricted or need source checking for a halal profile.',
    Jain: 'Find the hidden cards that are restricted or need source checking for a Jain profile.',
    'nut-free': 'Find the hidden cards that are risky for a nut-free profile.',
    'dairy-free': 'Find the hidden cards that are risky for a dairy-free profile.',
    'gluten-free': 'Find the hidden cards that are risky for a gluten-free profile.',
    kosher: 'Find the hidden cards that may need source checking for a kosher profile.',
  };
  return { profile: value, title: missionText[value] || `Find cards that may be risky for ${displayProfile(value)}.` };
}

function pickRoundCards(profile, round) {
  const targetCards = CARD_BANK.filter((card) => card.tags.includes(profile));
  const distractors = CARD_BANK.filter((card) => !card.tags.includes(profile));
  const rotatedTargets = [...targetCards.slice(round % Math.max(targetCards.length, 1)), ...targetCards.slice(0, round % Math.max(targetCards.length, 1))];
  const rotatedDistractors = [...distractors.slice((round * 2) % Math.max(distractors.length, 1)), ...distractors.slice(0, (round * 2) % Math.max(distractors.length, 1))];
  return [...rotatedTargets.slice(0, 3), ...rotatedDistractors.slice(0, 5)]
    .sort((a, b) => (a.id > b.id ? 1 : -1))
    .sort((_, index) => (index % 2 === 0 ? -1 : 1));
}

export default function LearningGameScreen({ navigation }) {
  const [stage, setStage] = useState('start');
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [countdown, setCountdown] = useState(PREVIEW_SECONDS);

  useEffect(() => {
    getActiveProfile().then(setActiveProfile).catch(() => setActiveProfile(null));
  }, []);

  const profileList = normalizeProfiles(activeProfile?.restrictions || activeProfile?.profile || []);
  const mission = buildMission(profileList[round % Math.max(profileList.length, 1)] || FALLBACK_PROFILE);
  const roundCards = useMemo(() => pickRoundCards(mission.profile, round), [mission.profile, round]);
  const correctIds = useMemo(() => roundCards.filter((card) => card.tags.includes(mission.profile)).map((card) => card.id), [roundCards, mission.profile]);
  const correctSelected = selected.filter((id) => correctIds.includes(id)).length;
  const wrongSelected = selected.filter((id) => !correctIds.includes(id)).length;
  const missed = correctIds.filter((id) => !selected.includes(id)).length;
  const score = Math.max(correctSelected - wrongSelected, 0);

  useEffect(() => {
    if (stage !== 'memorise') return undefined;
    setCountdown(PREVIEW_SECONDS);
    const interval = setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          clearInterval(interval);
          setStage('recall');
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, round]);

  const startRound = () => {
    setSelected([]);
    setStage('memorise');
  };

  const toggle = (id) => setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const nextRound = () => {
    setRound((value) => value + 1);
    setSelected([]);
    setStage('memorise');
  };

  const profileLabel = displayProfile(mission.profile);

  return (
    <LinearGradient colors={['#FAFDF8', '#EEF7E7', '#DCEFCF']} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topRow}>
            <Pressable onPress={() => navigation.navigate('Home')}><Ionicons name="arrow-back" size={26} color="#2E7D32" /></Pressable>
            <Text style={styles.topTitle}>Memory Game</Text>
            <View style={{ width: 26 }} />
          </View>

          <Text style={styles.title}>Profile Memory Challenge</Text>
          <Text style={styles.subtitle}>A quick memory game based on your selected dietary profile, not random quiz questions.</Text>

          {stage === 'start' ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Why play?</Text>
              <Text style={styles.body}>This game trains you to notice ingredients that commonly affect your own profile before you scan products in real life.</Text>
              <View style={styles.profilePill}><Ionicons name="person-circle" size={20} color="#2E7D32" /><Text style={styles.profilePillText}>Current mission profile: {profileLabel}</Text></View>
              <Pressable style={styles.primary} onPress={() => setStage('instructions')}><Text style={styles.primaryText}>How to Play</Text></Pressable>
            </View>
          ) : null}

          {stage === 'instructions' ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <Instruction number="1" text="Memorise the ingredient cards while they are visible." />
              <Instruction number="2" text="The cards will hide after the timer ends." />
              <Instruction number="3" text="Select the hidden cards that match your dietary mission." />
              <Instruction number="4" text="Read the feedback so you learn why each item matters." />
              <Pressable style={styles.primary} onPress={startRound}><Text style={styles.primaryText}>Start Memory Round</Text></Pressable>
            </View>
          ) : null}

          {stage === 'memorise' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Memorise these cards</Text>
                <Text style={styles.mission}>{mission.title}</Text>
                <Text style={styles.timer}>{countdown}s</Text>
              </View>
              <View style={styles.grid}>{roundCards.map((card) => <VisibleCard key={card.id} card={card} />)}</View>
            </>
          ) : null}

          {stage === 'recall' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Now recall</Text>
                <Text style={styles.mission}>{mission.title}</Text>
                <Text style={styles.body}>The ingredient names are hidden. Use memory and the small icons to choose.</Text>
              </View>
              <View style={styles.grid}>{roundCards.map((card, index) => <HiddenCard key={card.id} card={card} index={index} selected={selected.includes(card.id)} onPress={() => toggle(card.id)} />)}</View>
              <Pressable style={[styles.primary, !selected.length && { opacity: 0.5 }]} onPress={() => setStage('feedback')} disabled={!selected.length}><Text style={styles.primaryText}>Check Answer</Text></Pressable>
            </>
          ) : null}

          {stage === 'feedback' ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Round Feedback</Text>
              <Text style={styles.score}>Score: {score}/{correctIds.length}</Text>
              <Text style={styles.body}>{missed ? `You missed ${missed} risky card${missed > 1 ? 's' : ''}.` : 'You found all risky cards for this profile.'}</Text>
              {roundCards.map((card) => {
                const shouldShow = correctIds.includes(card.id) || selected.includes(card.id);
                if (!shouldShow) return null;
                const correct = correctIds.includes(card.id);
                const chosen = selected.includes(card.id);
                return (
                  <View key={card.id} style={styles.feedbackRow}>
                    <Text style={styles.feedbackName}>{correct ? '✅' : '❌'} {card.name}{chosen ? ' — selected' : ' — missed'}</Text>
                    <Text style={styles.body}>{card.reason}</Text>
                  </View>
                );
              })}
              <Pressable style={styles.primary} onPress={nextRound}><Text style={styles.primaryText}>Play Another Profile Round</Text></Pressable>
              <Pressable style={styles.secondary} onPress={() => navigation.navigate('Home')}><Text style={styles.secondaryText}>Exit Game</Text></Pressable>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Instruction({ number, text }) {
  return <View style={styles.instructionRow}><Text style={styles.instructionNumber}>{number}</Text><Text style={styles.instructionText}>{text}</Text></View>;
}

function VisibleCard({ card }) {
  return <View style={styles.gameCard}><Text style={styles.emoji}>{card.emoji}</Text><Text style={styles.cardName}>{card.name}</Text><Text style={styles.cardStatus}>{card.status}</Text></View>;
}

function HiddenCard({ card, index, selected, onPress }) {
  return <Pressable style={[styles.gameCard, selected && styles.selected]} onPress={onPress}><Text style={styles.emoji}>{card.emoji}</Text><Text style={styles.cardName}>Hidden card {index + 1}</Text><Text style={styles.cardStatus}>{selected ? 'Selected' : 'Tap if risky'}</Text></Pressable>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  topTitle: { fontSize: 22, fontWeight: '900', color: '#1B5E20' },
  title: { fontSize: 30, fontWeight: '900', color: '#1B5E20', textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#5f6f52', fontWeight: '700', marginVertical: 12, lineHeight: 21 },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#DDECCF', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#1B5E20', marginBottom: 8 },
  body: { color: '#5f6f52', lineHeight: 21, fontWeight: '600' },
  mission: { fontSize: 17, color: '#1B5E20', fontWeight: '900', lineHeight: 24 },
  timer: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: '#E8F5E9', color: '#1B5E20', fontWeight: '900', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  profilePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5E9', padding: 12, borderRadius: 16, marginTop: 14 },
  profilePillText: { color: '#1B5E20', fontWeight: '900' },
  instructionRow: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'flex-start' },
  instructionNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4CAF50', color: '#fff', textAlign: 'center', textAlignVertical: 'center', fontWeight: '900', paddingTop: 4 },
  instructionText: { flex: 1, color: '#5f6f52', fontWeight: '700', lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  gameCard: { width: '47%', minHeight: 150, backgroundColor: '#fff', borderRadius: 20, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#DDECCF' },
  selected: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  emoji: { fontSize: 38 },
  cardName: { color: '#1B5E20', fontWeight: '900', textAlign: 'center', marginTop: 8 },
  cardStatus: { color: '#5f6f52', fontWeight: '700', fontSize: 12, marginTop: 4, textAlign: 'center' },
  primary: { backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: '900' },
  secondary: { borderWidth: 2, borderColor: '#4CAF50', paddingVertical: 15, borderRadius: 18, alignItems: 'center', marginTop: 10 },
  secondaryText: { color: '#2E7D32', fontWeight: '900' },
  score: { fontSize: 22, fontWeight: '900', color: '#2E7D32', marginBottom: 10 },
  feedbackRow: { borderTopWidth: 1, borderTopColor: '#DDECCF', paddingTop: 10, marginTop: 10 },
  feedbackName: { color: '#1B5E20', fontWeight: '900', marginBottom: 4 },
});
