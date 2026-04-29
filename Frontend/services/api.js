import { Platform } from 'react-native';

const RAW_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!RAW_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is not set.');
}

const BASE_URL = RAW_BASE_URL.replace(/\/$/, '');

async function parseResponse(response) {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText);
  } catch {
    return { raw: responseText };
  }
}

function buildError(parsed, fallback) {
  if (parsed?.error) {
    return `${parsed.error}${parsed.details ? ` - ${parsed.details}` : ''}`;
  }

  return fallback;
}

export function normalizeProfile(profile) {
  const raw = String(profile || '').trim();
  const lower = raw.toLowerCase();

  const map = {
    vegan: 'vegan',
    vegetarian: 'vegetarian',
    eggetarian: 'eggetarian',
    halal: 'halal',
    jain: 'Jain',
    kosher: 'kosher',
    nuts: 'nut-free',
    nut: 'nut-free',
    'nut free': 'nut-free',
    'nut-free': 'nut-free',
    nutfree: 'nut-free',
    dairy: 'dairy-free',
    milk: 'dairy-free',
    'dairy free': 'dairy-free',
    'dairy-free': 'dairy-free',
    dairyfree: 'dairy-free',
    gluten: 'gluten-free',
    wheat: 'gluten-free',
    'gluten free': 'gluten-free',
    'gluten-free': 'gluten-free',
    glutenfree: 'gluten-free',
    'no restriction': '',
    none: '',
  };

  return map[lower] ?? raw;
}

export function normalizeProfiles(profiles = []) {
  const normalized = [];

  (profiles || []).forEach((profile) => {
    const value = normalizeProfile(profile);

    if (value && !normalized.includes(value)) {
      normalized.push(value);
    }
  });

  return normalized;
}

export function displayProfile(profile) {
  const normalized = normalizeProfile(profile);

  const map = {
    vegan: 'Vegan',
    vegetarian: 'Vegetarian',
    eggetarian: 'Eggetarian',
    halal: 'Halal',
    Jain: 'Jain',
    'nut-free': 'Nut Free',
    'dairy-free': 'Dairy Free',
    'gluten-free': 'Gluten Free',
    kosher: 'Kosher',
  };

  return map[normalized] || String(profile || 'Unknown');
}

export async function analyzeIngredients(ingredientText, selectedProfiles) {
  const response = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ingredient_text: ingredientText,
      selected_profiles: normalizeProfiles(selectedProfiles)
    })
  });

  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `Failed to analyze ingredients: ${response.status}`));
  }

  return parsed;
}

export async function fetchProductByBarcode(barcode, selectedProfiles) {
  const params = new URLSearchParams();

  normalizeProfiles(selectedProfiles).forEach((profile) => {
    params.append('profile', profile);
  });

  const response = await fetch(`${BASE_URL}/product/${barcode}?${params.toString()}`);
  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `Failed to fetch product by barcode: ${response.status}`));
  }

  return parsed;
}

export async function uploadImageForOCR(imageSource) {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    if (imageSource?.file) {
      formData.append('image', imageSource.file, imageSource.file.name || 'ingredients.jpg');
    } else if (imageSource?.uri) {
      const fetched = await fetch(imageSource.uri);
      const blob = await fetched.blob();
      formData.append('image', blob, 'ingredients.jpg');
    } else {
      throw new Error('No image file was selected.');
    }
  } else {
    formData.append('image', {
      uri: imageSource.uri,
      name: imageSource.fileName || 'ingredients.jpg',
      type: imageSource.mimeType || 'image/jpeg'
    });
  }

  const response = await fetch(`${BASE_URL}/ocr`, {
    method: 'POST',
    body: formData
  });

  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `OCR request failed: ${response.status}`));
  }

  return parsed;
}

export async function generateOnboardingProfile(payload) {
  const response = await fetch(`${BASE_URL}/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `Onboarding failed: ${response.status}`));
  }

  return {
    ...parsed,
    profile: normalizeProfiles(parsed.profile || [])
  };
}

export async function saveProfile(profileName, restrictions, explanation = {}) {
  const response = await fetch(`${BASE_URL}/profile/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      profile_name: profileName || 'My Dietary Profile',
      restrictions: normalizeProfiles(restrictions),
      explanation
    })
  });

  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `Could not save profile: ${response.status}`));
  }

  return parsed;
}

export async function fetchProfiles() {
  const response = await fetch(`${BASE_URL}/profiles`);
  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `Could not fetch profiles: ${response.status}`));
  }

  return Array.isArray(parsed) ? parsed : [];
}

export async function updateProfile(profileId, profileName, restrictions, explanation = {}) {
  const response = await fetch(`${BASE_URL}/profile/update/${profileId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      profile_name: profileName || 'My Dietary Profile',
      restrictions: normalizeProfiles(restrictions),
      explanation
    })
  });

  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `Could not update profile: ${response.status}`));
  }

  return parsed;
}

export async function deleteProfile(profileId) {
  const response = await fetch(`${BASE_URL}/profile/delete/${profileId}`, {
    method: 'DELETE'
  });

  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `Could not delete profile: ${response.status}`));
  }

  return parsed;
}

export async function getRecommendations(selectedProfiles) {
  const params = new URLSearchParams();

  normalizeProfiles(selectedProfiles).forEach((profile) => {
    params.append('profile', profile);
  });

  const response = await fetch(`${BASE_URL}/recommendations?${params.toString()}`);
  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `Could not fetch recommendations: ${response.status}`));
  }

  return parsed;
}

export async function saveHistoryItem({ productName, ingredients, result, analysisJson, profileUsed }) {
  const response = await fetch(`${BASE_URL}/history/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      product_name: productName || 'Manual Analysis',
      ingredients: ingredients || 'Not available',
      result: result || 'Uncertain',
      analysis_json: analysisJson || {},
      profile_used: normalizeProfiles(profileUsed)
    })
  });

  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `Could not save history: ${response.status}`));
  }

  return parsed;
}

export async function fetchHistory() {
  const response = await fetch(`${BASE_URL}/history`);
  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `Could not fetch history: ${response.status}`));
  }

  return Array.isArray(parsed) ? parsed : [];
}

export async function fetchHistoryDetail(historyId) {
  const response = await fetch(`${BASE_URL}/history/${historyId}`);
  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `Could not fetch history detail: ${response.status}`));
  }

  return parsed;
}

export async function deleteHistoryItem(historyId) {
  const response = await fetch(`${BASE_URL}/history/delete/${historyId}`, {
    method: 'DELETE'
  });

  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw new Error(buildError(parsed, `Could not delete history item: ${response.status}`));
  }

  return parsed;
}