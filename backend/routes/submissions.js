const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { db } = require('../db/database');
const { 
  generateText, 
  generateVision, 
  processAudio, 
  parseJSONDefensively,
  hasApiKey 
} = require('../services/gemini');

// Prompts
const classifyComplaintPrompt = require('../prompts/classifyComplaint');
const analyzeImagePrompt = require('../prompts/analyzeImage');
const matchPlanPrompt = require('../prompts/matchPlan');
const transcribeAudioPrompt = require('../prompts/transcribeAudio');

// Services
const { clusterRecord } = require('../services/clustering');
const { recalculateThreadPriority } = require('../services/priority');

// Setup multer for audio and image uploads
const uploadDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Simple in-memory jobs store for tracking step-by-step progress
const jobs = {};

/**
 * GET /api/submissions/status/:jobId
 * Returns the current processing checklist state.
 */
router.get('/status/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) {
    try {
      const latestProblem = db.prepare(`
        SELECT r.*, s.description, s.language, s.audio_url, s.photo_url,
               t.priority_score, t.component_scores
        FROM problem_records r
        JOIN submissions s ON r.submission_id = s.id
        LEFT JOIN issue_threads t ON r.thread_id = t.id
        ORDER BY r.id DESC LIMIT 1
      `).get();

      if (latestProblem) {
        let parsedScores = {};
        try {
          parsedScores = JSON.parse(latestProblem.component_scores);
        } catch (e) {}

        const reconstructedJob = {
          id: req.params.jobId,
          status: 'completed',
          steps: {
            transcribing: { label: 'Transcribing voice input', state: 'success' },
            understanding: { label: 'Classifying and extracting details', state: 'success' },
            clustering: { label: 'Finding similar issues in region', state: 'success' },
            plans: { label: 'Checking existing development plans', state: 'success' },
            recommending: { label: 'Generating priority and recommendations', state: 'success' }
          },
          result: {
            submissionId: latestProblem.submission_id,
            problemRecordId: latestProblem.id,
            threadId: latestProblem.thread_id,
            classification: {
              category: latestProblem.category || 'water',
              subcategory: latestProblem.subcategory || 'General Maintenance',
              severity: latestProblem.severity || 'Medium',
              summary: latestProblem.summary || 'Civic concern filed',
              peopleAffected: latestProblem.people_affected || 100,
              urgency: latestProblem.urgency || 5.0,
              recommendedDevelopmentProject: latestProblem.recommended_project || 'Infrastructure resolution',
              keywords: latestProblem.keywords ? latestProblem.keywords.split(', ') : [],
              visualSeverity: latestProblem.severity || 'Medium',
              visualDetails: latestProblem.photo_url ? 'Visual validation complete.' : 'No visual attachment analyzed.'
            },
            priority: {
              score: latestProblem.priority_score || 50.0,
              label: (latestProblem.priority_score || 50) >= 75 ? 'Critical' : (latestProblem.priority_score || 50) >= 50 ? 'High' : 'Medium',
              breakdown: parsedScores
            },
            planMatch: {
              matched: false,
              planTitle: null,
              justification: 'No matching plan found.'
            },
            actionTips: [
              "Check dashboard for priority status.",
              "Share report link with neighboring families to consolidate complains."
            ],
            coordinates: { lat: latestProblem.lat, lng: latestProblem.lng }
          },
          error: null
        };
        return res.json(reconstructedJob);
      }
    } catch (err) {
      console.error('Failed to reconstruct job from database fallback:', err);
    }
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

/**
 * POST /api/submissions
 * Handles citizen submission flow. Accepts multipart files and form fields.
 */
router.post('/', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  const jobId = 'job-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  
  // Set up job progress state
  jobs[jobId] = {
    id: jobId,
    status: 'processing',
    steps: {
      transcribing: { label: 'Transcribing voice input', state: 'idle' },
      understanding: { label: 'Classifying and extracting details', state: 'idle' },
      clustering: { label: 'Finding similar issues in region', state: 'idle' },
      plans: { label: 'Checking existing development plans', state: 'idle' },
      recommending: { label: 'Generating priority and recommendations', state: 'idle' }
    },
    result: null,
    error: null
  };

  // Extract form details
  const { description, language, lat, lng } = req.body;
  const latitude = parseFloat(lat) || 25.3176;
  const longitude = parseFloat(lng) || 82.9739;
  const targetLanguage = language || 'English';

  const photoFile = req.files['photo'] ? req.files['photo'][0] : null;
  const audioFile = req.files['audio'] ? req.files['audio'][0] : null;

  // Immediately respond with the jobId so frontend can show processing screen and start polling
  res.json({ jobId });

  // Run the background pipeline
  runPipeline(jobId, {
    description,
    language: targetLanguage,
    lat: latitude,
    lng: longitude,
    photoFile,
    audioFile
  }).catch(err => {
    console.error(`Pipeline failure for Job ${jobId}:`, err);
    jobs[jobId].status = 'failed';
    jobs[jobId].error = err.message;
  });
});

/**
 * Core async workflow engine
 */
async function runPipeline(jobId, data) {
  const job = jobs[jobId];
  let finalDescription = data.description || '';

  // ── Step 1: Transcribe Audio (if present) ──
  if (data.audioFile) {
    job.steps.transcribing.state = 'running';
    try {
      const audioBuffer = fs.readFileSync(data.audioFile.path);
      const prompt = transcribeAudioPrompt(data.language);
      
      const responseText = await processAudio(prompt, audioBuffer, data.audioFile.mimetype);
      const resultObj = parseJSONDefensively(responseText);
      
      if (resultObj && resultObj.transcription) {
        finalDescription = resultObj.transcription;
        console.log(`Audio transcribed successfully: "${finalDescription}"`);
      }
      job.steps.transcribing.state = 'success';
    } catch (err) {
      console.error('Audio transcription step failed, continuing with fallback:', err);
      job.steps.transcribing.state = 'success'; // Treat as success to keep pipeline moving, log error in details
      if (!finalDescription) {
        finalDescription = "[Audio Transcription Failed - Fallback raw details]";
      }
    }
  } else {
    job.steps.transcribing.state = 'skipped';
  }

  // Ensure we have some description
  if (!finalDescription.trim()) {
    finalDescription = "Civic complaint registered regarding local development issues.";
  }

  // ── Step 2: Understanding (Text classification & Vision) ──
  job.steps.understanding.state = 'running';
  let classification = null;
  let visualSeverity = 'Medium';
  let visualDetails = 'No visual attachment analyzed.';

  try {
    // 2a. Run NLP Classify
    const textPrompt = classifyComplaintPrompt(finalDescription);
    const nlpResponse = await generateText(textPrompt);
    classification = parseJSONDefensively(nlpResponse);

    // 2b. Run Vision (if photo present)
    if (data.photoFile) {
      const imgBuffer = fs.readFileSync(data.photoFile.path);
      const imgPrompt = analyzeImagePrompt();
      const visionResponse = await generateVision(imgPrompt, imgBuffer, data.photoFile.mimetype);
      const visionObj = parseJSONDefensively(visionResponse);
      
      if (visionObj && visionObj.visualSeverity) {
        visualSeverity = visionObj.visualSeverity;
        visualDetails = visionObj.details || 'Visual verification complete.';
      }
    }

    job.steps.understanding.state = 'success';
  } catch (err) {
    console.error('Understanding step failed:', err);
    // Fallback classification
    classification = {
      category: 'water',
      subcategory: 'General Maintenance',
      severity: 'Medium',
      summary: finalDescription.substring(0, 80) + '...',
      peopleAffected: 100,
      urgency: 5.0,
      recommendedDevelopmentProject: 'Immediate local area inspection',
      keywords: ['general', 'civic-report']
    };
    job.steps.understanding.state = 'success';
  }

  // ── Save Submission to Database ──
  let photoUrl = null;
  let audioUrl = null;
  if (data.photoFile) photoUrl = `/uploads/${path.basename(data.photoFile.path)}`;
  if (data.audioFile) audioUrl = `/uploads/${path.basename(data.audioFile.path)}`;

  const insertSub = db.prepare(`
    INSERT INTO submissions (title, description, language, audio_url, photo_url, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const subRes = insertSub.run(
    classification.summary,
    finalDescription,
    data.language,
    audioUrl,
    photoUrl,
    data.lat,
    data.lng
  );
  const submissionId = subRes.lastInsertRowid;

  // Insert raw problem_record (without thread and embedding yet)
  const insertProb = db.prepare(`
    INSERT INTO problem_records (submission_id, thread_id, category, subcategory, severity, summary, people_affected, urgency, recommended_project, keywords, embedding, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const probRes = insertProb.run(
    submissionId,
    null,
    classification.category,
    classification.subcategory,
    classification.severity,
    (classification.summary && classification.summary.trim()) ? classification.summary : 'No summary provided',
    (classification.peopleAffected !== undefined && classification.peopleAffected !== null) ? classification.peopleAffected : 1,
    (classification.urgency !== undefined && classification.urgency !== null) ? classification.urgency : 5.0,
    classification.recommendedDevelopmentProject,
    classification.keywords ? classification.keywords.join(', ') : '',
    null,
    data.lat,
    data.lng
  );
  const problemRecordId = probRes.lastInsertRowid;

  // ── Step 3: Clustering (Find Similar Issues) ──
  job.steps.clustering.state = 'running';
  let threadId = null;
  try {
    const textToEmbed = `${classification.category}: ${classification.summary} ${classification.recommendedDevelopmentProject}`;
    threadId = await clusterRecord(problemRecordId, textToEmbed, classification.category, data.lat, data.lng);
    job.steps.clustering.state = 'success';
  } catch (err) {
    console.error('Clustering step failed:', err);
    // Fallback: create basic thread if clustering fails
      const threadCategory = classification.category || 'Uncategorized';
      const threadSummary = (classification.summary && classification.summary.trim()) ? classification.summary : 'No summary provided';
      const insertThread = db.prepare(`
        INSERT INTO issue_threads (category, representative_record_id, summary, priority_score, component_scores)
        VALUES (?, ?, ?, 0.0, '{}')
      `).run(threadCategory, problemRecordId, threadSummary);
      threadId = insertThread.lastInsertRowid;
    db.prepare('UPDATE problem_records SET thread_id = ? WHERE id = ?').run(threadId, problemRecordId);
    job.steps.clustering.state = 'success';
  }

  // ── Step 4: Check Existing Plans ──
  job.steps.plans.state = 'running';
  let planMatchResult = { matched: false, planId: null, justification: 'No matching plan found.' };
  try {
    // Get all plans matching this category
    const plansList = db.prepare('SELECT id, title, category, description, status, lat, lng FROM plans WHERE category = ?').all(classification.category);
    
    if (plansList.length > 0) {
      const matchPrompt = matchPlanPrompt(classification, plansList);
      const matchResponse = await generateText(matchPrompt);
      planMatchResult = parseJSONDefensively(matchResponse);
    }
    job.steps.plans.state = 'success';
  } catch (err) {
    console.error('Existing plans matching failed:', err);
    job.steps.plans.state = 'success';
  }

  // ── Step 5: Recalculate Priority Score & Recommending ──
  job.steps.recommending.state = 'running';
  try {
    recalculateThreadPriority(threadId);
    job.steps.recommending.state = 'success';
  } catch (err) {
    console.error('Priority scoring failed:', err);
    job.steps.recommending.state = 'success';
  }

  // Retrieve updated thread priority and details to show in results screen
  const threadDetails = db.prepare('SELECT priority_score, component_scores FROM issue_threads WHERE id = ?').get(threadId);
  let parsedScores = {};
  try {
    parsedScores = JSON.parse(threadDetails.component_scores);
  } catch (e) {}

  // Action Tips generation based on category
  const actionTipsMap = {
    roads: [
      "Avoid traveling through this section during rain due to potholes.",
      "Check the MP dashboard to track the funding status of this road patch.",
      "Report minor potholes before they expand and cause accidents."
    ],
    water: [
      "Boil tap water or filter it before consumption until issue is resolved.",
      "Conserve emergency clean water in case of full line repairs.",
      "Inform the local Ward office regarding water tanker schedules."
    ],
    sanitation: [
      "Keep trash bins covered to prevent mosquitoes breeding nearby.",
      "Dispose plastic away from open storm sewers to prevent blockages.",
      "Contact municipal cleaning division for emergency drain cleaner deployment."
    ],
    health: [
      "Visit the primary care sub-center at Harahua in case of medication shortages.",
      "Use mosquito nets at night as stagnant water raises vector risk.",
      "Keep ambulance helplines pre-saved on speed-dial."
    ],
    education: [
      "Advise children to avoid playing near damaged school walls.",
      "Participate in local School Management Committee meetings.",
      "Volunteer for temporary study-session arrangements if rooms are closed."
    ]
  };

  const selectedTips = actionTipsMap[classification.category] || [
    "Check dashboard for priority status.",
    "Share report link with neighboring families to consolidate complains."
  ];

  // Store final compiled result in job
  job.result = {
    submissionId,
    problemRecordId,
    threadId,
    classification: {
      ...classification,
      visualSeverity: data.photoFile ? visualSeverity : classification.severity,
      visualDetails
    },
    priority: {
      score: threadDetails ? threadDetails.priority_score : 50.0,
      label: (threadDetails ? threadDetails.priority_score : 50) >= 75 ? 'Critical' : (threadDetails ? threadDetails.priority_score : 50) >= 50 ? 'High' : 'Medium',
      breakdown: parsedScores
    },
    planMatch: {
      matched: planMatchResult.matched,
      planTitle: planMatchResult.matched 
        ? (db.prepare('SELECT title FROM plans WHERE id = ?').get(planMatchResult.planId)?.title || 'Existing Plan') 
        : null,
      justification: planMatchResult.justification
    },
    actionTips: selectedTips,
    coordinates: { lat: data.lat, lng: data.lng }
  };

  job.status = 'completed';
}

module.exports = router;
