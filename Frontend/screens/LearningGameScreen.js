import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { displayProfile, getActiveProfile, normalizeProfiles } from '../services/api';
import { getHighContrastPreference, theme } from '../services/accessibility';

const PREVIEW_SECONDS = 8;
const FALLBACK_PROFILE = 'vegan';

const CARDS = [
  { id: 'milk', name: 'Milk powder', emoji: '🥛', tags: ['vegan', 'dairy-free'], status: 'Restricted', reason: 'Milk is animal-derived and also a dairy allergen.' },
  { id: 'gelatin', name: 'Gelatin', emoji: '🍬', tags: ['vegan', 'vegetarian', 'halal', 'Jain'], status: 'Restricted/uncertain', reason: 'Gelatin can be animal-derived, so the source must be checked.' },
  { id: 'e120', name: 'E120 carmine', emoji: '🔴', tags: ['vegan', 'vegetarian', 'Jain'], status: 'Restricted', reason: 'Carmine is commonly insect-derived.' },
  { id: 'peanut', name: 'Peanut pieces', emoji: '🥜', tags: ['nut-free'], status: 'Restricted', reason: 'Peanut is a major allergen and unsafe for nut-free profiles.' },
  { id: 'hazelnut', name: 'Hazelnut paste', emoji: '🌰', tags: ['nut-free'], status: 'Restricted', reason: 'Hazelnut is a tree nut and must be avoided for nut-free profiles.' },
  { id: 'wheat', name: 'Wheat flour', emoji: '🌾', tags: ['gluten-free'], status: 'Restricted', reason: 'Wheat contains gluten.' },
  { id: 'soy', name: 'Soy lecithin', emoji: '🫘', tags: ['soy-free'], status: 'Caution', reason: 'Soy lecithin may matter for soy allergy depending on sensitivity.' },
  { id: 'egg', name: 'Egg albumen', emoji: '🥚', tags: ['vegan', 'egg-free'], status: 'Restricted', reason: 'Egg is animal-derived and a common allergen.' },
  { id: 'beef', name: 'Beef extract', emoji: '🥩', tags: ['vegan', 'vegetarian', 'Jain'], status: 'Restricted', reason: 'Beef extract is animal-derived.' },
  { id: 'alcohol', name: 'Alcohol flavour', emoji: '🍷', tags: ['halal'], status: 'Restricted/uncertain', reason: 'Alcohol-based flavouring may not suit halal profiles.' },
  { id: 'potato', name: 'Potato starch', emoji: '🥔', tags: ['Jain'], status: 'Restricted', reason: 'Many Jain diets avoid root vegetables and root-derived ingredients.' },
  { id: 'rice', name: 'Rice flour', emoji: '🍚', tags: [], status: 'Usually safe', reason: 'Rice flour is usually not a major dietary restriction risk.' },
  { id: 'sugar', name: 'Sugar', emoji: '🍬', tags: [], status: 'Usually safe', reason: 'Sugar usually needs no restriction unless a specific health profile applies.' },
  { id: 'sunflower', name: 'Sunflower oil', emoji: '🌻', tags: [], status: 'Usually safe', reason: 'Sunflower oil is usually plant-derived.' },
];

function missionFor(profile) {
  return {
    profile,
    title: `Find cards that may be risky for ${displayProfile(profile)}`,
    reason: `This round is based on your selected ${displayProfile(profile)} profile, so the game trains exactly what you need to notice while shopping.`,
  };
}

function pickRoundCards(profile, round) {
  const risky = CARDS.filter((card) => card.tags.includes(profile));
  const fillers = CARDS.filter((card) => !card.tags.includes(profile));
  const rotatedRisky = risky.slice(round % Math.max(risky.length, 1)).concat(risky.slice(0, round % Math.max(risky.length, 1)));
  const rotatedFillers = fillers.slice((round * 2) % fillers.length).concat(fillers.slice(0, (round * 2) % fillers.length));
  return [...rotatedRisky.slice(0, 3), ...rotatedFillers.slice(0, 5)].sort((a, b) => (a.id > b.id ? 1 : -1));
}

export default function LearningGameScreen({ navigation }) {
  const [stage, setStage] = useState('start');
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState([]);
  const [countdown, setCountdown] = useState(PREVIEW_SECONDS);
  const [activeProfile, setActiveProfile] = useState(null);
  const [highContrast, setHighContrast] = useState(false);

  useFocusEffect(useCallback(() => {
    Promise.all([getActiveProfile(), getHighContrastPreference()]).then(([profile, hc]) => {
      setActiveProfile(profile);
      setHighContrast(hc);
    });
  }, []));

  const colors = theme(highContrast);
  const profileList = normalizeProfiles(activeProfile?.restrictions || activeProfile?.profile || []);
  const mission = missionFor(profileList[round % Math.max(profileList.length, 1)] || FALLBACK_PROFILE);
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

  const startRound = () => { setSelected([]); setStage('memorise'); };
  const toggle = (id) => setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  const nextRound = () => { setRound((value) => value + 1); setSelected([]); setStage('memorise'); };
  const profileLabel = displayProfile(mission.profile);

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topRow}><Pressable onPress={() => navigation.navigate('Home')}><Ionicons name="arrow-back" size={26} color={colors.primary} /></Pressable><Text style={[styles.topTitle, { color: colors.text }]}>Memory Game</Text><View style={{ width: 26 }} /></View>

          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Ionicons name="game-controller-outline" size={30} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Profile memory challenge</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>The goal is not random trivia. It trains you to spot risky ingredients for your own selected profile.</Text>
          </View>

          {stage === 'start' ? <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Why play?</Text>
            <Text style={[styles.body, { color: colors.muted }]}>Before scanning in real life, practise remembering which hidden ingredients matter for {profileLabel}. This makes the awareness feature useful instead of just decorative.</Text>
            <View style={[styles.profilePill, { backgroundColor: colors.card2, borderColor: colors.border }]}><Ionicons name="person-circle-outline" size={20} color={colors.primary} /><Text style={[styles.profilePillText, { color: colors.text }]}>Current mission: {profileLabel}</Text></View>
            <Pressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={() => setStage('instructions')}><Text style={[styles.primaryText, { color: colors.primaryText }]}>How to Play</Text></Pressable>
          </View> : null}

          {stage === 'instructions' ? <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions</Text>
            <Instruction colors={colors} number="1" text="Memorise the ingredient cards while they are visible." />
            <Instruction colors={colors} number="2" text="The cards will hide after the timer ends." />
            <Instruction colors={colors} number="3" text="Select hidden cards that match your profile risk." />
            <Instruction colors={colors} number="4" text="Read the explanation so the next product label is easier." />
            <Pressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={startRound}><Text style={[styles.primaryText, { color: colors.primaryText }]}>Start Memory Round</Text></Pressable>
          </View> : null}

          {stage === 'memorise' ? <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>Memorise these cards</Text><Text style={[styles.mission, { color: colors.text }]}>{mission.title}</Text><Text style={[styles.body, { color: colors.muted }]}>{mission.reason}</Text><Text style={[styles.timer, { backgroundColor: colors.card2, color: colors.text, borderColor: colors.border }]}>{countdown}s</Text></View>
            <View style={styles.grid}>{roundCards.map((card) => <VisibleCard key={card.id} colors={colors} card={card} />)}</View>
          </> : null}

          {stage === 'recall' ? <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>Now recall</Text><Text style={[styles.mission, { color: colors.text }]}>{mission.title}</Text><Text style={[styles.body, { color: colors.muted }]}>Ingredient names are hidden. Use memory and the icons to choose.</Text></View>
            <View style={styles.grid}>{roundCards.map((card, index) => <HiddenCard key={card.id} colors={colors} card={card} index={index} selected={selected.includes(card.id)} onPress={() => toggle(card.id)} />)}</View>
            <Pressable style={[styles.primary, { backgroundColor: colors.primary }, !selected.length && { opacity: 0.5 }]} onPress={() => setStage('feedback')} disabled={!selected.length}><Text style={[styles.primaryText, { color: colors.primaryText }]}>Check Answer</Text></Pressable>
          </> : null}

          {stage === 'feedback' ? <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Round feedback</Text>
            <Text style={[styles.score, { color: colors.primary }]}>Score: {score}/{correctIds.length}</Text>
            <Text style={[styles.body, { color: colors.muted }]}>{missed ? `You missed ${missed} risky card${missed > 1 ? 's' : ''}.` : 'You found all risky cards for this profile.'}</Text>
            {roundCards.map((card) => {
              const shouldShow = correctIds.includes(card.id) || selected.includes(card.id);
              if (!shouldShow) return null;
              const correct = correctIds.includes(card.id);
              const chosen = selected.includes(card.id);
              return <View key={card.id} style={[styles.feedbackRow, { borderTopColor: colors.border }]}><Text style={[styles.feedbackName, { color: colors.text }]}>{correct ? '✅' : '❌'} {card.name}{chosen ? ' — selected' : ' — missed'}</Text><Text style={[styles.body, { color: colors.muted }]}>{card.reason}</Text></View>;
            })}
            <Pressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={nextRound}><Text style={[styles.primaryText, { color: colors.primaryText }]}>Play Another Profile Round</Text></Pressable>
            <Pressable style={[styles.secondary, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={() => navigation.navigate('Home')}><Text style={[styles.secondaryText, { color: colors.primary }]}>Exit Game</Text></Pressable>
          </View> : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Instruction({ colors, number, text }) { return <View style={styles.instructionRow}><Text style={[styles.instructionNumber, { backgroundColor: colors.primary, color: colors.primaryText }]}>{number}</Text><Text style={[styles.instructionText, { color: colors.muted }]}>{text}</Text></View>; }
function VisibleCard({ colors, card }) { return <View style={[styles.gameCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={styles.emoji}>{card.emoji}</Text><Text style={[styles.cardName, { color: colors.text }]}>{card.name}</Text><Text style={[styles.cardStatus, { color: colors.muted }]}>{card.status}</Text></View>; }
function HiddenCard({ colors, card, index, selected, onPress }) { return <Pressable style={[styles.gameCard, { backgroundColor: selected ? colors.card2 : colors.card, borderColor: selected ? colors.primary : colors.border }]} onPress={onPress}><Text style={styles.emoji}>{card.emoji}</Text><Text style={[styles.cardName, { color: colors.text }]}>Hidden card {index + 1}</Text><Text style={[styles.cardStatus, { color: selected ? colors.primary : colors.muted }]}>{selected ? 'Selected' : 'Tap if risky'}</Text></Pressable>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { padding: 20, paddingBottom: 40 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, topTitle: { fontSize: 22, fontWeight: '900' },
  hero: { borderRadius: 26, padding: 18, borderWidth: 1, marginBottom: 14 }, title: { fontSize: 28, fontWeight: '900', marginTop: 8 }, subtitle: { fontWeight: '700', lineHeight: 22, marginTop: 6 },
  card: { borderRadius: 22, padding: 18, borderWidth: 1, marginBottom: 16 }, sectionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 }, body: { lineHeight: 21, fontWeight: '700' }, mission: { fontSize: 17, fontWeight: '900', lineHeight: 24 }, timer: { alignSelf: 'flex-start', marginTop: 12, fontWeight: '900', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 }, profilePill: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, marginTop: 14, borderWidth: 1 }, profilePillText: { fontWeight: '900' },
  instructionRow: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'flex-start' }, instructionNumber: { width: 28, height: 28, borderRadius: 14, textAlign: 'center', textAlignVertical: 'center', fontWeight: '900', paddingTop: 4 }, instructionText: { flex: 1, fontWeight: '800', lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }, gameCard: { width: '47%', minHeight: 150, borderRadius: 20, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 }, emoji: { fontSize: 38 }, cardName: { fontWeight: '900', textAlign: 'center', marginTop: 8 }, cardStatus: { fontWeight: '800', fontSize: 12, marginTop: 4, textAlign: 'center' },
  primary: { paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 12 }, primaryText: { fontWeight: '900' }, secondary: { borderWidth: 2, paddingVertical: 15, borderRadius: 18, alignItems: 'center', marginTop: 10 }, secondaryText: { fontWeight: '900' }, score: { fontSize: 22, fontWeight: '900', marginBottom: 10 }, feedbackRow: { borderTopWidth: 1, paddingTop: 10, marginTop: 10 }, feedbackName: { fontWeight: '900', marginBottom: 4 },
});
