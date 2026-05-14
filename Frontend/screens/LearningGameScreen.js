import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppScaffold from '../components/AppScaffold';
import MotionPressable from '../components/MotionPressable';
import { displayProfile, getActiveProfile, getStoredAccount, normalizeProfiles } from '../services/api';

const PREVIEW_SECONDS = 7;
const FALLBACK_PROFILE = 'vegan';

const CARDS = [
  { id: 'milk', name: 'Milk powder', emoji: '🥛', tags: ['vegan', 'dairy-free'], status: 'Restricted', reason: 'Milk is animal-derived and is also a dairy allergen.' },
  { id: 'gelatin', name: 'Gelatin', emoji: '🍬', tags: ['vegan', 'vegetarian', 'halal', 'Jain'], status: 'Check source', reason: 'Gelatin can be animal-derived, so the source must be checked.' },
  { id: 'e120', name: 'E120 carmine', emoji: '🔴', tags: ['vegan', 'vegetarian', 'Jain'], status: 'Restricted', reason: 'Carmine is commonly insect-derived.' },
  { id: 'peanut', name: 'Peanut pieces', emoji: '🥜', tags: ['nut-free'], status: 'Restricted', reason: 'Peanut is a major allergen and unsafe for nut-free profiles.' },
  { id: 'hazelnut', name: 'Hazelnut paste', emoji: '🌰', tags: ['nut-free'], status: 'Restricted', reason: 'Hazelnut is a tree nut and must be avoided for nut-free profiles.' },
  { id: 'wheat', name: 'Wheat flour', emoji: '🌾', tags: ['gluten-free'], status: 'Restricted', reason: 'Wheat contains gluten.' },
  { id: 'egg', name: 'Egg albumen', emoji: '🥚', tags: ['vegan', 'egg-free'], status: 'Restricted', reason: 'Egg is animal-derived and a common allergen.' },
  { id: 'beef', name: 'Beef extract', emoji: '🥩', tags: ['vegan', 'vegetarian', 'Jain'], status: 'Restricted', reason: 'Beef extract is animal-derived.' },
  { id: 'alcohol', name: 'Alcohol flavour', emoji: '🍷', tags: ['halal'], status: 'Check source', reason: 'Alcohol-based flavouring may not suit halal profiles.' },
  { id: 'potato', name: 'Potato starch', emoji: '🥔', tags: ['Jain'], status: 'Restricted', reason: 'Many Jain diets avoid root vegetables and root-derived ingredients.' },
  { id: 'rice', name: 'Rice flour', emoji: '🍚', tags: [], status: 'Usually safe', reason: 'Rice flour is usually not a major dietary restriction risk.' },
  { id: 'sugar', name: 'Sugar', emoji: '🍬', tags: [], status: 'Usually safe', reason: 'Sugar usually needs no restriction unless a specific health profile applies.' },
  { id: 'sunflower', name: 'Sunflower oil', emoji: '🌻', tags: [], status: 'Usually safe', reason: 'Sunflower oil is usually plant-derived.' },
];

function missionFor(profile) {
  return {
    profile,
    title: `Find hidden risky cards for ${displayProfile(profile)}`,
    reason: `This round uses your active profile so the practice matches what you need to notice on real food labels.`,
  };
}

function pickRoundCards(profile, round) {
  const risky = CARDS.filter((card) => card.tags.includes(profile));
  const fillers = CARDS.filter((card) => !card.tags.includes(profile));
  const a = risky.slice(round % Math.max(risky.length, 1)).concat(risky.slice(0, round % Math.max(risky.length, 1)));
  const b = fillers.slice((round * 2) % fillers.length).concat(fillers.slice(0, (round * 2) % fillers.length));
  return [...a.slice(0, 3), ...b.slice(0, 5)].sort((x, y) => x.id.localeCompare(y.id));
}

function todayKey() { return new Date().toISOString().slice(0, 10); }

export default function LearningGameScreen({ navigation }) {
  const [stage, setStage] = useState('start');
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState([]);
  const [countdown, setCountdown] = useState(PREVIEW_SECONDS);
  const [activeProfile, setActiveProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const [streak, setStreak] = useState({ lastPlayed: '', currentStreak: 0, weeklyScore: 0 });
  const [savedThisRound, setSavedThisRound] = useState(false);

  const load = async () => {
    const [profile, acc] = await Promise.all([getActiveProfile(), getStoredAccount()]);
    setActiveProfile(profile);
    setAccount(acc);
    const key = `GAME_STREAK_${acc?.id || 'guest'}_${profile?.id || 'no_profile'}`;
    const raw = await AsyncStorage.getItem(key);
    setStreak(raw ? JSON.parse(raw) : { lastPlayed: '', currentStreak: 0, weeklyScore: 0 });
  };

  useFocusEffect(useCallback(() => { load().catch(() => {}); }, []));

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

  useEffect(() => {
    if (stage !== 'feedback' || savedThisRound) return;
    const save = async () => {
      const key = `GAME_STREAK_${account?.id || 'guest'}_${activeProfile?.id || 'no_profile'}`;
      const today = todayKey();
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let currentStreak = streak.currentStreak || 0;
      if (streak.lastPlayed !== today) currentStreak = streak.lastPlayed === yesterday ? currentStreak + 1 : 1;
      const next = { lastPlayed: today, currentStreak, weeklyScore: (streak.weeklyScore || 0) + score };
      setStreak(next);
      setSavedThisRound(true);
      await AsyncStorage.setItem(key, JSON.stringify(next));
    };
    save().catch(() => {});
  }, [stage, savedThisRound, account, activeProfile, score, streak]);

  const startRound = () => { setSelected([]); setSavedThisRound(false); setStage('memorise'); };
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const nextRound = () => { setRound((v) => v + 1); setSelected([]); setSavedThisRound(false); setStage('memorise'); };

  return (
    <AppScaffold navigation={navigation} current="LearningGame" title="Memory game">
      {({ colors }) => (
        <>
          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={[styles.heroIcon, { backgroundColor: colors.card2, borderColor: colors.border }]}><Ionicons name="game-controller-outline" size={26} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>Daily profile practice</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>Memorise the cards, then choose which hidden cards are risky for your selected profile.</Text>
            </View>
          </View>

          <View style={styles.streakRow}>
            <Stat colors={colors} value={`${streak.currentStreak || 0}`} label="day streak" />
            <Stat colors={colors} value={`${streak.weeklyScore || 0}`} label="weekly score" />
            <Stat colors={colors} value={displayProfile(mission.profile)} label="mission" />
          </View>

          {stage === 'start' ? <Panel colors={colors} title="Why play today?">
            <Text style={[styles.body, { color: colors.muted }]}>This game turns your profile rules into quick recall practice. The more often you play, the faster you recognise risky ingredients while shopping.</Text>
            <MotionPressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={() => setStage('instructions')}><Text style={[styles.primaryText, { color: colors.primaryText }]}>Start today’s round</Text></MotionPressable>
          </Panel> : null}

          {stage === 'instructions' ? <Panel colors={colors} title="How it works">
            <Instruction colors={colors} number="1" text="Look at the ingredient cards while the timer is running." />
            <Instruction colors={colors} number="2" text="When time is over, every card flips to a question mark." />
            <Instruction colors={colors} number="3" text="Tap the hidden cards you remember as risky for your profile." />
            <Instruction colors={colors} number="4" text="Use the explanation to improve your next real product scan." />
            <MotionPressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={startRound}><Text style={[styles.primaryText, { color: colors.primaryText }]}>Begin</Text></MotionPressable>
          </Panel> : null}

          {stage === 'memorise' ? <>
            <Panel colors={colors} title="Memorise now">
              <Text style={[styles.mission, { color: colors.text }]}>{mission.title}</Text>
              <Text style={[styles.timer, { backgroundColor: colors.card2, color: colors.text, borderColor: colors.border }]}>{countdown}s</Text>
            </Panel>
            <View style={styles.grid}>{roundCards.map((card) => <VisibleCard key={card.id} colors={colors} card={card} />)}</View>
          </> : null}

          {stage === 'recall' ? <>
            <Panel colors={colors} title="Cards are hidden">
              <Text style={[styles.mission, { color: colors.text }]}>{mission.title}</Text>
              <Text style={[styles.body, { color: colors.muted }]}>Ingredient names and icons are now hidden. Tap the cards you remember as risky.</Text>
            </Panel>
            <View style={styles.grid}>{roundCards.map((card, index) => <HiddenCard key={card.id} colors={colors} index={index} selected={selected.includes(card.id)} onPress={() => toggle(card.id)} />)}</View>
            <MotionPressable disabled={!selected.length} style={[styles.primary, { backgroundColor: colors.primary }]} onPress={() => setStage('feedback')}><Text style={[styles.primaryText, { color: colors.primaryText }]}>Check answer</Text></MotionPressable>
          </> : null}

          {stage === 'feedback' ? <Panel colors={colors} title="Round result">
            <Text style={[styles.score, { color: colors.primary }]}>Score {score}/{correctIds.length}</Text>
            <Text style={[styles.body, { color: colors.muted }]}>{missed ? `You missed ${missed} risky card${missed > 1 ? 's' : ''}.` : 'You found all risky cards for this profile.'}</Text>
            {roundCards.map((card) => {
              const shouldShow = correctIds.includes(card.id) || selected.includes(card.id);
              if (!shouldShow) return null;
              const correct = correctIds.includes(card.id);
              const chosen = selected.includes(card.id);
              return <View key={card.id} style={[styles.feedbackRow, { borderTopColor: colors.border }]}><Text style={[styles.feedbackName, { color: colors.text }]}>{correct ? '✅' : '❌'} {card.name}{chosen ? ' — selected' : ' — missed'}</Text><Text style={[styles.body, { color: colors.muted }]}>{card.reason}</Text></View>;
            })}
            <MotionPressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={nextRound}><Text style={[styles.primaryText, { color: colors.primaryText }]}>Play another round</Text></MotionPressable>
            <MotionPressable style={[styles.secondary, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={() => navigation.navigate('AwarenessDashboard')}><Text style={[styles.secondaryText, { color: colors.primary }]}>View awareness charts</Text></MotionPressable>
          </Panel> : null}
        </>
      )}
    </AppScaffold>
  );
}

function Panel({ colors, title, children }) { return <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.panelTitle, { color: colors.text }]}>{title}</Text>{children}</View>; }
function Stat({ colors, value, label }) { return <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}><Text numberOfLines={1} style={[styles.statValue, { color: colors.primary }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text></View>; }
function Instruction({ colors, number, text }) { return <View style={styles.instructionRow}><Text style={[styles.instructionNumber, { backgroundColor: colors.primary, color: colors.primaryText }]}>{number}</Text><Text style={[styles.instructionText, { color: colors.muted }]}>{text}</Text></View>; }
function VisibleCard({ colors, card }) { return <View style={[styles.gameCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={styles.emoji}>{card.emoji}</Text><Text style={[styles.cardName, { color: colors.text }]}>{card.name}</Text><Text style={[styles.cardStatus, { color: colors.muted }]}>{card.status}</Text></View>; }
function HiddenCard({ colors, index, selected, onPress }) { return <MotionPressable onPress={onPress} style={[styles.gameCard, { backgroundColor: selected ? colors.card2 : colors.card, borderColor: selected ? colors.primary : colors.border }]}><Text style={[styles.questionMark, { color: colors.primary }]}>?</Text><Text style={[styles.cardName, { color: colors.text }]}>Card {index + 1}</Text><Text style={[styles.cardStatus, { color: selected ? colors.primary : colors.muted }]}>{selected ? 'Selected' : 'Tap to choose'}</Text></MotionPressable>; }

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 14, borderRadius: 26, padding: 16, borderWidth: 1, marginBottom: 14 },
  heroIcon: { width: 54, height: 54, borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 5 },
  streakRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 20, padding: 12 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginTop: 3 },
  panel: { borderRadius: 24, padding: 18, borderWidth: 1, marginBottom: 14 },
  panelTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  body: { lineHeight: 21, fontWeight: '700' },
  mission: { fontSize: 16, fontWeight: '900', lineHeight: 23 },
  timer: { alignSelf: 'flex-start', marginTop: 12, fontWeight: '900', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  instructionRow: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'flex-start' },
  instructionNumber: { width: 28, height: 28, borderRadius: 14, textAlign: 'center', textAlignVertical: 'center', fontWeight: '900', paddingTop: 4 },
  instructionText: { flex: 1, fontWeight: '800', lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  gameCard: { width: '47%', minHeight: 154, borderRadius: 22, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  emoji: { fontSize: 42 },
  questionMark: { fontSize: 54, fontWeight: '900' },
  cardName: { fontWeight: '900', textAlign: 'center', marginTop: 8 },
  cardStatus: { fontWeight: '800', fontSize: 12, marginTop: 4, textAlign: 'center' },
  primary: { paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 14 },
  primaryText: { fontWeight: '900' },
  secondary: { borderWidth: 2, paddingVertical: 15, borderRadius: 18, alignItems: 'center', marginTop: 10 },
  secondaryText: { fontWeight: '900' },
  score: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  feedbackRow: { borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
  feedbackName: { fontWeight: '900', marginBottom: 4 },
});
