// ========== data.js — Bridge between TCASX frontend and Flask API ==========

// ---- Firebase Init (compat SDK loaded via <script> in index.html) ----
firebase.initializeApp({
  apiKey: "AIzaSyDP18fvle5Ls1mPPd6OVHII7Ay2_thaHbQ",
  authDomain: "tcasx-48020.firebaseapp.com",
  projectId: "tcasx-48020",
  storageBucket: "tcasx-48020.firebasestorage.app",
  messagingSenderId: "782302455229",
  appId: "1:782302455229:web:5655f95a226e0015e59ed4",
  measurementId: "G-JXR0PHP08E"
});
const auth = firebase.auth();
const db = firebase.firestore();

// ---- API Base ----
const API_BASE = 'http://localhost:5000/api';

// ---- Constants ----
const TYPE_LABELS = {
  academic: 'วิชาการ',
  volunteer: 'จิตอาสา',
  leadership: 'ความเป็นผู้นำ',
  sport_art: 'กีฬา/ศิลปะ',
  language: 'ภาษา'
};

const TYPE_EMOJIS = {
  academic: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
  volunteer: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
  leadership: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
  sport_art: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>',
  language: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
};

const LEVEL_LABELS = {
  school: 'โรงเรียน',
  regional: 'ภาค',
  national: 'ประเทศ',
  international: 'นานาชาติ'
};

const STATUS_LABELS = {
  completed: 'เสร็จสิ้น',
  inprogress: 'กำลังดำเนินการ',
  planned: 'วางแผน'
};

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// ---- Faculties (fallback — overwritten by API) ----
const UNI_SVG = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>';
let FACULTIES = [
  // จุฬาฯ
  { id:'eng_cu', name:'คณะวิศวกรรมศาสตร์', uni:'จุฬาลงกรณ์มหาวิทยาลัย', emoji: UNI_SVG, req:{academic:3,volunteer:1,leadership:1,sport_art:0,language:1} },
  { id:'med_cu', name:'คณะแพทยศาสตร์', uni:'จุฬาลงกรณ์มหาวิทยาลัย', emoji: UNI_SVG, req:{academic:3,volunteer:2,leadership:1,sport_art:0,language:1} },
  { id:'sci_cu', name:'คณะวิทยาศาสตร์', uni:'จุฬาลงกรณ์มหาวิทยาลัย', emoji: UNI_SVG, req:{academic:3,volunteer:1,leadership:0,sport_art:0,language:1} },
  { id:'arts_cu', name:'คณะอักษรศาสตร์', uni:'จุฬาลงกรณ์มหาวิทยาลัย', emoji: UNI_SVG, req:{academic:1,volunteer:1,leadership:0,sport_art:0,language:3} },
  { id:'acc_cu', name:'คณะพาณิชยศาสตร์และการบัญชี', uni:'จุฬาลงกรณ์มหาวิทยาลัย', emoji: UNI_SVG, req:{academic:2,volunteer:0,leadership:2,sport_art:0,language:1} },
  { id:'arch_cu', name:'คณะสถาปัตยกรรมศาสตร์', uni:'จุฬาลงกรณ์มหาวิทยาลัย', emoji: UNI_SVG, req:{academic:1,volunteer:1,leadership:0,sport_art:3,language:0} },
  // ธรรมศาสตร์
  { id:'eng_tu', name:'คณะวิศวกรรมศาสตร์', uni:'มหาวิทยาลัยธรรมศาสตร์', emoji: UNI_SVG, req:{academic:2,volunteer:1,leadership:0,sport_art:1,language:0} },
  { id:'law_tu', name:'คณะนิติศาสตร์', uni:'มหาวิทยาลัยธรรมศาสตร์', emoji: UNI_SVG, req:{academic:2,volunteer:0,leadership:2,sport_art:0,language:1} },
  { id:'polsci_tu', name:'คณะรัฐศาสตร์', uni:'มหาวิทยาลัยธรรมศาสตร์', emoji: UNI_SVG, req:{academic:0,volunteer:2,leadership:2,sport_art:0,language:1} },
  { id:'econ_tu', name:'คณะเศรษฐศาสตร์', uni:'มหาวิทยาลัยธรรมศาสตร์', emoji: UNI_SVG, req:{academic:2,volunteer:0,leadership:1,sport_art:0,language:2} },
  { id:'comm_tu', name:'คณะวารสารศาสตร์ฯ', uni:'มหาวิทยาลัยธรรมศาสตร์', emoji: UNI_SVG, req:{academic:0,volunteer:1,leadership:0,sport_art:2,language:2} },
  // มหิดล
  { id:'med_mu', name:'คณะแพทยศาสตร์ศิริราช', uni:'มหาวิทยาลัยมหิดล', emoji: UNI_SVG, req:{academic:3,volunteer:2,leadership:1,sport_art:0,language:0} },
  { id:'sci_mu', name:'คณะวิทยาศาสตร์', uni:'มหาวิทยาลัยมหิดล', emoji: UNI_SVG, req:{academic:3,volunteer:1,leadership:0,sport_art:0,language:1} },
  { id:'ict_mu', name:'คณะ ICT', uni:'มหาวิทยาลัยมหิดล', emoji: UNI_SVG, req:{academic:2,volunteer:0,leadership:0,sport_art:1,language:1} },
  { id:'nurse_mu', name:'คณะพยาบาลศาสตร์', uni:'มหาวิทยาลัยมหิดล', emoji: UNI_SVG, req:{academic:2,volunteer:3,leadership:0,sport_art:0,language:0} },
  // สจล.
  { id:'eng_kmitl', name:'คณะวิศวกรรมศาสตร์', uni:'สจล.', emoji: UNI_SVG, req:{academic:3,volunteer:1,leadership:0,sport_art:0,language:0} },
  { id:'cs_kmitl', name:'คณะเทคโนโลยีสารสนเทศ', uni:'สจล.', emoji: UNI_SVG, req:{academic:2,volunteer:1,leadership:0,sport_art:0,language:0} },
  { id:'arch_kmitl', name:'คณะสถาปัตยกรรมศาสตร์', uni:'สจล.', emoji: UNI_SVG, req:{academic:1,volunteer:0,leadership:0,sport_art:3,language:0} },
  // เกษตรศาสตร์
  { id:'eng_ku', name:'คณะวิศวกรรมศาสตร์', uni:'มหาวิทยาลัยเกษตรศาสตร์', emoji: UNI_SVG, req:{academic:2,volunteer:1,leadership:1,sport_art:0,language:0} },
  { id:'sci_ku', name:'คณะวิทยาศาสตร์', uni:'มหาวิทยาลัยเกษตรศาสตร์', emoji: UNI_SVG, req:{academic:2,volunteer:1,leadership:0,sport_art:0,language:0} },
  { id:'agri_ku', name:'คณะเกษตร', uni:'มหาวิทยาลัยเกษตรศาสตร์', emoji: UNI_SVG, req:{academic:2,volunteer:2,leadership:0,sport_art:0,language:0} },
  // มจธ.
  { id:'eng_kmutt', name:'คณะวิศวกรรมศาสตร์', uni:'มจธ.', emoji: UNI_SVG, req:{academic:3,volunteer:0,leadership:1,sport_art:0,language:0} },
  { id:'sci_kmutt', name:'คณะวิทยาศาสตร์', uni:'มจธ.', emoji: UNI_SVG, req:{academic:2,volunteer:1,leadership:0,sport_art:0,language:0} },
  { id:'it_kmutt', name:'คณะเทคโนโลยีสารสนเทศ', uni:'มจธ.', emoji: UNI_SVG, req:{academic:2,volunteer:0,leadership:0,sport_art:1,language:0} },
  // เชียงใหม่
  { id:'eng_cmu', name:'คณะวิศวกรรมศาสตร์', uni:'มหาวิทยาลัยเชียงใหม่', emoji: UNI_SVG, req:{academic:2,volunteer:1,leadership:0,sport_art:0,language:0} },
  { id:'med_cmu', name:'คณะแพทยศาสตร์', uni:'มหาวิทยาลัยเชียงใหม่', emoji: UNI_SVG, req:{academic:3,volunteer:2,leadership:1,sport_art:0,language:0} },
  { id:'masscomm_cmu', name:'คณะการสื่อสารมวลชน', uni:'มหาวิทยาลัยเชียงใหม่', emoji: UNI_SVG, req:{academic:0,volunteer:0,leadership:0,sport_art:2,language:2} },
  // ขอนแก่น
  { id:'eng_kku', name:'คณะวิศวกรรมศาสตร์', uni:'มหาวิทยาลัยขอนแก่น', emoji: UNI_SVG, req:{academic:2,volunteer:1,leadership:0,sport_art:0,language:0} },
  { id:'med_kku', name:'คณะแพทยศาสตร์', uni:'มหาวิทยาลัยขอนแก่น', emoji: UNI_SVG, req:{academic:3,volunteer:2,leadership:0,sport_art:0,language:0} },
  { id:'edu_kku', name:'คณะศึกษาศาสตร์', uni:'มหาวิทยาลัยขอนแก่น', emoji: UNI_SVG, req:{academic:0,volunteer:2,leadership:2,sport_art:0,language:0} },
];

// ---- Explore Items (populated from API) ----
let EXPLORE_ITEMS = [];

// ---- App State ----
let appState = {
  isAuthenticated: false,
  currentUser: null,
  grade: '',
  track: '',
  faculties: [],
  onboarded: false,
  activities: [],
  roadmap: []
};

// Load from localStorage as initial fallback
try {
  const saved = localStorage.getItem('tcasx_state');
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.assign(appState, parsed);
  }
} catch (e) { /* ignore */ }

// ---- Save State ----
function saveState() {
  localStorage.setItem('tcasx_state', JSON.stringify(appState));

  // Also persist to Firestore if authenticated
  const user = auth.currentUser;
  if (user) {
    db.collection('users').doc(user.uid).set({
      grade: appState.grade,
      track: appState.track,
      faculties: appState.faculties,
      onboarded: appState.onboarded,
      activities: appState.activities,
      roadmap: appState.roadmap,
      name: appState.currentUser?.name || '',
      bio: appState.currentUser?.bio || '',
      isPublic: !!appState.currentUser?.isPublic,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(e => console.warn('Firestore save error:', e));
  }
}

// ---- Score Helpers (legacy — kept for backward compatibility) ----
function getScores() {
  const scores = {};
  appState.activities.forEach(a => {
    if (!scores[a.type]) scores[a.type] = 0;
    const weight = { school: 1, regional: 2, national: 3, international: 4 }[a.level] || 1;
    scores[a.type] += weight;
  });
  return scores;
}

function getTargetReqs() {
  if (!appState.faculties.length) return { academic: 3, volunteer: 1, leadership: 1, sport_art: 0, language: 1 };
  const fac = FACULTIES.find(f => f.id === appState.faculties[0]);
  return fac ? fac.req : { academic: 3, volunteer: 1, leadership: 1, sport_art: 0, language: 1 };
}

function getCompletionPct() {
  const analysis = runAIAnalysis();
  return analysis.overallScore;
}

// ========== AI Analysis Engine ==========
// Evaluates each activity individually and produces a holistic portfolio assessment
function runAIAnalysis() {
  const reqs = getTargetReqs();
  const activities = appState.activities || [];
  const fac = appState.faculties.length ? FACULTIES.find(f => f.id === appState.faculties[0]) : null;

  // --- Step 1: Analyze each activity individually ---
  const activityAnalyses = activities.map(a => analyzeActivity(a, reqs, fac));

  // --- Step 2: Compute category-level signals ---
  const categorySignals = {};
  Object.keys(TYPE_LABELS).forEach(cat => {
    const catActivities = activityAnalyses.filter(aa => aa.type === cat);
    const reqWeight = reqs[cat] || 0;

    // Aggregate quality from individual assessments
    let totalQuality = 0;
    let bestLevel = 0;
    let completedCount = 0;
    let diversityNames = new Set();

    catActivities.forEach(aa => {
      totalQuality += aa.qualityScore;
      bestLevel = Math.max(bestLevel, aa.levelPrestige);
      if (aa.isCompleted) completedCount++;
      diversityNames.add(aa.name);
    });

    // Fulfillment is based on quality accumulated vs requirement
    const fulfillment = reqWeight > 0 ? Math.min(1, totalQuality / (reqWeight * 25)) : (catActivities.length > 0 ? 1 : 0);

    categorySignals[cat] = {
      count: catActivities.length,
      totalQuality,
      bestLevel,
      completedCount,
      uniqueActivities: diversityNames.size,
      fulfillment,
      required: reqWeight,
      status: reqWeight === 0 ? 'optional' : fulfillment >= 1 ? 'strong' : fulfillment >= 0.5 ? 'developing' : fulfillment > 0 ? 'weak' : 'missing'
    };
  });

  // --- Step 3: Holistic portfolio assessment ---
  const totalRequired = Object.values(reqs).reduce((s, v) => s + v, 0);
  const requiredCategories = Object.keys(reqs).filter(k => reqs[k] > 0);

  // Weighted score across categories
  let weightedScore = 0;
  let maxPossible = 0;
  requiredCategories.forEach(cat => {
    const weight = reqs[cat];
    maxPossible += weight;
    weightedScore += categorySignals[cat].fulfillment * weight;
  });

  // Diversity bonus: activities across different categories
  const activeCats = Object.keys(categorySignals).filter(k => categorySignals[k].count > 0).length;
  const diversityBonus = Math.min(10, activeCats * 2);

  // Completion bonus: having completed activities rather than just planned
  const totalCompleted = activityAnalyses.filter(a => a.isCompleted).length;
  const completionRatio = activities.length > 0 ? totalCompleted / activities.length : 0;
  const completionBonus = Math.round(completionRatio * 10);

  // Level prestige bonus
  const hasNationalOrAbove = activityAnalyses.some(a => a.levelPrestige >= 3);
  const prestigeBonus = hasNationalOrAbove ? 5 : 0;

  const rawScore = maxPossible > 0 ? (weightedScore / maxPossible) * 75 : 0;
  const overallScore = Math.min(100, Math.round(rawScore + diversityBonus + completionBonus + prestigeBonus));

  // --- Step 4: Generate insights ---
  const gaps = [];
  const strengths = [];
  const recommendations = [];
  const warnings = [];

  requiredCategories.forEach(cat => {
    const sig = categorySignals[cat];
    if (sig.status === 'strong') {
      strengths.push({
        category: cat,
        message: `${TYPE_LABELS[cat]} — ผ่านเกณฑ์แล้ว`,
        detail: sig.count === 1
          ? `มี 1 กิจกรรม คุณภาพดี`
          : `มี ${sig.count} กิจกรรม แสดงถึงความมุ่งมั่น`,
        level: sig.bestLevel >= 3 ? 'excellent' : 'good'
      });
    } else if (sig.status === 'developing') {
      gaps.push({
        category: cat,
        severity: 'medium',
        message: `${TYPE_LABELS[cat]} — กำลังพัฒนา`,
        detail: `มีกิจกรรมแล้วแต่ยังไม่เพียงพอ ลองเพิ่มกิจกรรมระดับภาคหรือประเทศ`,
        actionable: true
      });
    } else if (sig.status === 'weak') {
      gaps.push({
        category: cat,
        severity: 'high',
        message: `${TYPE_LABELS[cat]} — ยังอ่อน`,
        detail: `มีกิจกรรมน้อยเกินไป ต้องเพิ่มอย่างน้อย ${Math.max(1, reqs[cat] - sig.count)} กิจกรรม`,
        actionable: true
      });
    } else if (sig.status === 'missing') {
      gaps.push({
        category: cat,
        severity: 'critical',
        message: `${TYPE_LABELS[cat]} — ยังไม่มีเลย`,
        detail: `คณะต้องการด้านนี้ ควรเริ่มหากิจกรรมทันที`,
        actionable: true
      });
    }
  });

  // Intelligent warnings
  if (activities.length > 0 && completionRatio < 0.3) {
    warnings.push('กิจกรรมส่วนใหญ่ยังไม่เสร็จสิ้น ควรเร่งทำให้เสร็จเพื่อใส่ในพอร์ตได้');
  }
  if (activities.length > 5 && activeCats <= 2) {
    warnings.push('กิจกรรมกระจุกอยู่ไม่กี่หมวด ควรเพิ่มความหลากหลายในพอร์ต');
  }
  const allSchoolLevel = activities.length > 0 && activityAnalyses.every(a => a.levelPrestige <= 1);
  if (allSchoolLevel && activities.length >= 3) {
    warnings.push('กิจกรรมทั้งหมดเป็นระดับโรงเรียน ลองสมัครกิจกรรมระดับภาคหรือประเทศเพื่อเพิ่มน้ำหนัก');
  }

  // Smart recommendations: pick activities that fill gaps
  const gapCategories = gaps.map(g => g.category);
  const recPool = EXPLORE_ITEMS.filter(e => gapCategories.includes(e.type));

  // Score each recommendation by relevance
  const scoredRecs = recPool.map(item => {
    const gap = gaps.find(g => g.category === item.type);
    let score = 0;
    score += gap?.severity === 'critical' ? 30 : gap?.severity === 'high' ? 20 : 10;
    // Prefer higher-level activities to boost prestige
    if (['ประเทศ', 'นานาชาติ'].includes(item.cert)) score += 15;
    if (['ภาค'].includes(item.cert)) score += 8;
    // Prefer activities with more spots (easier to get in)
    if (item.spots >= 100) score += 5;
    return { ...item, matchScore: score, reason: gap?.message || '' };
  });

  scoredRecs.sort((a, b) => b.matchScore - a.matchScore);
  const topRecs = scoredRecs.slice(0, 4);

  // --- Step 5: Generate overall verdict ---
  let verdict = '';
  let verdictType = '';
  if (overallScore >= 85) {
    verdict = 'พอร์ตฟอลิโอของคุณแข็งแกร่งมาก! พร้อมยื่น TCAS รอบ 1';
    verdictType = 'excellent';
  } else if (overallScore >= 60) {
    verdict = 'พอร์ตกำลังดี แต่ยังมีช่องว่างที่ควรเสริม';
    verdictType = 'good';
  } else if (overallScore >= 30) {
    verdict = 'ยังต้องพัฒนาอีกเยอะ เริ่มเพิ่มกิจกรรมตามคำแนะนำ';
    verdictType = 'developing';
  } else if (activities.length > 0) {
    verdict = 'เพิ่งเริ่มต้น ยังมีเวลา! ลองดูกิจกรรมที่แนะนำ';
    verdictType = 'starting';
  } else {
    verdict = 'ยังไม่มีกิจกรรม เริ่มต้นเพิ่มกิจกรรมแรกได้เลย!';
    verdictType = 'empty';
  }

  return {
    overallScore,
    verdict,
    verdictType,
    activityAnalyses,
    categorySignals,
    gaps,
    strengths,
    warnings,
    recommendations: topRecs,
    stats: {
      totalActivities: activities.length,
      completedActivities: totalCompleted,
      activeCategoriesCount: activeCats,
      diversityBonus,
      completionBonus,
      prestigeBonus
    }
  };
}

// Analyze a single activity for quality signals
function analyzeActivity(activity, reqs, targetFac) {
  const levelPrestige = { school: 1, regional: 2, national: 3, international: 4 }[activity.level] || 1;
  const isCompleted = activity.status === 'completed';
  const isInProgress = activity.status === 'inprogress';
  const hasDescription = !!(activity.desc && activity.desc.trim().length > 10);

  // Recency: activities within last 2 years get a bonus
  let recencyScore = 0;
  if (activity.date) {
    const actDate = new Date(activity.date);
    const monthsAgo = (new Date() - actDate) / (1000 * 60 * 60 * 24 * 30);
    recencyScore = monthsAgo <= 6 ? 10 : monthsAgo <= 12 ? 7 : monthsAgo <= 24 ? 4 : 1;
  } else {
    recencyScore = 5; // neutral if no date
  }

  // Quality score considers multiple dimensions
  let qualityScore = 0;

  // Level prestige (0-30 pts)
  qualityScore += levelPrestige * 7.5;

  // Completion status (0-20 pts)
  qualityScore += isCompleted ? 20 : isInProgress ? 12 : 5;

  // Description richness (0-10 pts)
  qualityScore += hasDescription ? 10 : 3;

  // Recency (0-10 pts)
  qualityScore += recencyScore;

  // Relevance to target faculty (0-15 pts)
  const categoryRequired = reqs[activity.type] || 0;
  qualityScore += categoryRequired > 0 ? 15 : 5;

  // Clamp to 0-100
  qualityScore = Math.min(100, Math.max(0, qualityScore));

  // Generate per-activity insight
  let insight = '';
  if (qualityScore >= 70) insight = 'คุณภาพดีเยี่ยม';
  else if (qualityScore >= 50) insight = 'คุณภาพดี';
  else if (qualityScore >= 30) insight = 'พอใช้ได้';
  else insight = 'ควรเสริมรายละเอียด';

  return {
    id: activity.id,
    name: activity.name,
    type: activity.type,
    level: activity.level,
    levelPrestige,
    isCompleted,
    isInProgress,
    hasDescription,
    recencyScore,
    qualityScore,
    insight,
    categoryRequired
  };
}

// ---- Load Data from Flask API ----
const EXPIRED_KEYWORDS = ['ปิดรับสมัครแล้ว', 'หมดเขต', 'ปิดรับแล้ว', 'สิ้นสุดแล้ว'];
function isExpired(deadline) {
  return EXPIRED_KEYWORDS.some(kw => (deadline || '').includes(kw));
}

async function loadExternalData() {
  try {
    const res = await fetch(`${API_BASE}/activities`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const apiActivities = await res.json();
      EXPLORE_ITEMS = apiActivities
        .filter(a => !isExpired(a.deadline))
        .map((a, i) => ({
          id: a.id || i + 1,
          name: a.name,
          type: a.type,
          emoji: TYPE_EMOJIS[a.type] || '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
          deadline: a.deadline || 'ไม่ระบุ',
          spots: a.spots || 50,
          cert: a.level_th || 'ประเทศ',
          month: a.month || new Date().getMonth() + 1,
          link: a.link || '',
          image: a.image || ''
        }));
      console.log(`[TCASX] Loaded ${EXPLORE_ITEMS.length} activities from API (expired filtered)`);
    }
  } catch (e) {
    console.warn('[TCASX] API unavailable, using fallback data', e);
  }

  // Sync faculties from backend
  try {
    const facRes = await fetch(`${API_BASE}/faculties`, { signal: AbortSignal.timeout(5000) });
    if (facRes.ok) {
      const apiFacs = await facRes.json();
      if (apiFacs.length > 0) {
        FACULTIES = apiFacs.map(f => ({
          id: f.id,
          name: f.fac_th || f.name || '',
          uni: f.uni_th || f.uni || '',
          emoji: getUniEmoji(f.id),
          req: buildReqMap(f.reqs || f.req || {})
        }));
        console.log(`[TCASX] Loaded ${FACULTIES.length} faculties from API`);
      }
    }
  } catch (e) {
    console.warn('[TCASX] Faculty API unavailable, using defaults');
  }

  // If API returned nothing, use fallback explore items
  if (EXPLORE_ITEMS.length === 0) {
    EXPLORE_ITEMS = generateFallbackActivities();
  }
}

// ---- Helpers ----
function getUniEmoji(id) {
  return '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>';
}

function buildReqMap(reqs) {
  const result = { academic: 0, volunteer: 0, leadership: 0, sport_art: 0, language: 0 };
  for (const [key, val] of Object.entries(reqs)) {
    if (result.hasOwnProperty(key)) {
      result[key] = val.min !== undefined ? val.min : val;
    }
  }
  return result;
}

function generateFallbackActivities() {
  return [
    { id: 1, name: 'ค่ายสานฝันแพทย์ รุ่น 12', type: 'academic', emoji: TYPE_EMOJIS.academic, deadline: '31 ส.ค. 2026', spots: 100, cert: 'ประเทศ', month: 8, link: 'https://www.camphub.in.th/med-dream-camp-12/' },
    { id: 2, name: 'Super AI Engineer SS5', type: 'academic', emoji: TYPE_EMOJIS.academic, deadline: '15 ก.ค. 2026', spots: 200, cert: 'ประเทศ', month: 7, link: 'https://www.camphub.in.th/super-ai-engineer-5/' },
    { id: 3, name: 'ค่ายวิทยาศาสตร์ทางทะเล', type: 'academic', emoji: TYPE_EMOJIS.academic, deadline: '10 มิ.ย. 2026', spots: 80, cert: 'ภาค', month: 6, link: 'https://www.camphub.in.th/marine-science-camp/' },
    { id: 4, name: 'ค่ายยุววิศวกร มค.', type: 'academic', emoji: TYPE_EMOJIS.academic, deadline: '20 ส.ค. 2026', spots: 60, cert: 'ประเทศ', month: 8, link: 'https://www.camphub.in.th/young-engineer-camp/' },
    { id: 5, name: 'แข่งขันเขียนโปรแกรม TOI', type: 'academic', emoji: TYPE_EMOJIS.academic, deadline: '5 ก.ย. 2026', spots: 150, cert: 'ประเทศ', month: 9, link: 'https://www.camphub.in.th/toi-programming-contest/' },
    
    { id: 6, name: 'ค่ายอาสาพัฒนาชุมชนบนดอย', type: 'volunteer', emoji: TYPE_EMOJIS.volunteer, deadline: '30 ก.ค. 2026', spots: 50, cert: 'ภาค', month: 7, link: 'https://www.camphub.in.th/volunteer-hill-camp/' },
    { id: 7, name: 'Volunteer Spirit: Save Ocean', type: 'volunteer', emoji: TYPE_EMOJIS.volunteer, deadline: '12 ส.ค. 2026', spots: 60, cert: 'ประเทศ', month: 8, link: 'https://www.camphub.in.th/save-ocean-volunteer/' },
    { id: 8, name: 'ค่ายอาสาปลูกป่าชายเลน', type: 'volunteer', emoji: TYPE_EMOJIS.volunteer, deadline: '20 ก.ย. 2026', spots: 100, cert: 'จังหวัด', month: 9, link: 'https://www.camphub.in.th/mangrove-forest-volunteer/' },
    { id: 9, name: 'อาสาสมัครสอนหนังสือเด็กด้อยโอกาส', type: 'volunteer', emoji: TYPE_EMOJIS.volunteer, deadline: '15 ต.ค. 2026', spots: 30, cert: 'ประเทศ', month: 10, link: 'https://www.camphub.in.th/teach-kids-volunteer/' },
    
    { id: 10, name: 'Youth Leader Camp 2026', type: 'leadership', emoji: TYPE_EMOJIS.leadership, deadline: '1 ก.ย. 2026', spots: 50, cert: 'ประเทศ', month: 9, link: 'https://www.camphub.in.th/youth-leader-2026/' },
    { id: 11, name: 'Student Council Workshop', type: 'leadership', emoji: TYPE_EMOJIS.leadership, deadline: '15 มิ.ย. 2026', spots: 100, cert: 'ภาค', month: 6, link: 'https://www.camphub.in.th/student-council-workshop/' },
    { id: 12, name: 'Startup Thailand BootCamp', type: 'leadership', emoji: TYPE_EMOJIS.leadership, deadline: '20 ต.ค. 2026', spots: 120, cert: 'ประเทศ', month: 10, link: 'https://www.camphub.in.th/startup-thailand-bootcamp/' },
    { id: 13, name: 'Global Goals MUN 2026', type: 'leadership', emoji: TYPE_EMOJIS.leadership, deadline: '10 พ.ย. 2026', spots: 200, cert: 'นานาชาติ', month: 11, link: 'https://www.camphub.in.th/global-goals-mun/' },
    
    { id: 14, name: 'IELTS Prep Camp', type: 'language', emoji: TYPE_EMOJIS.language, deadline: '5 ส.ค. 2026', spots: 40, cert: 'ประเทศ', month: 8, link: 'https://www.camphub.in.th/ielts-prep-camp/' },
    { id: 15, name: 'English Speech Contest', type: 'language', emoji: TYPE_EMOJIS.language, deadline: '25 ก.ค. 2026', spots: 200, cert: 'ประเทศ', month: 7, link: 'https://www.camphub.in.th/english-speech-contest/' },
    { id: 16, name: 'ค่ายภาษาและวัฒนธรรมญี่ปุ่น', type: 'language', emoji: TYPE_EMOJIS.language, deadline: '15 ก.ย. 2026', spots: 80, cert: 'ภาค', month: 9, link: 'https://www.camphub.in.th/japanese-culture-camp/' },
    
    { id: 17, name: 'Art & Design Portfolio Camp', type: 'sport_art', emoji: TYPE_EMOJIS.sport_art, deadline: '30 มิ.ย. 2026', spots: 60, cert: 'ประเทศ', month: 6, link: 'https://www.camphub.in.th/art-design-portfolio/' },
    { id: 18, name: 'กีฬาเยาวชนแห่งชาติ', type: 'sport_art', emoji: TYPE_EMOJIS.sport_art, deadline: '10 ก.ย. 2026', spots: 300, cert: 'ประเทศ', month: 9, link: 'https://www.camphub.in.th/national-youth-sports/' },
    { id: 19, name: 'ประกวดวาดภาพ PTT Art', type: 'sport_art', emoji: TYPE_EMOJIS.sport_art, deadline: '15 ต.ค. 2026', spots: 500, cert: 'ประเทศ', month: 10, link: 'https://www.camphub.in.th/ptt-art-contest/' },
    { id: 20, name: 'Music Competition 2026', type: 'sport_art', emoji: TYPE_EMOJIS.sport_art, deadline: '20 พ.ย. 2026', spots: 150, cert: 'ประเทศ', month: 11, link: 'https://www.camphub.in.th/music-competition-2026/' },
  ];
}
