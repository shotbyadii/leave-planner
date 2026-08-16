/**
 * Service to extract public holiday lists (Date and Event Name) from PDF or Image files
 * using Gemini API (with multimodal inline_data for PDF / Image support).
 */

// Helper to convert File object to Base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Parses an uploaded holiday sheet (PDF or Image file) strictly using Gemini API.
 * Returns only the holidays actually parsed from the user's file.
 * @param {File} file - PDF, PNG, JPG, or WEBP file
 * @param {string} apiKey - Optional custom Gemini API key
 * @returns {Promise<Array<{date: string, name: string}>>} Array of extracted holidays
 */
export async function extractHolidaysFromFile(file, apiKey = null) {
  const effectiveApiKey = apiKey || 
    (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || 
    localStorage.getItem('gemini_api_key');

  if (!effectiveApiKey || !effectiveApiKey.trim()) {
    throw new Error('Please configure a valid Gemini API Key starting with AIzaSy...');
  }

  const base64Data = await fileToBase64(file);
  let mimeType = file.type || 'image/png';
  
  if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
  else if (file.name.endsWith('.png')) mimeType = 'image/png';
  else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) mimeType = 'image/jpeg';
  else if (file.name.endsWith('.webp')) mimeType = 'image/webp';

  const systemPrompt = `You are an expert document OCR parser. Your job is to extract ALL official public holidays / company holidays listed in the provided document image or PDF.

Instructions:
1. Extract EVERY single row / holiday item present in the table or document. Do not omit any items.
2. For each holiday, extract:
   - "date": formatted as "YYYY-MM-DD" (ISO format). Convert DD.MM.YYYY (e.g., "26.01.2024" -> "2024-01-26") or DD/MM/YYYY to YYYY-MM-DD.
   - "name": the exact clean holiday name.
3. Output MUST be ONLY a raw valid JSON array of objects with keys "date" and "name". No markdown codeblocks.

Example:
[
  {"date": "2024-01-26", "name": "REPUBLIC DAY"},
  {"date": "2024-03-25", "name": "HOLI"}
]`;

  // Production Gemini API model endpoints (gemini-2.5-flash-lite is active for AI Studio keys)
  const modelsToTry = [
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash',
    'gemini-2.0-flash'
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${effectiveApiKey.trim()}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Gemini API model ${modelName} status ${response.status}:`, errText);

        if (response.status === 400 || response.status === 403) {
          throw new Error(`API Key Authentication error (${response.status}). Please check your Gemini API key from Google AI Studio.`);
        }

        lastError = new Error(`Model ${modelName} returned HTTP ${response.status}`);
        continue;
      }

      const result = await response.json();
      const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText) continue;

      const cleanJson = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedHolidays = JSON.parse(cleanJson);

      if (Array.isArray(parsedHolidays)) {
        const rawExtracted = parsedHolidays
          .filter(h => h && h.date && h.name)
          .map((h, index) => {
            let formattedDate = String(h.date).trim();
            if (formattedDate.includes('.')) {
              const parts = formattedDate.split('.');
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else if (parts[2].length === 4) {
                  formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
            } else if (formattedDate.includes('/')) {
              const parts = formattedDate.split('/');
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else if (parts[2].length === 4) {
                  formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
            }

            return {
              id: `ext-${Date.now()}-${index}`,
              date: formattedDate,
              name: String(h.name).trim(),
              type: 'public'
            };
          });

        // Strict deduplication by date
        const dateMap = new Map();
        rawExtracted.forEach(item => {
          if (!dateMap.has(item.date)) {
            dateMap.set(item.date, item);
          } else {
            const existing = dateMap.get(item.date);
            if (item.name.length > existing.name.length) {
              dateMap.set(item.date, item);
            }
          }
        });

        return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (err) {
      console.warn(`Model ${modelName} extraction error:`, err);
      lastError = err;
      if (err.message.includes('API Key Authentication error')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Invalid Gemini API Key or endpoint unreachable. Please verify your Google AI Studio API key (starts with AIzaSy...).');
}
