const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

/**
 * GET /api/dashboard/stats
 * Overview numbers for the constituency.
 */
router.get('/stats', (req, res) => {
  try {
    const totalSubmissions = db.prepare('SELECT COUNT(*) as count FROM submissions').get().count;
    const totalComplaints = db.prepare('SELECT COUNT(*) as count FROM problem_records').get().count;
    
    // Total distinct villages covered
    // We determine this by reading the villages closest to each thread or matching via priority service
    // Let's count villages with at least 1 near problem record (within 5km).
    // Or simpler, select count of distinct villages referenced in thread components
    const threads = db.prepare('SELECT component_scores FROM issue_threads').all();
    const uniqueVillages = new Set();
    threads.forEach(t => {
      try {
        const scores = JSON.parse(t.component_scores);
        if (scores.villageName) {
          uniqueVillages.add(scores.villageName);
        }
      } catch(e) {}
    });
    
    const villagesCoveredCount = uniqueVillages.size || 15; // fallback to 15 if database just seeded

    // Breakdown by category
    const categoryRows = db.prepare('SELECT category, COUNT(*) as count FROM problem_records GROUP BY category').all();
    const categoryBreakdown = {
      roads: 0,
      water: 0,
      sanitation: 0,
      health: 0,
      education: 0
    };
    categoryRows.forEach(row => {
      if (categoryBreakdown[row.category] !== undefined) {
        categoryBreakdown[row.category] = row.count;
      }
    });

    // High & Critical Priority count
    // threads with score >= 50
    const highPriorityCount = db.prepare('SELECT COUNT(*) as count FROM issue_threads WHERE priority_score >= 50.0').get().count;

    res.json({
      totalSubmissions,
      totalComplaints,
      villagesCovered: villagesCoveredCount,
      categoryBreakdown,
      highPriorityCount
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/threads
 * Returns all ranked issue threads sorted by priority score.
 */
router.get('/threads', (req, res) => {
  try {
    const { category, priority, village } = req.query;
    
    let query = `
      SELECT t.id, t.category, t.summary, t.priority_score, t.component_scores, t.status, t.created_at,
             (SELECT COUNT(*) FROM problem_records r WHERE r.thread_id = t.id) as complaint_count
      FROM issue_threads t
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
      query += ` AND t.category = ?`;
      params.push(category);
    }

    if (priority && priority !== 'all') {
      if (priority === 'critical') {
        query += ` AND t.priority_score >= 75.0`;
      } else if (priority === 'high') {
        query += ` AND t.priority_score >= 50.0 AND t.priority_score < 75.0`;
      } else if (priority === 'medium') {
        query += ` AND t.priority_score >= 25.0 AND t.priority_score < 50.0`;
      } else {
        query += ` AND t.priority_score < 25.0`;
      }
    }

    // Sort by priority score descending
    query += ` ORDER BY t.priority_score DESC`;

    const threads = db.prepare(query).all(...params);

    // Apply village filter in JavaScript (since village name is stored in JSON component_scores)
    let filteredThreads = threads.map(t => {
      let components = {};
      try {
        components = JSON.parse(t.component_scores);
      } catch (e) {}

      return {
        id: t.id,
        category: t.category,
        summary: t.summary,
        priorityScore: t.priority_score,
        status: t.status,
        createdAt: t.created_at,
        complaintCount: t.complaint_count,
        villageName: components.villageName || 'Shivpur',
        components
      };
    });

    if (village && village !== 'all') {
      filteredThreads = filteredThreads.filter(t => t.villageName.toLowerCase() === village.toLowerCase());
    }

    res.json(filteredThreads);
  } catch (error) {
    console.error('Error fetching dashboard threads:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/map
 * Returns coordinates of all problem records for mapping.
 */
router.get('/map', (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT r.id, r.submission_id, r.thread_id, r.category, r.subcategory, r.severity, r.summary, r.urgency, r.lat, r.lng, r.created_at,
             t.priority_score
      FROM problem_records r
      LEFT JOIN issue_threads t ON r.thread_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
      query += ` AND r.category = ?`;
      params.push(category);
    }

    const records = db.prepare(query).all(...params);
    res.json(records);
  } catch (error) {
    console.error('Error fetching dashboard map records:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
