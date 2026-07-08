const { db, cosineSimilarity, haversineDistance } = require('../db/database');
const { generateEmbedding } = require('./gemini');

/**
 * Cluster a new problem record.
 * 1. Generate text embedding for the complaint summary/content.
 * 2. Find nearest-neighbor problem records within 5km radius with matching category.
 * 3. Calculate cosine similarity.
 * 4. If similarity > 0.75, attach to the existing record's thread.
 * 5. Otherwise, create a new issue thread.
 * 
 * Returns the assigned thread ID.
 */
async function clusterRecord(recordId, textToEmbed, category, lat, lng) {
  try {
    // Generate text embedding
    console.log(`Generating embedding for record ID: ${recordId}...`);
    const embedding = await generateEmbedding(textToEmbed);
    const embeddingStr = JSON.stringify(embedding);

    // Save embedding in problem_records
    db.prepare('UPDATE problem_records SET embedding = ? WHERE id = ?').run(embeddingStr, recordId);

    // Fetch existing problem records of the same category
    const candidates = db.prepare(`
      SELECT id, thread_id, embedding, lat, lng 
      FROM problem_records 
      WHERE category = ? AND id != ? AND embedding IS NOT NULL AND thread_id IS NOT NULL
    `).all(category, recordId);

    let bestMatch = null;
    let maxSimilarity = -1;

    for (const cand of candidates) {
      // Check geographic distance (must be within 5km)
      const dist = haversineDistance(lat, lng, cand.lat, cand.lng);
      if (dist > 5.0) continue; // skip if too far away geographically

      // Calculate cosine similarity
      let candidateEmbedding;
      try {
        candidateEmbedding = JSON.parse(cand.embedding);
      } catch (e) {
        continue;
      }

      const sim = cosineSimilarity(embedding, candidateEmbedding);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        bestMatch = cand;
      }
    }

    console.log(`Clustering analysis: Max Cosine Similarity = ${maxSimilarity.toFixed(3)}`);

    let assignedThreadId = null;

    if (bestMatch && maxSimilarity > 0.75) {
      // Attach to the existing thread
      assignedThreadId = bestMatch.thread_id;
      console.log(`Found matching thread ID: ${assignedThreadId}. Attaching...`);
      db.prepare('UPDATE problem_records SET thread_id = ? WHERE id = ?').run(assignedThreadId, recordId);
      
      // Update thread description/summary slightly if needed, or simply keep it
    } else {
      // Create a new issue_thread
      console.log(`No highly similar thread found. Creating new thread...`);
      
      // Use the summary of this record as the thread summary
      const recordData = db.prepare('SELECT summary FROM problem_records WHERE id = ?').get(recordId);
      const summary = recordData ? recordData.summary : 'Civic Issue';

      const insertRes = db.prepare(`
        INSERT INTO issue_threads (category, representative_record_id, summary, priority_score, component_scores)
        VALUES (?, ?, ?, ?, ?)
      `).run(category, recordId, summary, 0.0, '{}');

      assignedThreadId = insertRes.lastInsertRowid;
      db.prepare('UPDATE problem_records SET thread_id = ? WHERE id = ?').run(assignedThreadId, recordId);
    }

    return assignedThreadId;
  } catch (error) {
    console.error('Error during clustering record:', error);
    throw error;
  }
}

module.exports = {
  clusterRecord
};
