/**
 * Build Gemini prompt for classifying a complaint.
 * Enforces JSON-only output using a strict system prompt instruction.
 */
function classifyComplaintPrompt(description) {
  return `
You are an expert system analyzing citizen complaints for a municipal governance and constituency development portal.
Analyze the following description submitted by a citizen, and return a JSON-only object matching the schema below.

Description to analyze:
"${description}"

Target JSON Schema:
{
  "category": "One of [roads, water, health, education, sanitation]",
  "subcategory": "A specific subcategory string representing the problem type (e.g. Potholes, Contaminated Water, Clinic Closed, Girls Toilet, Open Dump)",
  "severity": "One of [Low, Medium, High, Critical]",
  "summary": "A concise 1-sentence summary of the core complaint",
  "peopleAffected": "Integer estimate of the number of people impacted (default to 100 if unclear from text)",
  "urgency": "A float number from 1.0 (least urgent) to 10.0 (most urgent)",
  "recommendedDevelopmentProject": "A recommended infrastructure or policy action to resolve this issue permanently",
  "keywords": ["array", "of", "3-5", "relevant", "keywords"]
}

Important Instructions:
- Output valid raw JSON.
- Do NOT wrap the JSON in markdown code blocks like \`\`\`json.
- Do NOT include any introductory or explanatory text. Return ONLY the JSON object.
`;
}

module.exports = classifyComplaintPrompt;
