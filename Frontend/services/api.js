const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is not set.');
}

export async function analyzeIngredients(ingredientText, selectedProfiles) {
  const response = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ingredient_text: ingredientText,
      selected_profiles: selectedProfiles,
    }),
  });

  const responseText = await response.text();

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = { raw: responseText };
  }

  if (!response.ok) {
    throw new Error(
      parsed?.error
        ? `${parsed.error}${parsed.details ? ` - ${parsed.details}` : ''}`
        : `Failed to analyze ingredients: ${response.status}`
    );
  }

  return parsed;
}

export async function fetchProductByBarcode(barcode, selectedProfiles) {
  const params = new URLSearchParams();
  selectedProfiles.forEach((profile) => params.append('profile', profile));

  const response = await fetch(`${BASE_URL}/product/${barcode}?${params.toString()}`);

  const responseText = await response.text();

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = { raw: responseText };
  }

  if (!response.ok) {
    throw new Error(
      parsed?.error
        ? `${parsed.error}${parsed.details ? ` - ${parsed.details}` : ''}`
        : `Failed to fetch product by barcode: ${response.status}`
    );
  }

  return parsed;
}

export async function uploadImageForOCR(imageSource) {
  const formData = new FormData();

  formData.append('image', {
    uri: imageSource.uri,
    name: imageSource.fileName || 'ingredients.jpg',
    type: imageSource.mimeType || 'image/jpeg',
  });

  const response = await fetch(`${BASE_URL}/ocr`, {
    method: 'POST',
    body: formData,
  });

  const responseText = await response.text();

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = { raw: responseText };
  }

  if (!response.ok) {
    throw new Error(
      parsed?.error
        ? `${parsed.error}${parsed.details ? ` - ${parsed.details}` : ''}`
        : `OCR request failed: ${response.status}`
    );
  }

  return parsed;
}