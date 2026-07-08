/**
 * Build Gemini prompt for writing a narrative constituency report from real DB aggregates.
 */
function generateReportPrompt(stats, topThreads) {
  return `
You are a senior policy advisor writing a brief, professional Constituency Development Status Report for the Member of Parliament (MP).
The report must present the following exact data points collected from our database. Do NOT fabricate, invent, or modify any numbers.

Constituency Summary Statistics:
- Total Complaints Submitted: ${stats.totalComplaints}
- Villages Covered: ${stats.villagesCovered}
- High & Critical Priority Issues: ${stats.highPriorityCount}
- Breakdown by Category: ${JSON.stringify(stats.categoryBreakdown, null, 2)}

Top Ranked Urgent Projects (Issue Clusters):
${JSON.stringify(topThreads.map(t => ({
  rank: t.rank,
  category: t.category,
  priorityScore: t.priorityScore,
  summary: t.summary,
  complaintCount: t.complaintCount,
  estimatedImpactedPopulation: t.estimatedImpactedPopulation,
  primaryVillage: t.primaryVillage,
  infrastructureGapSummary: t.infraGapSummary
})), null, 2)}

Write a professional executive summary in Markdown format. 
Structure the report as follows:
1. Executive Summary: High-level overview of constituency needs.
2. Key Highlights: Summarize categories requiring most attention based on the statistics.
3. Top Priority Recommendations: Discuss the top 3-5 ranked projects, why they need immediate funding, and the recommended development projects to execute.
4. Strategic Conclusion: Focus on infrastructure gaps.

Write a clean, readable Markdown document. Do NOT output JSON. Return the raw Markdown report directly.
`;
}

module.exports = generateReportPrompt;
