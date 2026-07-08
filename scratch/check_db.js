const { db } = require('../backend/db/database');
try {
  const probCount = db.prepare('SELECT COUNT(*) as count FROM problem_records').get().count;
  const subCount = db.prepare('SELECT COUNT(*) as count FROM submissions').get().count;
  const threadCount = db.prepare('SELECT COUNT(*) as count FROM issue_threads').get().count;
  console.log(`problem_records: ${probCount}, submissions: ${subCount}, issue_threads: ${threadCount}`);
  
  const latestProblem = db.prepare(`
    SELECT r.*, s.description, s.language, s.audio_url, s.photo_url,
           t.priority_score, t.component_scores
    FROM problem_records r
    JOIN submissions s ON r.submission_id = s.id
    LEFT JOIN issue_threads t ON r.thread_id = t.id
    ORDER BY r.id DESC LIMIT 1
  `).get();
  console.log("Latest problem record query result:", latestProblem ? "Found" : "Not Found");
} catch (e) {
  console.error("Database query failed:", e);
}
