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
  academic: '📚',
  volunteer: '💗',
  leadership: '👑',
  sport_art: '🏆',
  language: '🌍'
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

// ---- Faculties (matches backend /api/faculties) ----
let FACULTIES = [
  { id: 'eng_chula', name: 'วิศวกรรมศาสตร์', uni: 'จุฬาฯ', emoji: '⚙️',
    req: { academic: 3, volunteer: 1, leadership: 1, sport_art: 0, language: 1 } },
  { id: 'med_chula', name: 'แพทยศาสตร์', uni: 'จุฬาฯ', emoji: '🩺',
    req: { academic: 3, volunteer: 2, leadership: 1, sport_art: 0, language: 1 } },
  { id: 'eng_tu', name: 'วิศวกรรมศาสตร์', uni: 'มธ.', emoji: '🔧',
    req: { academic: 2, volunteer: 1, leadership: 0, sport_art: 1, language: 0 } },
  { id: 'sci_mu', name: 'วิทยาศาสตร์', uni: 'มหิดล', emoji: '🔬',
    req: { academic: 3, volunteer: 1, leadership: 0, sport_art: 0, language: 1 } },
  { id: 'cs_kmitl', name: 'เทคโนโลยีสารสนเทศ', uni: 'สจล.', emoji: '💻',
    req: { academic: 2, volunteer: 1, leadership: 0, sport_art: 0, language: 0 } },
  { id: 'eng_ku', name: 'วิศวกรรมศาสตร์', uni: 'มก.', emoji: '🏗️',
    req: { academic: 2, volunteer: 1, leadership: 1, sport_art: 0, language: 0 } },
  { id: 'arts_cu', name: 'อักษรศาสตร์', uni: 'จุฬาฯ', emoji: '📖',
    req: { academic: 1, volunteer: 1, leadership: 0, sport_art: 0, language: 3 } },
  { id: 'polsci_tu', name: 'รัฐศาสตร์', uni: 'มธ.', emoji: '🏛️',
    req: { academic: 0, volunteer: 2, leadership: 2, sport_art: 0, language: 1 } },
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
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(e => console.warn('Firestore save error:', e));
  }
}

// ---- Score Helpers ----
function getScores() {
  const scores = {};
  appState.activities.forEach(a => {
    if (!scores[a.type]) scores[a.type] = 0;
    // Weight by level
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
  const scores = getScores(), reqs = getTargetReqs();
  let total = 0, met = 0;
  Object.keys(reqs).forEach(k => {
    if (reqs[k] > 0) {
      total += reqs[k];
      met += Math.min(scores[k] || 0, reqs[k]);
    }
  });
  return total > 0 ? Math.round((met / total) * 100) : 0;
}

// ---- Load Data from Flask API ----
async function loadExternalData() {
  try {
    // Fetch activities from backend
    const res = await fetch(`${API_BASE}/activities`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const apiActivities = await res.json();
      EXPLORE_ITEMS = apiActivities.map((a, i) => ({
        id: a.id || i + 1,
        name: a.name,
        type: a.type,
        emoji: TYPE_EMOJIS[a.type] || '📌',
        deadline: a.deadline || 'ไม่ระบุ',
        spots: a.spots || 50,
        cert: a.level_th || 'ประเทศ',
        month: a.month || new Date().getMonth() + 1,
        link: a.link || '',
        image: a.image || ''
      }));
      console.log(`[TCASX] Loaded ${EXPLORE_ITEMS.length} activities from API`);
    }
  } catch (e) {
    console.warn('[TCASX] API unavailable, using fallback data', e);
  }

  // Also try to sync faculties from backend
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
  const map = { eng_chula: '⚙️', med_chula: '🩺', eng_tu: '🔧', sci_mu: '🔬', cs_kmitl: '💻', eng_ku: '🏗️', arts_cu: '📖', polsci_tu: '🏛️' };
  return map[id] || '🎓';
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
    { id: 1, name: 'ค่ายโอลิมปิกวิชาการ สอวน.', type: 'academic', emoji: '📚', deadline: 'ส.ค. 2026', spots: 100, cert: 'ประเทศ', month: 8 },
    { id: 2, name: 'Super AI Engineer', type: 'academic', emoji: '📚', deadline: 'ก.ค. 2026', spots: 200, cert: 'ประเทศ', month: 7 },
    { id: 3, name: 'TOT Young Club', type: 'academic', emoji: '📚', deadline: 'มิ.ย. 2026', spots: 150, cert: 'ประเทศ', month: 6 },
    { id: 4, name: 'ค่ายอาสาพัฒนาชุมชน', type: 'volunteer', emoji: '💗', deadline: 'ก.ค. 2026', spots: 80, cert: 'ภาค', month: 7 },
    { id: 5, name: 'Volunteer Spirit Camp', type: 'volunteer', emoji: '💗', deadline: 'ส.ค. 2026', spots: 60, cert: 'ประเทศ', month: 8 },
    { id: 6, name: 'Youth Leader Camp', type: 'leadership', emoji: '👑', deadline: 'ก.ย. 2026', spots: 50, cert: 'ประเทศ', month: 9 },
    { id: 7, name: 'Student Council Workshop', type: 'leadership', emoji: '👑', deadline: 'มิ.ย. 2026', spots: 100, cert: 'ภาค', month: 6 },
    { id: 8, name: 'IELTS Prep Camp', type: 'language', emoji: '🌍', deadline: 'ส.ค. 2026', spots: 40, cert: 'ประเทศ', month: 8 },
    { id: 9, name: 'English Speech Contest', type: 'language', emoji: '🌍', deadline: 'ก.ค. 2026', spots: 200, cert: 'ประเทศ', month: 7 },
    { id: 10, name: 'Art & Design Camp', type: 'sport_art', emoji: '🏆', deadline: 'มิ.ย. 2026', spots: 60, cert: 'ประเทศ', month: 6 },
    { id: 11, name: 'กีฬาเยาวชนแห่งชาติ', type: 'sport_art', emoji: '🏆', deadline: 'ก.ย. 2026', spots: 300, cert: 'ประเทศ', month: 9 },
    { id: 12, name: 'Startup Thailand Camp', type: 'leadership', emoji: '👑', deadline: 'ต.ค. 2026', spots: 100, cert: 'ประเทศ', month: 10 },
  ];
}
