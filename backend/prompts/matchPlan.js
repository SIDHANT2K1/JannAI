/**
 * Build Gemini prompt for matching a complaint against existing development plans.
 */
function matchPlanPrompt(complaintJson, plansList) {
  return `
You are a planning analyst checking if a new citizen complaint matches any existing or proposed constituency development plans.
Compare the complaint details with the active/proposed plans listed below.

Complaint:
${JSON.stringify(complaintJson, null, 2)}

Existing/Proposed Government Plans:
${JSON.stringify(plansList, null, 2)}

Analyze if there is a relevant match (e.g. same category AND located in the same village/area or nearby). 
If there is a plan that covers this issue, match it. If multiple match, pick the most relevant.
Return a JSON-only object matching the schema below.

Target JSON Schema:
{
  "matched": true or false,
  "planId": null or the integer ID of the matching plan,
  "justification": "A brief explanation of why this plan matches (or why no existing plan covers the complaint)"
}

Important Instructions:
- Output valid raw JSON.
- Do NOT wrap the JSON in markdown code blocks like \`\`\`json.
- Do NOT include any introductory or explanatory text. Return ONLY the JSON object.
`;
}

module.exports = matchPlanPrompt;
