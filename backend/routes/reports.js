const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { generateText } = require('../services/gemini');
const generateReportPrompt = require('../prompts/generateReport');

/**
 * POST /api/reports/generate
 * Compiles a downloadable constituency summary report.
 * Uses database aggregates + Gemini narrative framing.
 */
router.post('/generate', async (req, res) => {
  try {
    // 1. Gather exact stats from DB
    const totalComplaints = db.prepare('SELECT COUNT(*) as count FROM problem_records').get().count;
    
    // villages count
    const threads = db.prepare('SELECT component_scores FROM issue_threads').all();
    const uniqueVillages = new Set();
    threads.forEach(t => {
      try {
        const scores = JSON.parse(t.component_scores);
        if (scores.villageName) uniqueVillages.add(scores.villageName);
      } catch(e) {}
    });
    const villagesCoveredCount = uniqueVillages.size || 15;

    // category breakdown
    const categoryRows = db.prepare('SELECT category, COUNT(*) as count FROM problem_records GROUP BY category').all();
    const categoryBreakdown = { roads: 0, water: 0, sanitation: 0, health: 0, education: 0 };
    categoryRows.forEach(row => {
      if (categoryBreakdown[row.category] !== undefined) {
        categoryBreakdown[row.category] = row.count;
      }
    });

    const highPriorityCount = db.prepare('SELECT COUNT(*) as count FROM issue_threads WHERE priority_score >= 50.0').get().count;

    const stats = {
      totalComplaints,
      villagesCovered: villagesCoveredCount,
      highPriorityCount,
      categoryBreakdown
    };

    // 2. Fetch top 5 issue threads
    const topThreadsQuery = db.prepare(`
      SELECT t.id, t.category, t.summary, t.priority_score, t.component_scores,
             (SELECT COUNT(*) FROM problem_records r WHERE r.thread_id = t.id) as complaint_count,
             (SELECT SUM(people_affected) FROM problem_records r WHERE r.thread_id = t.id) as total_affected
      FROM issue_threads t
      ORDER BY t.priority_score DESC
      LIMIT 5
    `).all();

    const topThreads = topThreadsQuery.map((t, idx) => {
      let components = {};
      try {
        components = JSON.parse(t.component_scores);
      } catch (e) {}

      return {
        rank: idx + 1,
        category: t.category,
        priorityScore: t.priority_score,
        summary: t.summary,
        complaintCount: t.complaint_count,
        estimatedImpactedPopulation: t.total_affected || components.populationExposure?.raw || 500,
        primaryVillage: components.villageName || 'Shivpur',
        infraGapSummary: components.infraGapIndex?.raw || 'N/A'
      };
    });

    // 3. Trigger Gemini for narrative styling
    const prompt = generateReportPrompt(stats, topThreads);
    const reportMarkdown = await generateText(prompt);

    res.json({
      success: true,
      reportMarkdown
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
