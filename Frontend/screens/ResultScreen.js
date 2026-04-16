import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';

export default function ResultScreen({ route, navigation }) {
  const { result = {}, selectedProfiles = [], apiResult } = route.params || {};
  const mergedResult = result.analysis ? result : {
    analysis: apiResult || {},
    product_name: route.params?.productName || '',
    barcode: route.params?.barcode || '',
    ingredient_text: route.params?.ingredientText || '',
    allergens_tags: route.params?.allergensTags || [],
    additives_tags: route.params?.additivesTags || [],
  };

  const analysis = mergedResult.analysis || {};
  const productName = mergedResult.product_name || '';
  const barcode = mergedResult.barcode || '';
  const ingredientText = mergedResult.ingredient_text || '';
  const allergensTags = mergedResult.allergens_tags || [];
  const additivesTags = mergedResult.additives_tags || [];
  const overallResult = analysis.overall_result || 'No Result';
  const summary = analysis.summary || 'No analysis available.';
  const ingredients = Array.isArray(analysis.ingredients) ? analysis.ingredients : [];
  const restrictedItems = ingredients.filter((item) => item.status === 'Restricted');
  const uncertainItems = ingredients.filter((item) => item.status === 'Uncertain');
  const allowedItems = ingredients.filter((item) => item.status === 'Allowed');

  const getResultBoxStyle = () => overallResult === 'Safe' ? styles.safeBox : overallResult === 'Uncertain' ? styles.uncertainBox : overallResult === 'Restricted' ? styles.restrictedBox : styles.neutralBox;
  const getResultTextStyle = () => overallResult === 'Safe' ? styles.safeText : overallResult === 'Uncertain' ? styles.uncertainText : overallResult === 'Restricted' ? styles.restrictedText : styles.neutralText;
  const getStatusBadgeStyle = (status) => status === 'Allowed' ? [styles.statusBadge, styles.allowedBadge] : status === 'Uncertain' ? [styles.statusBadge, styles.uncertainBadge] : status === 'Restricted' ? [styles.statusBadge, styles.restrictedBadge] : [styles.statusBadge, styles.neutralBadge];
  const getStatusTextStyle = (status) => status === 'Allowed' ? styles.allowedBadgeText : status === 'Uncertain' ? styles.uncertainBadgeText : status === 'Restricted' ? styles.restrictedBadgeText : styles.neutralBadgeText;

  const getRecommendation = () => {
    if (overallResult === 'Restricted') return 'This product contains one or more ingredients that conflict with your selected dietary profiles.';
    if (overallResult === 'Uncertain') return 'Some ingredients could not be confirmed confidently. Check the packaging or manufacturer details before consuming.';
    if (overallResult === 'Safe') return 'No direct conflicts were found for your selected dietary profiles based on the current database and rules.';
    return 'No recommendation available.';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Results</Text>
      <View style={[styles.resultBox, getResultBoxStyle()]}>
        <Text style={styles.resultLabel}>Overall Status</Text>
        <Text style={[styles.resultValue, getResultTextStyle()]}>{overallResult}</Text>
        <Text style={styles.resultSummary}>{summary}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recommendation</Text>
        <Text style={styles.cardText}>{getRecommendation()}</Text>
      </View>
      {productName ? <View style={styles.card}><Text style={styles.cardTitle}>Product</Text><Text style={styles.cardText}>{productName}</Text>{barcode ? <Text style={styles.metaText}>Barcode: {barcode}</Text> : null}</View> : null}
      <View style={styles.card}><Text style={styles.cardTitle}>Selected Profiles</Text><Text style={styles.cardText}>{selectedProfiles.length > 0 ? selectedProfiles.join(', ') : 'No profiles selected'}</Text></View>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statRestricted]}><Text style={styles.statNumber}>{restrictedItems.length}</Text><Text style={styles.statLabel}>Restricted</Text></View>
        <View style={[styles.statCard, styles.statUncertain]}><Text style={styles.statNumber}>{uncertainItems.length}</Text><Text style={styles.statLabel}>Uncertain</Text></View>
        <View style={[styles.statCard, styles.statAllowed]}><Text style={styles.statNumber}>{allowedItems.length}</Text><Text style={styles.statLabel}>Allowed</Text></View>
      </View>
      {ingredientText ? <View style={styles.card}><Text style={styles.cardTitle}>Ingredient Text</Text><Text style={styles.cardText}>{ingredientText}</Text></View> : null}
      {additivesTags.length > 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Additive Tags</Text><Text style={styles.cardText}>{additivesTags.join(', ')}</Text></View> : null}
      {allergensTags.length > 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Allergen Tags</Text><Text style={styles.cardText}>{allergensTags.join(', ')}</Text></View> : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ingredient Analysis</Text>
        {ingredients.length > 0 ? ingredients.map((item, index) => (
          <View key={`${item.name}-${index}`} style={styles.ingredientCard}>
            <View style={styles.ingredientHeader}>
              <Text style={styles.ingredientName}>{item.name}</Text>
              <View style={getStatusBadgeStyle(item.status)}><Text style={getStatusTextStyle(item.status)}>{item.status}</Text></View>
            </View>
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>
        )) : <Text style={styles.cardText}>No ingredient analysis returned.</Text>}
      </View>
      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Home')}><Text style={styles.primaryButtonText}>Check Another Product</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#ffffff', flexGrow: 1 },
  title: { fontSize: 30, fontWeight: 'bold', marginTop: 20, marginBottom: 20, textAlign: 'center' },
  resultBox: { borderRadius: 16, padding: 20, marginBottom: 18, borderWidth: 1 },
  safeBox: { backgroundColor: '#eef9f0', borderColor: '#a7d7b1' },
  uncertainBox: { backgroundColor: '#fff7e8', borderColor: '#f0cf8a' },
  restrictedBox: { backgroundColor: '#fdeeee', borderColor: '#e4aaaa' },
  neutralBox: { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' },
  resultLabel: { fontSize: 15, marginBottom: 8, textAlign: 'center', color: '#444' },
  resultValue: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  resultSummary: { fontSize: 15, lineHeight: 22, textAlign: 'center', color: '#333' },
  safeText: { color: '#1f7a3d' }, uncertainText: { color: '#b26b00' }, restrictedText: { color: '#b42318' }, neutralText: { color: '#444' },
  card: { backgroundColor: '#f5f5f5', borderRadius: 14, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  cardText: { fontSize: 15, lineHeight: 22, color: '#222' },
  metaText: { fontSize: 14, marginTop: 8, color: '#666' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center' },
  statRestricted: { backgroundColor: '#fdeeee' }, statUncertain: { backgroundColor: '#fff7e8' }, statAllowed: { backgroundColor: '#eef9f0' },
  statNumber: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 }, statLabel: { fontSize: 13, fontWeight: '600', color: '#444' },
  ingredientCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#ececec' },
  ingredientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  ingredientName: { flex: 1, fontSize: 16, fontWeight: 'bold', textTransform: 'capitalize', color: '#111' },
  statusBadge: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  allowedBadge: { backgroundColor: '#e7f6ec' }, uncertainBadge: { backgroundColor: '#fff1d6' }, restrictedBadge: { backgroundColor: '#fce4e4' }, neutralBadge: { backgroundColor: '#ececec' },
  allowedBadgeText: { color: '#1f7a3d', fontWeight: '700', fontSize: 13 }, uncertainBadgeText: { color: '#b26b00', fontWeight: '700', fontSize: 13 }, restrictedBadgeText: { color: '#b42318', fontWeight: '700', fontSize: 13 }, neutralBadgeText: { color: '#555', fontWeight: '700', fontSize: 13 },
  reasonText: { fontSize: 14, lineHeight: 20, color: '#333' },
  primaryButton: { marginTop: 8, marginBottom: 24, backgroundColor: '#222', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
