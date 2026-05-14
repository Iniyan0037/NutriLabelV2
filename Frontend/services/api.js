import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RAW_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!RAW_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is not set.');
}

const BASE_URL = RAW_BASE_URL.replace(/\/$/, '');
export const ACCOUNT_KEY = 'NUTRILABEL_ACCOUNT';
export const ACTIVE_PROFILE_KEY = 'ACTIVE_PROFILE';
export const PROFILE_KEY = 'PROFILE';

async function parseResponse(response) {
  const responseText = await response.text();
  try { return JSON.parse(responseText); } catch { return { raw: responseText }; }
}

function buildError(parsed, fallback) {
  if (parsed?.error) return `${parsed.error}${parsed.details ? ` - ${parsed.details}` : ''}`;
  return fallback;
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const parsed = await parseResponse(response);
  if (!response.ok) throw new Error(buildError(parsed, `${options.method || 'GET'} ${path} failed: ${response.status}`));
  return parsed;
}

export async function getStoredAccount() {
  const raw = await AsyncStorage.getItem(ACCOUNT_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setStoredAccount(account) {
  await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

export async function clearStoredAccount() {
  await AsyncStorage.multiRemove([ACCOUNT_KEY, ACTIVE_PROFILE_KEY, PROFILE_KEY, 'HISTORY']);
}

export async function getActiveProfile() {
  const raw = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function getScopedIds() {
  const account = await getStoredAccount();
  const activeProfile = await getActiveProfile();
  return {
    accountId: account?.id || account?.account_id || null,
    profileId: activeProfile?.id || null,
  };
}

function buildScopedQuery(extra = {}) {
  const params = new URLSearchParams();
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
  });
  return params;
}

export async function registerAccount(familyName, pin) {
  const parsed = await requestJson('/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ family_name: familyName, pin }),
  });
  await setStoredAccount(parsed);
  return parsed;
}

export async function loginAccount(familyName, pin) {
  const parsed = await requestJson('/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ family_name: familyName, pin }),
  });
  await setStoredAccount(parsed);
  return parsed;
}

export function normalizeProfile(profile) {
  const raw = String(profile || '').trim();
  const lower = raw.toLowerCase();
  const map = {
    vegan: 'vegan', vegetarian: 'vegetarian', eggetarian: 'eggetarian', halal: 'halal', jain: 'Jain', kosher: 'kosher',
    nuts: 'nut-free', nut: 'nut-free', 'nut free': 'nut-free', 'nut-free': 'nut-free', nutfree: 'nut-free',
    dairy: 'dairy-free', milk: 'dairy-free', 'dairy free': 'dairy-free', 'dairy-free': 'dairy-free', dairyfree: 'dairy-free',
    gluten: 'gluten-free', wheat: 'gluten-free', 'gluten free': 'gluten-free', 'gluten-free': 'gluten-free', glutenfree: 'gluten-free',
    'no restriction': '', none: '',
  };
  return map[lower] ?? raw;
}

export function normalizeProfiles(profiles = []) {
  const normalized = [];
  (profiles || []).forEach((profile) => {
    const value = normalizeProfile(profile);
    if (value && !normalized.includes(value)) normalized.push(value);
  });
  return normalized;
}

export function displayProfile(profile) {
  const normalized = normalizeProfile(profile);
  const map = { vegan: 'Vegan', vegetarian: 'Vegetarian', eggetarian: 'Eggetarian', halal: 'Halal', Jain: 'Jain', 'nut-free': 'Nut Free', 'dairy-free': 'Dairy Free', 'gluten-free': 'Gluten Free', kosher: 'Kosher' };
  return map[normalized] || String(profile || 'Unknown');
}

export async function analyzeIngredients(ingredientText, selectedProfiles) {
  return requestJson('/analyze', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient_text: ingredientText, selected_profiles: normalizeProfiles(selectedProfiles) }),
  });
}

export async function fetchProductByBarcode(barcode, selectedProfiles) {
  const params = new URLSearchParams();
  normalizeProfiles(selectedProfiles).forEach((profile) => params.append('profile', profile));
  return requestJson(`/product/${barcode}?${params.toString()}`);
}

export async function uploadImageForOCR(imageSource) {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    if (imageSource?.file) formData.append('image', imageSource.file, imageSource.file.name || 'ingredients.jpg');
    else if (imageSource?.uri) { const fetched = await fetch(imageSource.uri); const blob = await fetched.blob(); formData.append('image', blob, 'ingredients.jpg'); }
    else throw new Error('No image file was selected.');
  } else {
    formData.append('image', { uri: imageSource.uri, name: imageSource.fileName || 'ingredients.jpg', type: imageSource.mimeType || 'image/jpeg' });
  }
  return requestJson('/ocr', { method: 'POST', body: formData });
}

export async function generateOnboardingProfile(payload) {
  const parsed = await requestJson('/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return { ...parsed, profile: normalizeProfiles(parsed.profile || []) };
}

export async function saveProfile(profileName, restrictions, explanation = {}) {
  const { accountId } = await getScopedIds();
  const parsed = await requestJson('/profile/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountId, profile_name: profileName || 'My Dietary Profile', restrictions: normalizeProfiles(restrictions), explanation }),
  });
  return parsed;
}

export async function fetchProfiles() {
  const { accountId } = await getScopedIds();
  const params = buildScopedQuery({ account_id: accountId });
  const parsed = await requestJson(`/profiles?${params.toString()}`);
  return Array.isArray(parsed) ? parsed : [];
}

export async function updateProfile(profileId, profileName, restrictions, explanation = {}) {
  const { accountId } = await getScopedIds();
  return requestJson(`/profile/update/${profileId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountId, profile_name: profileName || 'My Dietary Profile', restrictions: normalizeProfiles(restrictions), explanation }),
  });
}

export async function deleteProfile(profileId) {
  const { accountId } = await getScopedIds();
  const params = buildScopedQuery({ account_id: accountId });
  return requestJson(`/profile/delete/${profileId}?${params.toString()}`, { method: 'DELETE' });
}

export async function getRecommendations(selectedProfiles) {
  const params = new URLSearchParams();
  normalizeProfiles(selectedProfiles).forEach((profile) => params.append('profile', profile));
  return requestJson(`/recommendations?${params.toString()}`);
}

export async function saveHistoryItem({ productName, ingredients, result, analysisJson, profileUsed }) {
  const { accountId, profileId } = await getScopedIds();
  return requestJson('/history/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountId, profile_id: profileId, product_name: productName || 'Manual Analysis', ingredients: ingredients || 'Not available', result: result || 'Uncertain', analysis_json: analysisJson || {}, profile_used: normalizeProfiles(profileUsed) }),
  });
}

export async function fetchHistory() {
  const { accountId, profileId } = await getScopedIds();
  const params = buildScopedQuery({ account_id: accountId, profile_id: profileId });
  const parsed = await requestJson(`/history?${params.toString()}`);
  return Array.isArray(parsed) ? parsed : [];
}

export async function fetchHistoryDetail(historyId) {
  const { accountId } = await getScopedIds();
  const params = buildScopedQuery({ account_id: accountId });
  return requestJson(`/history/${historyId}?${params.toString()}`);
}

export async function deleteHistoryItem(historyId) {
  const { accountId } = await getScopedIds();
  const params = buildScopedQuery({ account_id: accountId });
  return requestJson(`/history/delete/${historyId}?${params.toString()}`, { method: 'DELETE' });
}

export async function fetchAllergenDashboard() { return requestJson('/awareness/allergens'); }
export async function fetchRecallAwareness() { return requestJson('/awareness/recalls'); }
export async function fetchAdditives({ q = '', category = '', page = 1, perPage = 40 } = {}) {
  const params = buildScopedQuery({ q, category, page, per_page: perPage });
  return requestJson(`/awareness/additives?${params.toString()}`);
}
export async function fetchPersonalInsights() {
  const { accountId, profileId } = await getScopedIds();
  const params = buildScopedQuery({ account_id: accountId, profile_id: profileId });
  return requestJson(`/awareness/insights?${params.toString()}`);
}
export async function fetchAwarenessTips(selectedProfiles = [], category = '') {
  const params = new URLSearchParams();
  normalizeProfiles(selectedProfiles).forEach((profile) => params.append('profile', profile));
  if (category) params.append('category', category);
  return requestJson(`/awareness/tips?${params.toString()}`);
}

export async function saveFoodLog(item) {
  const { accountId, profileId } = await getScopedIds();
  return requestJson('/nutrition/log', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountId, profile_id: profileId, ...item }),
  });
}
export async function fetchFoodLog(date) {
  const { accountId, profileId } = await getScopedIds();
  const params = buildScopedQuery({ account_id: accountId, profile_id: profileId, date });
  const parsed = await requestJson(`/nutrition/log?${params.toString()}`);
  return Array.isArray(parsed) ? parsed : [];
}
export async function deleteFoodLog(logId) {
  const { accountId } = await getScopedIds();
  const params = buildScopedQuery({ account_id: accountId });
  return requestJson(`/nutrition/log/${logId}?${params.toString()}`, { method: 'DELETE' });
}
export async function fetchNutritionGoals() {
  const { accountId, profileId } = await getScopedIds();
  const params = buildScopedQuery({ account_id: accountId, profile_id: profileId });
  return requestJson(`/nutrition/goals?${params.toString()}`);
}
export async function updateNutritionGoals(goals) {
  const { accountId, profileId } = await getScopedIds();
  return requestJson('/nutrition/goals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_id: accountId, profile_id: profileId, ...goals }) });
}
export async function fetchNutritionSummary(date) {
  const { accountId, profileId } = await getScopedIds();
  const params = buildScopedQuery({ account_id: accountId, profile_id: profileId, date });
  return requestJson(`/nutrition/summary?${params.toString()}`);
}
export async function fetchNutritionTrends(days = 7) {
  const { accountId, profileId } = await getScopedIds();
  const params = buildScopedQuery({ account_id: accountId, profile_id: profileId, days });
  return requestJson(`/nutrition/trends?${params.toString()}`);
}
