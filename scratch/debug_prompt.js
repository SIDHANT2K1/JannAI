const classifyComplaintPrompt = require('../backend/prompts/classifyComplaint');
const prompt = classifyComplaintPrompt("My road has a huge pothole and it is dangerous");
const promptLower = prompt.toLowerCase();
console.log("promptLower includes target json schema:", promptLower.includes('target json schema'));
console.log("promptLower includes recommendeddevelopmentproject:", promptLower.includes('recommendeddevelopmentproject'));
console.log("prompt:\n", prompt);
