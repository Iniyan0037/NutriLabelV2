import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const CARD_BANK = [
  { id: 'milk', name: 'Skim milk powder', emoji: '🥛', tags: ['vegan', 'dairy-free'], status: 'Restricted', reason: 'Milk powder is dairy-derived, so it is restricted for vegan and dairy-free profiles.' },
  { id: 'hazelnut', name: 'Hazelnuts', emoji: '🥜', tags: ['nut-free'], status: 'Restricted', reason: 'Hazelnuts are tree nuts and conflict with nut-free profiles.' },
  { id: 'e120', name: 'E120 Carmine', emoji: '🧪', tags: ['vegan', 'Jain'], status: 'Restricted', reason: 'E120 is commonly insect-derived, so it can conflict with vegan and Jain diets.' },
  { id: 'e322', name: 'E322 Lecithin', emoji: '🏷️', tags: ['vegan', 'halal'], status: 'Uncertain', reason: 'Lecithin may be plant or animal derived, so the source should be checked.' },
  { id: 'rice', name: 'Rice flour', emoji: '🍚', tags: [], status: 'Safe', reason: 'Rice flour is normally plant-derived and has no direct restriction in the current rules.' },
  { id: 'wheat', name: 'Wheat flour', emoji: '🌾', tags: ['gluten-free'], status: 'Restricted', reason: 'Wheat contains gluten and is restricted for gluten-free profiles.' },
];

const MISSIONS = [
  { id: 'vegan', title: 'Select the cards that are risky for a vegan profile.', tag: 'vegan' },
  { id: 'nut-free', title: 'Select the cards that are risky for a nut-free profile.', tag: 'nut-free' },
  { id: 'gluten-free', title: 'Select the cards that are risky for a gluten-free profile.', tag: 'gluten-free' },
  { id: 'halal', title: 'Select cards that may require halal source verification.', tag: 'halal' },
];

export default function LearningGameScreen({ navigation }) {
  const [stage, setStage] = useState('start');
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState([]);
  const mission = MISSIONS[round % MISSIONS.length];
  const correct = useMemo(() => CARD_BANK.filter((card) => card.tags.includes(mission.tag)).map((card) => card.id), [mission]);
  const score = selected.filter((id) => correct.includes(id)).length;
  const wrong = selected.filter((id) => !correct.includes(id)).length;

  const startRound = () => { setSelected([]); setStage('question'); };
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const finalScore = Math.max(score - wrong, 0);

  return (
    <LinearGradient colors={['#FAFDF8', '#EEF7E7', '#DCEFCF']} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topRow}><Pressable onPress={() => navigation.navigate('Home')}><Ionicons name="arrow-back" size={26} color="#2E7D32" /></Pressable><Text style={styles.topTitle}>Learning Game</Text><View style={{ width: 26 }} /></View>
          <Text style={styles.title}>Dietary Awareness Challenge</Text>
          <Text style={styles.subtitle}>Learn allergens, additives, and dietary suitability through short card rounds.</Text>

          {stage === 'start' && <View style={styles.card}><Text style={styles.sectionTitle}>How it works</Text><Text style={styles.body}>Read the mission, choose the matching food or additive cards, then review the feedback. The explanations teach why an item is safe, restricted, or uncertain.</Text><Pressable style={styles.primary} onPress={() => setStage('instructions')}><Text style={styles.primaryText}>View Instructions</Text></Pressable></View>}
          {stage === 'instructions' && <View style={styles.card}><Text style={styles.sectionTitle}>Instructions</Text><Text style={styles.body}>1. Start a round.\n2. Select one or more cards that match the dietary condition.\n3. Submit your answer.\n4. Read the feedback and replay with a new question.</Text><Pressable style={styles.primary} onPress={startRound}><Text style={styles.primaryText}>Start Round</Text></Pressable></View>}
          {stage === 'question' && <><View style={styles.card}><Text style={styles.sectionTitle}>Mission</Text><Text style={styles.mission}>{mission.title}</Text></View><View style={styles.grid}>{CARD_BANK.map((card) => <Pressable key={card.id} style={[styles.gameCard, selected.includes(card.id) && styles.selected]} onPress={() => toggle(card.id)}><Text style={styles.emoji}>{card.emoji}</Text><Text style={styles.cardName}>{card.name}</Text><Text style={styles.cardStatus}>{selected.includes(card.id) ? 'Selected' : 'Tap to choose'}</Text></Pressable>)}</View><Pressable style={[styles.primary, !selected.length && { opacity: 0.5 }]} onPress={() => setStage('feedback')} disabled={!selected.length}><Text style={styles.primaryText}>Submit Answer</Text></Pressable></>}
          {stage === 'feedback' && <View style={styles.card}><Text style={styles.sectionTitle}>Round Feedback</Text><Text style={styles.score}>Score: {finalScore}/{correct.length}</Text>{CARD_BANK.map((card) => { const isCorrect = correct.includes(card.id); const chosen = selected.includes(card.id); if (!isCorrect && !chosen) return null; return <View key={card.id} style={styles.feedbackRow}><Text style={styles.feedbackName}>{isCorrect ? '✅' : '❌'} {card.name}</Text><Text style={styles.body}>{card.reason}</Text></View>; })}<Pressable style={styles.primary} onPress={() => { setRound((r) => r + 1); startRound(); }}><Text style={styles.primaryText}>Play Again</Text></Pressable><Pressable style={styles.secondary} onPress={() => navigation.navigate('Home')}><Text style={styles.secondaryText}>Exit Game</Text></Pressable></View>}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { padding: 20, paddingBottom: 40 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, topTitle: { fontSize: 22, fontWeight: '900', color: '#1B5E20' },
  title: { fontSize: 30, fontWeight: '900', color: '#1B5E20', textAlign: 'center' }, subtitle: { textAlign: 'center', color: '#5f6f52', fontWeight: '700', marginVertical: 12, lineHeight: 21 }, card: { backgroundColor: '#fff', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#DDECCF', marginBottom: 16 }, sectionTitle: { fontSize: 20, fontWeight: '900', color: '#1B5E20', marginBottom: 8 }, body: { color: '#5f6f52', lineHeight: 21, fontWeight: '600' }, mission: { fontSize: 17, color: '#1B5E20', fontWeight: '900' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }, gameCard: { width: '47%', backgroundColor: '#fff', borderRadius: 20, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: '#DDECCF' }, selected: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' }, emoji: { fontSize: 36 }, cardName: { color: '#1B5E20', fontWeight: '900', textAlign: 'center', marginTop: 8 }, cardStatus: { color: '#5f6f52', fontWeight: '700', fontSize: 12, marginTop: 4 }, primary: { backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 10 }, primaryText: { color: '#fff', fontWeight: '900' }, secondary: { borderWidth: 2, borderColor: '#4CAF50', paddingVertical: 15, borderRadius: 18, alignItems: 'center', marginTop: 10 }, secondaryText: { color: '#2E7D32', fontWeight: '900' }, score: { fontSize: 22, fontWeight: '900', color: '#2E7D32', marginBottom: 10 }, feedbackRow: { borderTopWidth: 1, borderTopColor: '#DDECCF', paddingTop: 10, marginTop: 10 }, feedbackName: { color: '#1B5E20', fontWeight: '900', marginBottom: 4 },
});
