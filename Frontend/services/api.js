const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is not set.');
}

export async function analyzeIngredients(ingredientText, selectedProfiles) {
  const response = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient_text: ingredientText, selected_profiles: selectedProfiles }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to analyze ingredients: ${text}`);
  }
  return response.json();
}

export async function fetchProductByBarcode(barcode, selectedProfiles) {
  const params = new URLSearchParams();
  selectedProfiles.forEach((profile) => params.append('profile', profile));
  const response = await fetch(`${BASE_URL}/product/${barcode}?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch product by barcode: ${text}`);
  }
  return response.json();
}

export async function extractIngredientsFromImage(imageUri) {
  const formData = new FormData();
  formData.append('image', { uri: imageUri, name: 'ingredients.jpg', type: 'image/jpeg' });
  const response = await fetch(`${BASE_URL}/ocr`, { method: 'POST', body: formData });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to extract text from image: ${text}`);
  }
  return response.json();
}
