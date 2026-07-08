const { db } = require('./database');

// Clear existing data
db.prepare('DELETE FROM villages').run();
db.prepare('DELETE FROM submissions').run();
db.prepare('DELETE FROM problem_records').run();
db.prepare('DELETE FROM issue_threads').run();
db.prepare('DELETE FROM plans').run();

// 1. Seed 15 Villages (around Varanasi region)
const villages = [
  { name: 'Shivpur', population: 12500, school_count: 3, hospital_distance_km: 12.5, flood_zone: 0, lat: 25.3582, lng: 82.9691 },
  { name: 'Sarnath Village', population: 8400, school_count: 2, hospital_distance_km: 4.2, flood_zone: 0, lat: 25.3762, lng: 83.0229 },
  { name: 'Ramnagar', population: 22000, school_count: 5, hospital_distance_km: 1.5, flood_zone: 1, lat: 25.2677, lng: 83.0248 },
  { name: 'Lohta', population: 15300, school_count: 1, hospital_distance_km: 8.9, flood_zone: 0, lat: 25.3214, lng: 82.9168 },
  { name: 'Kandwa', population: 6200, school_count: 2, hospital_distance_km: 9.4, flood_zone: 0, lat: 25.2750, lng: 82.9510 },
  { name: 'Phulwaria', population: 9800, school_count: 4, hospital_distance_km: 6.0, flood_zone: 0, lat: 25.3392, lng: 82.9814 },
  { name: 'Chiraigaon', population: 11200, school_count: 3, hospital_distance_km: 14.2, flood_zone: 1, lat: 25.4092, lng: 83.0560 },
  { name: 'Harahua', population: 14500, school_count: 2, hospital_distance_km: 11.0, flood_zone: 0, lat: 25.3995, lng: 82.9090 },
  { name: 'Pindra', population: 18900, school_count: 4, hospital_distance_km: 24.0, flood_zone: 0, lat: 25.4950, lng: 82.8122 },
  { name: 'Cholapur', population: 13100, school_count: 3, hospital_distance_km: 18.5, flood_zone: 0, lat: 25.4590, lng: 83.0125 },
  { name: 'Badaura', population: 4500, school_count: 1, hospital_distance_km: 16.0, flood_zone: 1, lat: 25.2120, lng: 82.9180 },
  { name: 'Kapoori', population: 5100, school_count: 0, hospital_distance_km: 20.2, flood_zone: 0, lat: 25.4200, lng: 82.8500 },
  { name: 'Mughalsarai Dehat', population: 16800, school_count: 4, hospital_distance_km: 5.5, flood_zone: 1, lat: 25.2890, lng: 83.1120 },
  { name: 'Arajiline', population: 19500, school_count: 5, hospital_distance_km: 15.0, flood_zone: 0, lat: 25.2600, lng: 82.8300 },
  { name: 'Baragaon', population: 8900, school_count: 2, hospital_distance_km: 22.1, flood_zone: 0, lat: 25.4410, lng: 82.7880 }
];

const insertVillage = db.prepare(`
  INSERT INTO villages (name, population, school_count, hospital_distance_km, flood_zone, lat, lng)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const v of villages) {
  insertVillage.run(v.name, v.population, v.school_count, v.hospital_distance_km, v.flood_zone, v.lat, v.lng);
}

// 2. Seed 5 government plans (Constituency development projects)
// Locations close to Ramnagar, Sarnath, Shivpur, Baragaon, Lohta
const plans = [
  {
    title: 'Ramnagar Drainage and Embankment Project',
    category: 'water',
    description: 'Construction of storm water drains and reinforcement of river banks to prevent flooding in Ramnagar low-lying zones.',
    budget: 4500000,
    status: 'In Progress',
    lat: 25.2670,
    lng: 83.0240
  },
  {
    title: 'Sarnath Public Health Center Upgrade',
    category: 'health',
    description: 'Renovation of the existing PHC, addition of 10 maternity beds and essential diagnostic equipment.',
    budget: 2500000,
    status: 'Approved',
    lat: 25.3760,
    lng: 83.0220
  },
  {
    title: 'Shivpur-Harahua Road Widening Scheme',
    category: 'roads',
    description: 'Four-laning of the connecting arterial road to ease peak hours traffic congestion.',
    budget: 8500000,
    status: 'Proposed',
    lat: 25.3600,
    lng: 82.9600
  },
  {
    title: 'Primary School Construction in Kapoori',
    category: 'education',
    description: 'Setting up a new primary school building with 5 classrooms, clean toilet blocks and drinking water supply.',
    budget: 3500000,
    status: 'Proposed',
    lat: 25.4210,
    lng: 82.8510
  },
  {
    title: 'Lohta Common Wastewater Treatment Plant',
    category: 'sanitation',
    description: 'Installation of a decentralized mini sewage treatment facility for weaver colonies in Lohta.',
    budget: 6000000,
    status: 'Under Review',
    lat: 25.3210,
    lng: 82.9160
  }
];

const insertPlan = db.prepare(`
  INSERT INTO plans (title, category, description, budget, status, lat, lng)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const p of plans) {
  insertPlan.run(p.title, p.category, p.description, p.budget, p.status, p.lat, p.lng);
}

// 3. Seed ~100 Synthetic complaints across 5 categories
// We will generate them with specific clusters/hotspots to show off clustering.
// Let's programmatically define:
// Hotspot 1: Ramnagar flooding & drainage problems (Category: water/sanitation)
// Hotspot 2: Shivpur bad roads and potholes (Category: roads)
// Hotspot 3: Lohta dirty water and sewage leak (Category: water/sanitation)
// Plus scattered random complaints.

// Helper to generate a mock embedding representing keywords
function generateMockEmbedding(category, text) {
  // Generate a deterministic float array of size 768
  const embedding = new Array(768).fill(0).map((_, i) => {
    // Add small components based on category and hash of the text
    let hash = 0;
    for (let charIdx = 0; charIdx < text.length; charIdx++) {
      hash = text.charCodeAt(charIdx) + ((hash << 5) - hash);
    }
    const catBonus = category === 'roads' ? 0.5 : category === 'water' ? 0.3 : category === 'health' ? -0.2 : category === 'education' ? -0.5 : 0.1;
    return Math.sin(i + hash + catBonus) * 0.1; // values around -0.1 to 0.1
  });
  
  // Normalize the vector so cosine similarity calculations are clean
  let norm = 0;
  for (let i = 0; i < embedding.length; i++) norm += embedding[i] * embedding[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < embedding.length; i++) embedding[i] /= norm;
  }
  return embedding;
}

// Generate complaints
const complaintsData = [];

const roadComplaints = [
  'Heavy potholes on the main road, making it dangerous for motorbikes.',
  'Road is completely broken due to recent rain, mud everywhere.',
  'Streetlight is not working on the main crossroad, leading to minor accidents.',
  'Waterlogging on the road has damaged the tar layer completely.',
  'No proper footpath, pedestrians have to walk on the busy highway.',
  'Large open pothole near the bus stand, very hazardous for children.',
  'The bridge road has cracked and needs immediate structural repair.',
  'Construction materials are dumped on the road, blocking traffic.',
  'Speed breakers are not marked, causing vehicles to bounce and crash.',
  'Road leading to the village high school is muddy and unusable for cycles.'
];

const waterComplaints = [
  'Tap water is muddy and smells like sewage.',
  'The handpump is broken and no water is coming out for the last 3 weeks.',
  'Drinking water pipe is leaking near the main square, wasting clean water.',
  'Water supply is available for only 10 minutes a day at very low pressure.',
  'High fluoride content detected in the local well water, causing joint pain.',
  'No clean drinking water facility in the school, children falling sick.',
  'The public water tank is contaminated with green algae and dead birds.',
  'Frequent sewer water mixing with drinking water supply lines.',
  'Water pipeline has burst, causing street flooding and dry taps.',
  'The borewell motor has burned out, leaving the block without water.'
];

const sanitationComplaints = [
  'Open garbage dump near the residential area is attracting flies and stray dogs.',
  'The open drains are clogged with plastic and overflowing onto the street.',
  'Public toilets are extremely dirty, choked, and have no running water.',
  'Sewer system is blocked, causing foul smell and backflow in toilets.',
  'Industrial waste is being dumped openly in the village fields.',
  'No garbage collection vehicle has visited our area in the past month.',
  'Dead animal carcass lying in the street has not been cleared for 3 days.',
  'Drains are not cleaned, breeding millions of mosquitoes and causing dengue.',
  'People are forced to practice open defecation due to broken public toilets.',
  'Medical waste from a local clinic is dumped behind the school playground.'
];

const healthComplaints = [
  'The village dispensary is always closed, no doctor or nurse is present.',
  'No anti-venom or basic medicines available at the primary health center.',
  'Pregnant women have to travel 15km to the city hospital because of no local facility.',
  'No clean beds or fans working in the hospital ward, patients are suffering.',
  'Ambulance did not arrive when called, leading to a patient casualty.',
  'Dog bite cases are rising but rabies vaccines are out of stock.',
  'The health clinic roof is leaking rainwater directly onto patient beds.',
  'No lady doctor available at the clinic, making women reluctant to visit.',
  'Malaria cases are rising rapidly, need urgent anti-mosquito fogging.',
  'The medical staff is demanding money for free government services.'
];

const educationComplaints = [
  'The primary school roof has cracked and might collapse during rains.',
  'No teachers are attending the government school, children are playing all day.',
  'No desks or chairs in the classrooms, kids are sitting on the cold damp floor.',
  'No functional toilets for girls in the school, leading to high dropout rates.',
  'Midday meal served is of extremely poor quality with insects in the food.',
  'The school building has no boundary wall, stray cows enter the classes.',
  'No electricity or fans in the school classrooms, temperature is 44 degrees.',
  'Computers provided by government are locked in a room and never used.',
  'No textbooks have been distributed even after 3 months of the session start.',
  'The playground is waterlogged and has become a swamp.'
];

// Let's create specific hotspots:
// Hotspot 1: Ramnagar Water/Sanitation (Around lat: 25.267, lng: 83.024)
// We will generate 15 complaints close to each other.
for (let i = 0; i < 15; i++) {
  const text = `Ramnagar Hotspot: ${waterComplaints[i % waterComplaints.length]} Heavy waterlogging and sewage mixing near Ramnagar fort area.`;
  complaintsData.push({
    category: 'water',
    subcategory: 'Sewage Mix',
    severity: i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Critical' : 'Medium',
    summary: 'Water logging and sewage mixing near Ramnagar fort',
    peopleAffected: 500 + Math.floor(Math.random() * 1000),
    urgency: 7 + Math.random() * 3,
    recommendedProject: 'New Sewage lines and water purification plant',
    keywords: 'water, sewage, contamination, leak, ramnagar',
    lat: 25.267 + (Math.random() - 0.5) * 0.004,
    lng: 83.024 + (Math.random() - 0.5) * 0.004,
    description: text
  });
}

// Hotspot 2: Shivpur Roads (Around lat: 25.358, lng: 82.969)
// 12 complaints
for (let i = 0; i < 12; i++) {
  const text = `Shivpur Road Leakage/Potholes: ${roadComplaints[i % roadComplaints.length]} Bad potholes and broken roads near Shivpur crossing.`;
  complaintsData.push({
    category: 'roads',
    subcategory: 'Potholes',
    severity: i % 2 === 0 ? 'High' : 'Medium',
    summary: 'Dilapidated road and heavy potholes at Shivpur main crossing',
    peopleAffected: 1000 + Math.floor(Math.random() * 1500),
    urgency: 6 + Math.random() * 3,
    recommendedProject: 'Road resurfacing and stormwater drain connection',
    keywords: 'road, potholes, accident, shivpur, broken',
    lat: 25.358 + (Math.random() - 0.5) * 0.003,
    lng: 82.969 + (Math.random() - 0.5) * 0.003,
    description: text
  });
}

// Hotspot 3: Lohta Sanitation/Water (Around lat: 25.321, lng: 82.916)
// 10 complaints
for (let i = 0; i < 10; i++) {
  const text = `Lohta Weaver Colony: ${sanitationComplaints[i % sanitationComplaints.length]} Extreme sewage overflow and open dump next to Lohta markets.`;
  complaintsData.push({
    category: 'sanitation',
    subcategory: 'Sewage Overflow',
    severity: i % 4 === 0 ? 'Critical' : 'High',
    summary: 'Sewage overflow and garbage piling up in Lohta weavers quarters',
    peopleAffected: 800 + Math.floor(Math.random() * 800),
    urgency: 8 + Math.random() * 2,
    recommendedProject: 'Decentralized wastewater plant and waste collection system',
    keywords: 'drain, overflow, sewage, trash, lohta, smell',
    lat: 25.321 + (Math.random() - 0.5) * 0.004,
    lng: 82.916 + (Math.random() - 0.5) * 0.004,
    description: text
  });
}

// Now generate the rest of the 100 complaints scattered across other villages and categories
const categories = ['roads', 'water', 'sanitation', 'health', 'education'];
const pool = {
  roads: roadComplaints,
  water: waterComplaints,
  sanitation: sanitationComplaints,
  health: healthComplaints,
  education: educationComplaints
};

const subcategories = {
  roads: ['Potholes', 'No Tar', 'Footpath Missing', 'Streetlights', 'Bridge Repair'],
  water: ['Contaminated Supply', 'Dry Borewells', 'Pipe Leaks', 'No Infrastructure', 'Low Pressure'],
  sanitation: ['Garbage Dumps', 'Overflowing Drains', 'Choked Sewer', 'Public Toilet Repair', 'Industrial Waste'],
  health: ['Doctor Absent', 'No Medicines', 'Facility Distance', 'Staff Negligence', 'No Ambulance'],
  education: ['Broken Roof', 'Teacher Absenteeism', 'No Desks', 'No Girls Toilet', 'Midday Meal Quality']
};

const villageLocs = villages;

while (complaintsData.length < 100) {
  const villageIdx = Math.floor(Math.random() * villageLocs.length);
  const village = villageLocs[villageIdx];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const poolList = pool[category];
  const desc = poolList[Math.floor(Math.random() * poolList.length)];
  const sub = subcategories[category][Math.floor(Math.random() * subcategories[category].length)];
  const severityOpts = ['Low', 'Medium', 'High', 'Critical'];
  const severity = severityOpts[Math.floor(Math.random() * severityOpts.length)];
  
  // slightly jitter village coordinates
  const lat = village.lat + (Math.random() - 0.5) * 0.015;
  const lng = village.lng + (Math.random() - 0.5) * 0.015;

  complaintsData.push({
    category,
    subcategory: sub,
    severity,
    summary: `${category.toUpperCase()}: ${desc.substring(0, 50)}...`,
    peopleAffected: 50 + Math.floor(Math.random() * 400),
    urgency: 2 + Math.random() * 8,
    recommendedProject: `Development work for local ${category} in ${village.name}`,
    keywords: `${category}, ${sub.toLowerCase()}, ${village.name.toLowerCase()}`,
    lat,
    lng,
    description: `Report from ${village.name}: ${desc}`
  });
}

// Write submissions and problem_records into the SQLite DB.
// To implement clustering, let's group them based on similarity
// Since this is a seed script, we will run the similarity grouping programmatically.
// First insert all submissions and build their problem_records, generating embeddings.

const insertSub = db.prepare(`
  INSERT INTO submissions (title, description, language, lat, lng)
  VALUES (?, ?, ?, ?, ?)
`);

const insertProblem = db.prepare(`
  INSERT INTO problem_records (submission_id, thread_id, category, subcategory, severity, summary, people_affected, urgency, recommended_project, keywords, embedding, lat, lng)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertedProblems = [];

db.transaction(() => {
  for (const c of complaintsData) {
    const subRes = insertSub.run(c.summary, c.description, 'English', c.lat, c.lng);
    const subId = subRes.lastInsertRowid;
    
    const embedding = generateMockEmbedding(c.category, c.description);
    const embeddingStr = JSON.stringify(embedding);

    const probRes = insertProblem.run(
      subId,
      null, // thread_id will be filled next
      c.category,
      c.subcategory,
      c.severity,
      c.summary || 'No summary provided',
      c.peopleAffected,
      c.urgency,
      c.recommendedProject,
      c.keywords,
      embeddingStr,
      c.lat,
      c.lng
    );
    
    insertedProblems.push({
      id: probRes.lastInsertRowid,
      category: c.category,
      embedding,
      lat: c.lat,
      lng: c.lng,
      summary: c.summary,
      peopleAffected: c.peopleAffected,
      urgency: c.urgency,
      severity: c.severity
    });
  }
})();

// Helper to compute Cosine Similarity in seed script
function seedCosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper for geographic distance
function seedDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 4. Perform clustering and priority engine on seeded records
// We cluster a record if it is within 5km and has > 0.8 cosine similarity of embedding
const threads = []; // [{ id, category, representative_record_id, summary, records: [] }]

for (const p of insertedProblems) {
  let matchedThread = null;
  
  for (const t of threads) {
    if (t.category !== p.category) continue;
    
    // Check match with representative record
    const rep = insertedProblems.find(item => item.id === t.representative_record_id);
    if (!rep) continue;
    
    const sim = seedCosineSimilarity(p.embedding, rep.embedding);
    const dist = seedDistance(p.lat, p.lng, rep.lat, rep.lng);
    
    if (sim > 0.75 && dist < 5.0) {
      matchedThread = t;
      break;
    }
  }
  
  if (matchedThread) {
    matchedThread.records.push(p);
  } else {
    const newThread = {
      id: threads.length + 1,
      category: p.category,
      representative_record_id: p.id,
      summary: p.summary,
      records: [p]
    };
    threads.push(newThread);
  }
}

// Insert threads and update records with thread_id
const insertThread = db.prepare(`
  INSERT INTO issue_threads (id, category, representative_record_id, summary, priority_score, component_scores)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const updateRecordThread = db.prepare(`
  UPDATE problem_records SET thread_id = ? WHERE id = ?
`);

// Compute scoring function for threads (Phase 3 spec)
// Formula: Combining normalized (0-10) inputs:
// 1. complaintCount (Log scale: log(count) / log(15) * 10, capped at 10)
// 2. populationExposure (village population nearest to thread location, normalized 0-10 based on max village pop 22000)
// 3. infraGapIndex (hospital distance / 2.4 - school_count * 2, composite normalized to 0-10)
// 4. urgency (average citizen reported urgency, 0-10)
// 5. imageSeverity (average severity where Critical=10, High=7, Medium=4, Low=1, default=5)
// Weighted sum: 2.5 * complaintCount + 2.0 * populationExposure + 2.0 * infraGapIndex + 2.0 * urgency + 1.5 * imageSeverity (adds up to 100 max)

db.transaction(() => {
  for (const t of threads) {
    // representative coordinates
    const rep = insertedProblems.find(item => item.id === t.representative_record_id);
    const lat = rep ? rep.lat : 25.3;
    const lng = rep ? rep.lng : 82.9;
    
    // Find closest village
    let closestVillage = villages[0];
    let minDist = Infinity;
    for (const v of villages) {
      const d = seedDistance(lat, lng, v.lat, v.lng);
      if (d < minDist) {
        minDist = d;
        closestVillage = v;
      }
    }
    
    // 1. Complaint Count Score (0-10)
    const count = t.records.length;
    const complaintScore = Math.min(10, (Math.log(count + 1) / Math.log(10)) * 10);
    
    // 2. Population Exposure (0-10)
    // Max village pop in seeds is 22000 (Ramnagar). Scale linearly
    const popScore = (closestVillage.population / 22000) * 10;
    
    // 3. Infrastructure Gap (0-10)
    // composite of hospital_distance (higher = worse), school_count (lower = worse), flood_zone (1 = worse)
    // Distance up to 25km. school_count from 0 to 5.
    const distFactor = Math.min(10, (closestVillage.hospital_distance_km / 25) * 10);
    const schoolFactor = Math.max(0, 10 - (closestVillage.school_count * 2));
    const floodFactor = closestVillage.flood_zone === 1 ? 10 : 0;
    const infraGapScore = (distFactor * 0.4 + schoolFactor * 0.4 + floodFactor * 0.2); // already 0-10 scale
    
    // 4. Urgency (0-10)
    const totalUrgency = t.records.reduce((sum, r) => sum + r.urgency, 0);
    const urgencyScore = totalUrgency / count;
    
    // 5. Image Severity (0-10)
    const severityMap = { 'Critical': 10, 'High': 7, 'Medium': 4, 'Low': 1 };
    const totalSeverity = t.records.reduce((sum, r) => sum + (severityMap[r.severity] || 5), 0);
    const severityScore = totalSeverity / count;
    
    // Calculate final weighted score out of 100
    const finalScore = (
      2.5 * complaintScore + 
      2.0 * popScore + 
      2.0 * infraGapScore + 
      2.0 * urgencyScore + 
      1.5 * severityScore
    );

    const componentScores = {
      complaintCount: { raw: count, normalized: parseFloat(complaintScore.toFixed(2)), weight: 2.5 },
      populationExposure: { raw: closestVillage.population, normalized: parseFloat(popScore.toFixed(2)), weight: 2.0 },
      infraGapIndex: { raw: `Dist: ${closestVillage.hospital_distance_km}km, Schools: ${closestVillage.school_count}`, normalized: parseFloat(infraGapScore.toFixed(2)), weight: 2.0 },
      citizenUrgency: { raw: parseFloat(urgencyScore.toFixed(2)), normalized: parseFloat(urgencyScore.toFixed(2)), weight: 2.0 },
      imageSeverity: { raw: 'AI Evaluated', normalized: parseFloat(severityScore.toFixed(2)), weight: 1.5 },
      villageName: closestVillage.name
    };

    insertThread.run(
      t.id,
      t.category,
      t.representative_record_id,
      t.summary,
      parseFloat(finalScore.toFixed(1)),
      JSON.stringify(componentScores)
    );

    for (const r of t.records) {
      updateRecordThread.run(t.id, r.id);
    }
  }
})();

console.log(`Seeding complete:
- 15 Villages inserted.
- 5 Existing development plans inserted.
- 100 Synthetic complaints created and inserted.
- Clustered complaints into ${threads.length} issue threads.
- Calculated and persisted priority scores.
`);
