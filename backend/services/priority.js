const { db, haversineDistance } = require('../db/database');

/**
 * Recalculate priority scores for a thread.
 * Priority scoring function combines normalized (0-10 scale) inputs:
 * 1. complaintCount (Log scale: normalized to log(count + 1) / log(10) * 10, capped at 10)
 * 2. populationExposure (village population nearest to thread location, normalized 0-10 based on max village pop 22000)
 * 3. infraGapIndex (composite of nearest village stats: hospital_distance (40%), school_count (40% reverse), flood_zone (20%))
 * 4. citizenUrgency (average citizen-reported urgency from AI extraction, 0-10)
 * 5. imageSeverity (average severity from photo upload: Critical=10, High=7, Medium=4, Low=1, default=5)
 * 
 * Weighted Sum (Total score 0 - 100):
 * - complaintCount: weight 2.5 (Max 25 pts)
 * - populationExposure: weight 2.0 (Max 20 pts)
 * - infraGapIndex: weight 2.0 (Max 20 pts)
 * - citizenUrgency: weight 2.0 (Max 20 pts)
 * - imageSeverity: weight 1.5 (Max 15 pts)
 */
function recalculateThreadPriority(threadId) {
  try {
    // 1. Fetch thread details
    const thread = db.prepare('SELECT id, category, representative_record_id FROM issue_threads WHERE id = ?').get(threadId);
    if (!thread) return;

    // 2. Fetch all problem records connected to this thread
    const records = db.prepare('SELECT id, urgency, severity, lat, lng FROM problem_records WHERE thread_id = ?').all(threadId);
    const count = records.length;
    if (count === 0) return;

    // Determine coordinate center of the thread (based on representative record)
    const repRecord = db.prepare('SELECT lat, lng FROM problem_records WHERE id = ?').get(thread.representative_record_id) || records[0];
    const lat = repRecord.lat;
    const lng = repRecord.lng;

    // 3. Find closest village from seed data
    const villages = db.prepare('SELECT name, population, school_count, hospital_distance_km, flood_zone, lat, lng FROM villages').all();
    let closestVillage = null;
    let minDist = Infinity;

    for (const v of villages) {
      const dist = haversineDistance(lat, lng, v.lat, v.lng);
      if (dist < minDist) {
        minDist = dist;
        closestVillage = v;
      }
    }

    if (!closestVillage) {
      closestVillage = { name: 'Unknown', population: 5000, school_count: 2, hospital_distance_km: 10, flood_zone: 0 };
    }

    // ── NORMALIZE INPUTS (0-10 Scale) ──

    // Component 1: Complaint Count (log scale, capped at 10)
    // Capped at 15 complaints for maximum log score
    const complaintScore = Math.min(10, (Math.log(count + 1) / Math.log(10)) * 10);

    // Component 2: Population Exposure
    // Normalized based on max village population in our seed dataset (22,000 for Ramnagar)
    const maxVillagePop = 22000;
    const popScore = (closestVillage.population / maxVillagePop) * 10;

    // Component 3: Infrastructure Gap Index (composite)
    // Hospital Distance: up to 25km is normalized to 10
    const distFactor = Math.min(10, (closestVillage.hospital_distance_km / 25) * 10);
    // School Count: 0 schools is 10, 5+ schools is 0.
    const schoolFactor = Math.max(0, 10 - (closestVillage.school_count * 2));
    // Flood Zone: Flag is 10 if in flood zone, 0 otherwise
    const floodFactor = closestVillage.flood_zone === 1 ? 10 : 0;
    
    // Composite: 40% Hospital distance + 40% reverse School count + 20% Flood zone
    const infraGapScore = (distFactor * 0.4 + schoolFactor * 0.4 + floodFactor * 0.2);

    // Component 4: Citizen Urgency (average of urgency from AI JSON extracts)
    const avgUrgency = records.reduce((sum, r) => sum + r.urgency, 0) / count;
    const urgencyScore = avgUrgency; // already 1.0 to 10.0 scale

    // Component 5: Image Severity (average severity score)
    const severityMap = { 'Critical': 10, 'High': 7, 'Medium': 4, 'Low': 1 };
    const totalSeverity = records.reduce((sum, r) => sum + (severityMap[r.severity] || 5), 0);
    const severityScore = totalSeverity / count;

    // Weighted Score (adds up to 100 max)
    const finalScore = (
      2.5 * complaintScore +
      2.0 * popScore +
      2.0 * infraGapScore +
      2.0 * urgencyScore +
      1.5 * severityScore
    );

    const scoresObj = {
      complaintCount: { 
        raw: count, 
        normalized: parseFloat(complaintScore.toFixed(2)), 
        weight: 2.5,
        contribution: parseFloat((complaintScore * 2.5).toFixed(2))
      },
      populationExposure: { 
        raw: closestVillage.population, 
        normalized: parseFloat(popScore.toFixed(2)), 
        weight: 2.0,
        contribution: parseFloat((popScore * 2.0).toFixed(2))
      },
      infraGapIndex: { 
        raw: `Distance: ${closestVillage.hospital_distance_km}km, Schools: ${closestVillage.school_count}, FloodZone: ${closestVillage.flood_zone === 1 ? 'Yes' : 'No'}`, 
        normalized: parseFloat(infraGapScore.toFixed(2)), 
        weight: 2.0,
        contribution: parseFloat((infraGapScore * 2.0).toFixed(2))
      },
      citizenUrgency: { 
        raw: parseFloat(avgUrgency.toFixed(2)), 
        normalized: parseFloat(urgencyScore.toFixed(2)), 
        weight: 2.0,
        contribution: parseFloat((urgencyScore * 2.0).toFixed(2))
      },
      imageSeverity: { 
        raw: parseFloat((totalSeverity / count).toFixed(2)), 
        normalized: parseFloat(severityScore.toFixed(2)), 
        weight: 1.5,
        contribution: parseFloat((severityScore * 1.5).toFixed(2))
      },
      villageName: closestVillage.name
    };

    // Update issue_threads
    db.prepare('UPDATE issue_threads SET priority_score = ?, component_scores = ? WHERE id = ?')
      .run(parseFloat(finalScore.toFixed(1)), JSON.stringify(scoresObj), threadId);

    console.log(`Recalculated Thread ID ${threadId} priority: ${finalScore.toFixed(1)}`);
  } catch (error) {
    console.error('Error recalculating thread priority:', error);
  }
}

module.exports = {
  recalculateThreadPriority
};
