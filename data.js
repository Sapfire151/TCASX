// ========== TCASX Data Layer ==========

const firebaseConfig = {
  projectId: "tcasx-48020",
  appId: "1:782302455229:web:5655f95a226e0015e59ed4",
  storageBucket: "tcasx-48020.firebasestorage.app",
  apiKey: "AIzaSyDP18fvle5Ls1mPPd6OVHII7Ay2_thaHbQ",
  authDomain: "tcasx-48020.firebaseapp.com",
  messagingSenderId: "782302455229",
  measurementId: "G-JXR0PHP08E"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let FACULTIES = [];
let EXPLORE_ITEMS = [];

async function loadExternalData() {
  try {
    const [facRes, expRes] = await Promise.all([
      fetch('http://localhost:5000/api/faculties'),
      fetch('http://localhost:5000/api/explore')
    ]);
    if(facRes.ok) FACULTIES = await facRes.json();
    if(expRes.ok) EXPLORE_ITEMS = await expRes.json();
    console.log("Loaded dynamic data: ", FACULTIES.length, " faculties, ", EXPLORE_ITEMS.length, " activities");
  } catch (err) {
    console.error("Failed to load external data", err);
  }
}

const TYPE_LABELS = { academic:'วิชาการ', volunteer:'จิตอาสา', leadership:'ความเป็นผู้นำ', sport_art:'กีฬา/ศิลปะ', language:'ภาษา' };
const TYPE_EMOJIS = { academic:'📖', volunteer:'🤝', leadership:'👑', sport_art:'🏅', language:'🌐' };
const LEVEL_LABELS = { school:'โรงเรียน', regional:'ภาค', national:'ประเทศ', international:'นานาชาติ' };
const STATUS_LABELS = { completed:'เสร็จสิ้น', inprogress:'กำลังดำเนินการ', planned:'วางแผน' };
const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// Default app state structure
const defaultState = {
  isAuthenticated: false,
  currentUser: null, // { name: '', username: '' }
  onboarded: false, 
  grade: '', track: '', faculties: [],
  activities: [
    { id:1, name:'แข่งขันคณิตศาสตร์ สพฐ.', type:'academic', level:'regional', date:'2026-02-15', status:'completed', desc:'ได้รับรางวัลรองชนะเลิศ' },
    { id:2, name:'ค่ายอาสาพัฒนาโรงเรียนบนดอย', type:'volunteer', level:'school', date:'2026-01-20', status:'completed', desc:'เข้าร่วม 3 วัน' },
    { id:3, name:'ประธานชมรมวิทยาศาสตร์', type:'leadership', level:'school', date:'2026-03-01', status:'inprogress', desc:'ดำรงตำแหน่งปีการศึกษา 2569' },
    { id:4, name:'การแข่งขันกีฬาเยาวชนแห่งชาติ', type:'sport_art', level:'national', date:'2026-02-10', status:'completed', desc:'นักกีฬาบาสเกตบอลตัวแทนจังหวัด' },
    { id:5, name:'ประกวดสุนทรพจน์ภาษาอังกฤษ', type:'language', level:'regional', date:'2026-04-10', status:'planned', desc:'เตรียมตัวเพื่อแข่งขันระดับภาค' },
    { id:6, name:'ค่าย Data Science for Teens', type:'academic', level:'national', date:'2026-05-20', status:'planned', desc:'รอประกาศผลการคัดเลือก' }
  ],
  roadmap: [
    { id:1, name:'ค่ายโอลิมปิกวิชาการ', type:'academic', month:6, status:'planned' },
    { id:2, name:'โครงการจิตอาสาชุมชน', type:'volunteer', month:7, status:'planned' },
    { id:3, name:'สอบ TOEFL', type:'language', month:8, status:'planned' },
    { id:4, name:'ประกวดวาดภาพ ศิลปะเด็กไทย', type:'sport_art', month:9, status:'planned' },
    { id:5, name:'ค่ายผู้นำเยาวชน สภานักเรียน', type:'leadership', month:7, status:'planned' },
    { id:6, name:'แข่งขันโครงงานวิทยาศาสตร์ระดับภาค', type:'academic', month:7, status:'planned' },
    { id:7, name:'ค่ายเยาวชนนักออกแบบ (Design Camp)', type:'sport_art', month:10, status:'planned' },
    { id:8, name:'แข่งขันตอบปัญหา กฎหมายระดับมัธยม', type:'academic', month:11, status:'planned' }
  ]
};

let appState = JSON.parse(localStorage.getItem('tcasx_state')) || defaultState;

function saveState() { 
  localStorage.setItem('tcasx_state', JSON.stringify(appState)); 
  
  // Sync profile data to Firestore silently if authenticated
  if (appState.isAuthenticated && auth.currentUser) {
    db.collection('users').doc(auth.currentUser.uid).set({
      name: appState.currentUser?.name || '',
      grade: appState.grade || '', 
      track: appState.track || '', 
      faculties: appState.faculties || [],
      onboarded: appState.onboarded || false
    }, { merge: true }).catch(e => console.log('Firestore sync failed', e));

    // For a fully robust app, we'd sync activities and roadmap individually, 
    // but for this MVP, we can store them as arrays on the user doc if they aren't huge
    db.collection('users').doc(auth.currentUser.uid).set({
      activities: appState.activities,
      roadmap: appState.roadmap
    }, { merge: true }).catch(e => console.log('Firestore array sync failed', e));
  }
}

function getScores() {
  const s = { academic:0, volunteer:0, leadership:0, sport_art:0, language:0 };
  appState.activities.filter(a => a.status !== 'planned').forEach(a => {
    const mult = { school:10, regional:20, national:35, international:50 };
    s[a.type] = (s[a.type]||0) + (mult[a.level]||10);
  });
  return s;
}

function getTargetReqs() {
  if (!appState.faculties.length) return { academic:50, volunteer:30, leadership:30, language:40, sport_art:10 };
  return FACULTIES.find(f => f.id === appState.faculties[0])?.req || { academic:50, volunteer:30, leadership:30, language:40, sport_art:10 };
}

function getCompletionPct() {
  const scores = getScores(), reqs = getTargetReqs();
  let total = 0, met = 0;
  Object.keys(reqs).forEach(k => {
    if (reqs[k] > 0) { total += reqs[k]; met += Math.min(scores[k]||0, reqs[k]); }
  });
  return total ? Math.round((met/total)*100) : 0;
}
