/**
 * Build Gemini prompt for transcribing audio inputs.
 */
function transcribeAudioPrompt(languageHint = 'English') {
  return `
You are an expert transcriber. Transcribe the audio input provided by the citizen.
The user might speak in Hindi, English, or a mix of both. 

Language hint: ${languageHint}

Please return a JSON-only object with the following fields:
{
  "transcription": "The precise text transcription of the spoken words in the audio",
  "detectedLanguage": "The primary language detected in the audio (e.g. Hindi, English)"
}

Important Instructions:
- Output valid raw JSON.
- Do NOT wrap the JSON in markdown code blocks like \`\`\`json.
- Do NOT include any introductory or explanatory text. Return ONLY the JSON object.
`;
}

module.exports = transcribeAudioPrompt;
