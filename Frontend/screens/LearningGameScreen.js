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
const RISK_CARDS_PER_ROUND = 3;
const SAFE_CARDS_PER_ROUND = 3;

const CARDS = [
  { id: 'milk', name: 'Milk powder', emoji: '🥛', tags: ['vegan', 'dairy-free'], reason: 'Milk is animal-derived and is a dairy allergen.' },
  { id: 'gelatin', name: 'Gelatin', emoji: '🍬', tags: ['vegan', 'vegetarian', 'halal', 'Jain', 'kosher'], reason: 'Gelatin can be animal-derived, so certification or source must be checked.' },
  { id: 'e120', name: 'E120 carmine', emoji: '🔴', tags: ['vegan', 'vegetarian', 'Jain', 'kosher'], reason: 'Carmine is commonly insect-derived.' },
  { id: 'peanut', name: 'Peanut pieces', emoji: '🥜', tags: ['nut-free'], reason: 'Peanut is a major allergen and unsafe for nut-free profiles.' },
  { id: 'hazelnut', name: 'Hazelnut paste', emoji: '🌰', tags: ['nut-free'], reason: 'Hazelnut is a tree nut and must be avoided for nut-free profiles.' },
  { id: 'wheat', name: 'Wheat flour', emoji: '🌾', tags: ['gluten-free'], reason: 'Wheat contains gluten.' },
  { id: 'egg', name: 'Egg albumen', emoji: '🥚', tags: ['vegan', 'Jain'], reason: 'Egg is animal-derived and conflicts with vegan or Jain profiles.' },
  { id: 'beef', name: 'Beef extract', emoji: '🥩', tags: ['vegan', 'vegetarian', 'Jain', 'kosher'], reason: 'Beef extract is animal-derived and may require kosher certification.' },
  { id: 'chicken', name: 'Chicken stock', emoji: '🍗', tags: ['vegan', 'vegetarian', 'Jain', 'kosher'], reason: 'Chicken stock is animal-derived and may require kosher certification.' },
  { id: 'alcohol', name: 'Alcohol flavour', emoji: '🍷', tags: ['halal'], reason: 'Alcohol-based flavouring may not suit halal profiles.' },
  { id: 'potato', name: 'Potato starch', emoji: '🥔', tags: ['Jain'], reason: 'Many Jain diets avoid root vegetables and root-derived ingredients.' },
  { id: 'shellfish', name: 'Shellfish extract', emoji: '🦐', tags: ['vegan', 'vegetarian', 'Jain', 'kosher'], reason: 'Shellfish is animal-derived and is not kosher.' },
  { id: 'pork', name: 'Pork extract', emoji: '🥓', tags: ['halal', 'kosher'], reason: 'Pork-derived ingredients conflict with halal and kosher diets.' },
  { id: 'rennet', name: 'Animal rennet', emoji: '🧀', tags: ['vegan', 'vegetarian', 'halal', 'kosher'], reason: 'Rennet can be animal-derived and may need certification.' },
  { id: 'rice', name: 'Rice flour', emoji: '🍚', tags: [], reason: 'Rice flour is usually not a major dietary restriction risk.' },
  { id: 'sugar', name: 'Sugar', emoji: '🍬', tags: [], reason: 'Sugar usually needs no restriction unless a specific health profile applies.' },
  { id: 'sunflower', name: 'Sunflower oil', emoji: '🌻', tags: [], reason: 'Sunflower oil is usually plant-derived.' },
  { id: 'salt', name: 'Salt', emoji: '🧂', tags: [], reason: 'Salt is usually not a dietary restriction risk.' },
  { id: 'corn', name: 'Corn starch', emoji: '🌽', tags: [], reason: 'Corn starch is usually not restricted for the listed profiles.' },
  { id: 'cocoa', name: 'Cocoa powder', emoji: '🍫', tags: [], reason: 'Cocoa powder is usually not restricted by itself.' },
];

function missionFor(profile) {
  return {
    profile,
    title: `Find hidden risky cards for ${displayProfile(profile)}`,
  };
}

function rotate(list, amount) {
  if (!list.length) return [];
  const cut = amount % list.length;
  return list.slice(cut).concat(list.slice(0, cut));
}

function stableShuffle(list, seed) {
  return [...list].sort((a, b) => {
    const aValue = `${seed}-${a.id}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const bValue = `${seed}-${b.id}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return aValue - bValue;
  });
}

function pickRoundCards(profile, round) {
  const riskyPool = CARDS.filter((card) => card.tags.includes(profile));
  const safePool = CARDS.filter((card) => !card.tags.includes(profile));

  const risky = rotate(riskyPool, round).slice(0, RISK_CARDS_PER_ROUND);
  const safe = rotate(safePool, round * 3).slice(0, SAFE_CARDS_PER_ROUND);

  return stableShuffle([...risky, ...safe], round + profile.length);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

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

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [])
  );

  const profileList = normalizeProfiles(activeProfile?.restrictions || activeProfile?.profile || []);
  const mission = missionFor(profileList[round % Math.max(profileList.length, 1)] || FALLBACK_PROFILE);

  const roundCards = useMemo(
    () => pickRoundCards(mission.profile, round),
    [mission.profile, round]
  );

  const riskyIds = useMemo(
    () => roundCards.filter((card) => card.tags.includes(mission.profile)).map((card) => card.id),
    [roundCards, mission.profile]
  );

  const selectedRisky = selected.filter((id) => riskyIds.includes(id)).length;
  const missed = riskyIds.filter((id) => !selected.includes(id)).length;

  // Final scoring rule:
  // Score is based only on how many mission-risky cards the user selected.
  // Wrong safe-card selections do not reduce the displayed score.
  const score = selectedRisky;
  const totalScore = riskyIds.length;

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

      if (streak.lastPlayed !== today) {
        currentStreak = streak.lastPlayed === yesterday ? currentStreak + 1 : 1;
      }

      const next = {
        lastPlayed: today,
        currentStreak,
        weeklyScore: (streak.weeklyScore || 0) + score,
      };

      setStreak(next);
      setSavedThisRound(true);
      await AsyncStorage.setItem(key, JSON.stringify(next));
    };

    save().catch(() => {});
  }, [stage, savedThisRound, account, activeProfile, score, streak]);

  const startRound = () => {
    setSelected([]);
    setSavedThisRound(false);
    setStage('memorise');
  };

  const toggle = (id) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  };

  const nextRound = () => {
    setRound((value) => value + 1);
    setSelected([]);
    setSavedThisRound(false);
    setStage('memorise');
  };

  return (
    <AppScaffold navigation={navigation} current="LearningGame" title="Memory game">
      {({ colors }) => (
        <>
          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.heroIcon, { backgroundColor: colors.card2, borderColor: colors.border }]}>
              <Ionicons name="game-controller-outline" size={26} color={colors.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>Daily profile practice</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                Memorise the cards, then choose only the hidden cards that are risky for today’s mission.
              </Text>
            </View>
          </View>

          <View style={styles.streakRow}>
            <Stat colors={colors} value={`${streak.currentStreak || 0}`} label="day streak" />
            <Stat colors={colors} value={`${streak.weeklyScore || 0}`} label="weekly score" />
            <Stat colors={colors} value={displayProfile(mission.profile)} label="mission" />
          </View>

          {stage === 'start' ? (
            <Panel colors={colors} title="Why play today?">
              <Text style={[styles.body, { color: colors.muted }]}>
                Each round uses one restriction from your active profile. This helps you recognise risky ingredients faster before shopping or eating.
              </Text>

              <MotionPressable
                style={[styles.primary, { backgroundColor: colors.primary }]}
                onPress={() => setStage('instructions')}
              >
                <Text style={[styles.primaryText, { color: colors.primaryText }]}>Start today’s round</Text>
              </MotionPressable>
            </Panel>
          ) : null}

          {stage === 'instructions' ? (
            <Panel colors={colors} title="How it works">
              <Instruction colors={colors} number="1" text="Study six ingredient cards while the timer is running." />
              <Instruction colors={colors} number="2" text="When time is over, every card flips to a question mark." />
              <Instruction colors={colors} number="3" text="Tap only the cards you remember as risky for the mission profile." />
              <Instruction colors={colors} number="4" text="Build a daily streak by finishing one round each day." />

              <MotionPressable
                style={[styles.primary, { backgroundColor: colors.primary }]}
                onPress={startRound}
              >
                <Text style={[styles.primaryText, { color: colors.primaryText }]}>Begin</Text>
              </MotionPressable>
            </Panel>
          ) : null}

          {stage === 'memorise' ? (
            <>
              <Panel colors={colors} title="Memorise now">
                <Text style={[styles.mission, { color: colors.text }]}>{mission.title}</Text>
                <Text style={[styles.timer, { backgroundColor: colors.card2, color: colors.text, borderColor: colors.border }]}>
                  {countdown}s
                </Text>
              </Panel>

              <View style={styles.grid}>
                {roundCards.map((card) => (
                  <VisibleCard key={card.id} colors={colors} card={card} profile={mission.profile} />
                ))}
              </View>
            </>
          ) : null}

          {stage === 'recall' ? (
            <>
              <Panel colors={colors} title="Cards are hidden">
                <Text style={[styles.mission, { color: colors.text }]}>{mission.title}</Text>
                <Text style={[styles.body, { color: colors.muted }]}>
                  Select the hidden cards you remember as risky.
                </Text>
              </Panel>

              <View style={styles.grid}>
                {roundCards.map((card, index) => (
                  <HiddenCard
                    key={card.id}
                    colors={colors}
                    index={index}
                    selected={selected.includes(card.id)}
                    onPress={() => toggle(card.id)}
                  />
                ))}
              </View>

              <MotionPressable
                disabled={!selected.length}
                style={[styles.primary, { backgroundColor: colors.primary, opacity: selected.length ? 1 : 0.55 }]}
                onPress={() => setStage('feedback')}
              >
                <Text style={[styles.primaryText, { color: colors.primaryText }]}>Check answer</Text>
              </MotionPressable>
            </>
          ) : null}

          {stage === 'feedback' ? (
            <Panel colors={colors} title="Round result">
              <Text style={[styles.score, { color: colors.primary }]}>
                Score {score}/{totalScore}
              </Text>

              <Text style={[styles.body, { color: colors.muted }]}>
                {score === totalScore
                  ? 'You found every risky card for this mission.'
                  : `You found ${score} of ${totalScore} risky cards.`}
              </Text>

              {missed > 0 ? (
                <Text style={[styles.smallNote, { color: colors.muted }]}>
                  Review the missed risky ingredients below.
                </Text>
              ) : null}

              {roundCards
                .filter((card) => riskyIds.includes(card.id) && !selected.includes(card.id))
                .map((card) => (
                  <View key={card.id} style={[styles.feedbackRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.feedbackName, { color: colors.text }]}>
                      ⚠️ {card.name}
                    </Text>
                    <Text style={[styles.body, { color: colors.muted }]}>
                      {card.reason}
                    </Text>
                  </View>
                ))}

              <MotionPressable
                style={[styles.primary, { backgroundColor: colors.primary }]}
                onPress={nextRound}
              >
                <Text style={[styles.primaryText, { color: colors.primaryText }]}>Play another round</Text>
              </MotionPressable>

              <MotionPressable
                style={[styles.secondary, { borderColor: colors.primary, backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('AwarenessDashboard')}
              >
                <Text style={[styles.secondaryText, { color: colors.primary }]}>View awareness charts</Text>
              </MotionPressable>
            </Panel>
          ) : null}
        </>
      )}
    </AppScaffold>
  );
}

function Panel({ colors, title, children }) {
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.panelTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Stat({ colors, value, label }) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={[styles.statValue, { color: colors.primary }]}
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function Instruction({ colors, number, text }) {
  return (
    <View style={styles.instructionRow}>
      <View style={[styles.instructionCircle, { backgroundColor: colors.primary }]}>
        <Text style={[styles.instructionNumber, { color: colors.primaryText }]}>{number}</Text>
      </View>
      <Text style={[styles.instructionText, { color: colors.muted }]}>{text}</Text>
    </View>
  );
}

function VisibleCard({ colors, card, profile }) {
  const risky = card.tags.includes(profile);

  return (
    <View style={[styles.gameCard, { backgroundColor: colors.card, borderColor: risky ? colors.primary : colors.border }]}>
      <Text style={styles.emoji}>{card.emoji}</Text>
      <Text style={[styles.cardName, { color: colors.text }]}>{card.name}</Text>
      <Text style={[styles.cardStatus, { color: risky ? colors.primary : colors.muted }]}>
        {risky ? `Risk for ${displayProfile(profile)}` : 'Not risky for this mission'}
      </Text>
    </View>
  );
}

function HiddenCard({ colors, index, selected, onPress }) {
  return (
    <MotionPressable
      onPress={onPress}
      scaleTo={1.025}
      style={[
        styles.gameCard,
        {
          backgroundColor: selected ? colors.card2 : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.questionMark, { color: colors.primary }]}>?</Text>
      <Text style={[styles.cardName, { color: colors.text }]}>Card {index + 1}</Text>
      <Text style={[styles.cardStatus, { color: selected ? colors.primary : colors.muted }]}>
        {selected ? 'Selected' : 'Hidden'}
      </Text>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    marginTop: 5,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  stat: {
    flex: 1,
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 3,
    textAlign: 'center',
  },
  panel: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  body: {
    lineHeight: 21,
    fontWeight: '700',
  },
  smallNote: {
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  mission: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 23,
  },
  timer: {
    alignSelf: 'flex-start',
    marginTop: 12,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  instructionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  instructionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumber: {
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
  },
  instructionText: {
    flex: 1,
    fontWeight: '800',
    lineHeight: 21,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gameCard: {
    width: '47%',
    height: 150,
    borderRadius: 22,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  emoji: {
    fontSize: 42,
  },
  questionMark: {
    fontSize: 54,
    fontWeight: '900',
  },
  cardName: {
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  cardStatus: {
    fontWeight: '800',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  primary: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryText: {
    fontWeight: '900',
  },
  secondary: {
    borderWidth: 2,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryText: {
    fontWeight: '900',
  },
  score: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },
  feedbackRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
  },
  feedbackName: {
    fontWeight: '900',
    marginBottom: 4,
  },
});