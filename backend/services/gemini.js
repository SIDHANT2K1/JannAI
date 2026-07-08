const { GoogleGenAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY || '';
const hasApiKey = apiKey.trim().length > 0;

let genAI = null;
if (hasApiKey) {
  // Try using the modern format or standard import.
  // Note: the modern SDK is often imported as standard GoogleGenAI or require('@google/generative-ai').GoogleGenAI
  try {
    const { GoogleGenAI } = require('@google/generative-ai');
    genAI = new GoogleGenAI({ apiKey });
  } catch (err) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(apiKey);
  }
}

// Defensive helper to parse JSON that may be wrapped in Markdown blocks
function parseJSONDefensively(text) {
  if (!text) return null;
  let cleanText = text.trim();
  
  // Strip ```json ... ``` blocks
  if (cleanText.startsWith('```')) {
    const lines = cleanText.split('\n');
    if (lines[0].toLowerCase().includes('json')) {
      lines.shift(); // remove opening ```json
    } else {
      lines.shift(); // remove opening ```
    }
    if (lines[lines.length - 1].trim() === '```') {
      lines.pop(); // remove closing ```
    }
    cleanText = lines.join('\n').trim();
  }
  
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error('Error parsing JSON from Gemini response:', e);
    console.error('Raw content was:', text);
    
    // Fallback: search for first '{' and last '}' and slice it
    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      try {
        const sliced = cleanText.slice(startIdx, endIdx + 1);
        return JSON.parse(sliced);
      } catch (innerErr) {
        console.error('Fallback JSON parsing failed:', innerErr);
      }
    }
    throw new Error('Failed to parse a valid JSON object from Gemini response');
  }
}

// Exponential backoff retry wrapper
async function callWithRetry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    console.warn(`Gemini API error. Retrying in ${delay}ms... (Attempts left: ${retries})`);
    console.warn(error.message);
    await new Promise(resolve => setTimeout(resolve, delay));
    return callWithRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Text Generation using Gemini Flash
 */
async function generateText(prompt, systemInstruction = '') {
  if (!hasApiKey) {
    return getMockResponse('text', prompt);
  }

  return callWithRetry(async () => {
    // Model to use: gemini-1.5-flash or gemini-2.5-flash depending on SDK version support.
    // gemini-1.5-flash is standard.
    const model = genAI.getGenerativeModel
      ? genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      : genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // compatibility fallback

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2, // low temperature as specified
      }
    });

    const response = await result.response;
    return response.text();
  });
}

/**
 * Image analysis using Gemini Flash
 */
async function generateVision(prompt, imageBuffer, mimeType) {
  if (!hasApiKey) {
    return getMockResponse('vision', prompt);
  }

  return callWithRetry(async () => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType
      }
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [imagePart, { text: prompt }] }],
      generationConfig: {
        temperature: 0.2
      }
    });

    const response = await result.response;
    return response.text();
  });
}

/**
 * Text embedding using Gemini Embedding Model
 */
async function generateEmbedding(text) {
  if (!hasApiKey) {
    return getMockResponse('embedding', text);
  }

  return callWithRetry(async () => {
    // text-embedding-004 is standard embedding model
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent({
      content: { parts: [{ text }] }
    });
    return result.embedding.values;
  });
}

/**
 * Audio transcription / processing
 */
async function processAudio(prompt, audioBuffer, mimeType) {
  if (!hasApiKey) {
    return getMockResponse('audio', prompt);
  }

  return callWithRetry(async () => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const audioPart = {
      inlineData: {
        data: audioBuffer.toString('base64'),
        mimeType
      }
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [audioPart, { text: prompt }] }],
      generationConfig: {
        temperature: 0.2
      }
    });

    const response = await result.response;
    return response.text();
  });
}

/**
 * MOCK FALLBACK DATA GENERATOR
 * Returns realistic mocked JSON/text when GEMINI_API_KEY is not defined.
 */
function getMockResponse(type, prompt) {
  console.log(`[JannAI Mock AI] Running stub for: ${type}`);
  
  if (type === 'embedding') {
    // Return a random 768-dim float vector (normalized)
    const vec = new Array(768).fill(0).map(() => Math.random() - 0.5);
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return vec.map(v => v / (norm || 1));
  }

  if (type === 'vision') {
    // Image analysis mock
    const categories = ['High', 'Critical', 'Medium', 'Low'];
    const selected = categories[Math.floor(Math.random() * categories.length)];
    return JSON.stringify({
      visualSeverity: selected,
      details: `[Mock AI Visual Assessment] Image inspection confirms ${selected.toLowerCase()} damage level. Potholes/debris/overflow is visible in the frame.`
    });
  }

  if (type === 'audio') {
    return JSON.stringify({
      transcription: "There is dirty water leaking from the pipe near the main village water tank. The smell is terrible and kids are falling sick. Please repair it quickly.",
      detectedLanguage: "English"
    });
  }

  // Text Prompt Routing (Classify vs Match Plan vs Report)
  if (prompt.includes('target JSON Schema') && prompt.includes('recommendedDevelopmentProject')) {
    // Classification Mock
    const categories = ['roads', 'water', 'health', 'education', 'sanitation'];
    let matchedCat = 'water';
    for (const cat of categories) {
      if (prompt.toLowerCase().includes(cat)) {
        matchedCat = cat;
        break;
      }
    }

    const subMap = {
      roads: 'Potholes and Road Surface repair',
      water: 'Drinking Water Pipeline leakage',
      health: 'Primary Health Clinic Doctor absence',
      education: 'School Toilet infrastructure damage',
      sanitation: 'Drain clogging and overflow'
    };

    const severityMap = ['Low', 'Medium', 'High', 'Critical'];
    const severity = severityMap[Math.floor(Math.random() * severityMap.length)];

    return JSON.stringify({
      category: matchedCat,
      subcategory: subMap[matchedCat],
      severity: severity,
      summary: `[MOCK AI SUMMARY] Urgent concern reported regarding ${matchedCat} issues in the locality.`,
      peopleAffected: 250 + Math.floor(Math.random() * 500),
      urgency: parseFloat((5 + Math.random() * 5).toFixed(1)),
      recommendedDevelopmentProject: `Upgrade and maintenance of local ${matchedCat} facilities.`,
      keywords: [matchedCat, 'repair', 'community', 'constituency']
    });
  }

  if (prompt.includes('matched') && prompt.includes('planId')) {
    // Match Plan Mock
    // Randomly match or not
    const match = Math.random() > 0.4;
    return JSON.stringify({
      matched: match,
      planId: match ? 1 : null,
      justification: match 
        ? "[MOCK AI PLAN MATCH] The complaint matches the 'Ramnagar Drainage and Embankment Project' which is currently 'In Progress' near this area."
        : "[MOCK AI PLAN MATCH] No existing or proposed constituency plans were found that address this specific issue in this locality."
    });
  }

  if (prompt.includes('Constituency Development Status Report')) {
    // Narrative Report Mock
    return `
# Constituency Development Status Report (Mocked AI Analysis)

## 1. Executive Summary
This report presents an aggregate analysis of citizen complaints and development issues registered in the constituency. The data indicates severe bottlenecks in local utility services, particularly water and road networks. 

## 2. Key Highlights
- **Infrastructure Backlog**: Roads and Water complaints constitute over 60% of all registered complaints.
- **Critical Hotspots**: High-density zones of complaints have been identified near Ramnagar and Lohta. Immediate intervention is required to resolve issues affecting large rural populations.

## 3. Top Priority Recommendations
- **Ramnagar Sewage and Drainage**: A massive cluster of reports reveals sewage leakage mixing with drinking lines. Funding should be prioritized for upgrading sewer lines.
- **Shivpur Crossing Highway Repair**: Continuous reports of vehicle accidents due to major potholes demand instant road resurfacing.
- **Weaver Colony Wastewater System**: In sanitation, Lohta weavers require sewage management and sanitation drives.

## 4. Strategic Conclusion
Targeted budget allocation towards existing infrastructure plans should be accelerated, with new project proposals initiated for currently unserved regions.
`;
  }

  return JSON.stringify({ message: "Default mock response" });
}

module.exports = {
  generateText,
  generateVision,
  generateEmbedding,
  processAudio,
  parseJSONDefensively,
  hasApiKey
};
