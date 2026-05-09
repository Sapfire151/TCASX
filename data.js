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

// Realistic Data Generation
const UNIVERSITIES = [
  "จุฬาลงกรณ์มหาวิทยาลัย", "มหาวิทยาลัยธรรมศาสตร์", "มหาวิทยาลัยมหิดล", "มหาวิทยาลัยเกษตรศาสตร์", 
  "มหาวิทยาลัยเชียงใหม่", "มหาวิทยาลัยขอนแก่น", "มหาวิทยาลัยสงขลานครินทร์", "สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง (KMITL)",
  "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี (KMUTT)", "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (KMUTNB)", "มหาวิทยาลัยศรีนครินทรวิโรฒ",
  "มหาวิทยาลัยศิลปากร", "มหาวิทยาลัยนเรศวร", "มหาวิทยาลัยบูรพา", "มหาวิทยาลัยมหาสารคาม", "มหาวิทยาลัยพะเยา",
  "มหาวิทยาลัยแม่ฟ้าหลวง", "มหาวิทยาลัยอุบลราชธานี", "มหาวิทยาลัยวลัยลักษณ์", "มหาวิทยาลัยทักษิณ"
];

const FACULTY_TYPES = [
  { name: "แพทยศาสตร์", req: { academic:3, volunteer:2, leadership:1, language:2, sport_art:0 }, emoji: "🏥" },
  { name: "ทันตแพทยศาสตร์", req: { academic:3, volunteer:2, leadership:1, language:2, sport_art:1 }, emoji: "🦷" },
  { name: "เภสัชศาสตร์", req: { academic:3, volunteer:2, leadership:1, language:2, sport_art:0 }, emoji: "💊" },
  { name: "สัตวแพทยศาสตร์", req: { academic:3, volunteer:2, leadership:1, language:1, sport_art:0 }, emoji: "🐶" },
  { name: "พยาบาลศาสตร์", req: { academic:2, volunteer:3, leadership:1, language:1, sport_art:0 }, emoji: "🩺" },
  { name: "สหเวชศาสตร์/เทคนิคการแพทย์", req: { academic:3, volunteer:2, leadership:1, language:1, sport_art:0 }, emoji: "🔬" },
  { name: "วิศวกรรมศาสตร์", req: { academic:3, volunteer:1, leadership:2, language:1, sport_art:1 }, emoji: "⚙️" },
  { name: "วิทยาศาสตร์", req: { academic:3, volunteer:1, leadership:1, language:1, sport_art:0 }, emoji: "🧪" },
  { name: "เทคโนโลยีสารสนเทศ/วิทยาการคอมพิวเตอร์", req: { academic:3, volunteer:1, leadership:1, language:2, sport_art:0 }, emoji: "💻" },
  { name: "สถาปัตยกรรมศาสตร์", req: { academic:2, volunteer:1, leadership:1, language:1, sport_art:3 }, emoji: "🏛️" },
  { name: "พาณิชยศาสตร์และการบัญชี/บริหารธุรกิจ", req: { academic:2, volunteer:1, leadership:3, language:2, sport_art:0 }, emoji: "📊" },
  { name: "เศรษฐศาสตร์", req: { academic:3, volunteer:1, leadership:2, language:2, sport_art:0 }, emoji: "📈" },
  { name: "นิติศาสตร์", req: { academic:3, volunteer:2, leadership:2, language:2, sport_art:0 }, emoji: "⚖️" },
  { name: "รัฐศาสตร์", req: { academic:2, volunteer:3, leadership:3, language:2, sport_art:0 }, emoji: "🤝" },
  { name: "อักษรศาสตร์/ศิลปศาสตร์/มนุษยศาสตร์", req: { academic:2, volunteer:2, leadership:1, language:3, sport_art:1 }, emoji: "📚" },
  { name: "นิเทศศาสตร์/วารสารศาสตร์", req: { academic:1, volunteer:2, leadership:2, language:2, sport_art:2 }, emoji: "🎬" },
  { name: "ครุศาสตร์/ศึกษาศาสตร์", req: { academic:2, volunteer:3, leadership:2, language:1, sport_art:1 }, emoji: "👨‍🏫" },
  { name: "ศิลปกรรมศาสตร์/วิจิตรศิลป์", req: { academic:1, volunteer:1, leadership:1, language:1, sport_art:3 }, emoji: "🎨" },
  { name: "เกษตรศาสตร์/วนศาสตร์", req: { academic:2, volunteer:2, leadership:1, language:1, sport_art:0 }, emoji: "🌱" }
];

const FACULTIES = [];
let facId = 1;
UNIVERSITIES.forEach(uni => {
  FACULTY_TYPES.forEach(ft => {
    FACULTIES.push({
      id: `fac_${facId++}`,
      name: ft.name,
      uni: uni,
      emoji: ft.emoji,
      req: ft.req
    });
  });
});

const EXPLORE_ITEMS = [
  { id:1, name:'ค่ายโอลิมปิกวิชาการ สอวน. ชีววิทยา', type:'academic', level:'national', month:6, emoji:'🧬', deadline:'15 มิ.ย. 69', spots:120, cert:'ประเทศ' },
  { id:2, name:'โครงการจิตอาสาพัฒนาชุมชน', type:'volunteer', level:'regional', month:7, emoji:'🤝', deadline:'30 มิ.ย. 69', spots:50, cert:'ภาค' },
  { id:3, name:'แข่งขัน TOEFL Junior Challenge', type:'language', level:'national', month:8, emoji:'🌐', deadline:'31 ก.ค. 69', spots:500, cert:'ประเทศ' },
  { id:4, name:'ค่ายผู้นำเยาวชน สภานักเรียน', type:'leadership', level:'national', month:7, emoji:'👑', deadline:'20 มิ.ย. 69', spots:80, cert:'ประเทศ' },
  { id:5, name:'ประกวดวาดภาพ ศิลปะเด็กไทย', type:'sport_art', level:'national', month:9, emoji:'🎨', deadline:'15 ส.ค. 69', spots:200, cert:'ประเทศ' },
  { id:6, name:'ค่าย Data Science for Teens', type:'academic', level:'regional', month:8, emoji:'📈', deadline:'1 ส.ค. 69', spots:40, cert:'ภาค' },
  { id:7, name:'อาสาสมัครสอนหนังสือเด็กชายขอบ', type:'volunteer', level:'school', month:6, emoji:'📚', deadline:'ตลอดปี', spots:30, cert:'โรงเรียน' },
  { id:8, name:'แข่งขันหุ่นยนต์ FIRST Robotics', type:'academic', level:'international', month:10, emoji:'🤖', deadline:'30 ก.ย. 69', spots:60, cert:'นานาชาติ' },
  { id:9, name:'ประกวดสุนทรพจน์ภาษาอังกฤษ', type:'language', level:'regional', month:9, emoji:'🎤', deadline:'20 ส.ค. 69', spots:100, cert:'ภาค' },
  { id:10, name:'แข่งขันตอบปัญหา กฎหมายระดับมัธยม', type:'academic', level:'national', month:11, emoji:'⚖️', deadline:'15 ต.ค. 69', spots:200, cert:'ประเทศ' },
  { id:11, name:'ค่ายเยาวชนอนุรักษ์สิ่งแวดล้อมป่าชายเลน', type:'volunteer', level:'regional', month:5, emoji:'🌱', deadline:'30 เม.ย. 69', spots:60, cert:'ภาค' },
  { id:12, name:'ประกวดวงโยธวาทิตระดับนานาชาติ', type:'sport_art', level:'international', month:12, emoji:'🎺', deadline:'30 พ.ย. 69', spots:50, cert:'นานาชาติ' },
  { id:13, name:'ประธานสี งานกีฬาสีโรงเรียน', type:'leadership', level:'school', month:12, emoji:'🚩', deadline:'1 พ.ย. 69', spots:1, cert:'โรงเรียน' },
  { id:14, name:'โครงการแข่งขันเขียนโปรแกรม (Hackathon)', type:'academic', level:'national', month:8, emoji:'💻', deadline:'15 ก.ค. 69', spots:150, cert:'ประเทศ' },
  { id:15, name:'ค่ายเยาวชนนักออกแบบ (Design Camp)', type:'sport_art', level:'regional', month:10, emoji:'✏️', deadline:'20 ก.ย. 69', spots:80, cert:'ภาค' },
  { id:16, name:'ประกวดแต่งกลอนสี่สุภาพระดับประเทศ', type:'language', level:'national', month:6, emoji:'📝', deadline:'1 มิ.ย. 69', spots:300, cert:'ประเทศ' },
  { id:17, name:'จิตอาสากู้ภัย สมาคมสว่างบุญ', type:'volunteer', level:'regional', month:3, emoji:'🚑', deadline:'ตลอดปี', spots:100, cert:'ภาค' },
  { id:18, name:'ค่ายผู้นำเยาวชนสร้างสรรค์', type:'leadership', level:'regional', month:4, emoji:'💡', deadline:'15 มี.ค. 69', spots:70, cert:'ภาค' },
  { id:19, name:'การแข่งขันกีฬาเยาวชนแห่งชาติ', type:'sport_art', level:'national', month:2, emoji:'🏅', deadline:'15 ม.ค. 69', spots:1000, cert:'ประเทศ' },
  { id:20, name:'อบรมภาษาญี่ปุ่นสำหรับสอบ JLPT N4', type:'language', level:'school', month:9, emoji:'🇯🇵', deadline:'31 ส.ค. 69', spots:40, cert:'โรงเรียน' },
  { id:21, name:'ประกวดหนังสั้นสะท้อนสังคม', type:'sport_art', level:'national', month:11, emoji:'🎬', deadline:'31 ต.ค. 69', spots:200, cert:'ประเทศ' },
  { id:22, name:'อาสาสมัครดูแลสัตว์จรจัด', type:'volunteer', level:'school', month:5, emoji:'🐶', deadline:'ตลอดปี', spots:50, cert:'โรงเรียน' },
  { id:23, name:'การแข่งขันโครงงานวิทยาศาสตร์ระดับภาค', type:'academic', level:'regional', month:7, emoji:'🔭', deadline:'15 มิ.ย. 69', spots:300, cert:'ภาค' },
  { id:24, name:'ค่ายสถาปัตย์จูเนียร์', type:'academic', level:'national', month:4, emoji:'🏛️', deadline:'1 มี.ค. 69', spots:100, cert:'ประเทศ' },
  { id:25, name:'แข่งขัน HSK ระดับ 4', type:'language', level:'international', month:10, emoji:'🇨🇳', deadline:'31 ส.ค. 69', spots:500, cert:'นานาชาติ' },
  { id:26, name:'หัวหน้าโปรเจกต์งานนิทรรศการวิชาการ', type:'leadership', level:'school', month:1, emoji:'📋', deadline:'1 ธ.ค. 68', spots:5, cert:'โรงเรียน' },
  { id:27, name:'อาสาสมัครแพ็คถุงยังชีพ สภากาชาด', type:'volunteer', level:'national', month:8, emoji:'🎒', deadline:'15 ก.ค. 69', spots:500, cert:'ประเทศ' },
  { id:28, name:'แข่งขันประกวดโมเดลธุรกิจเยาวชน', type:'leadership', level:'national', month:9, emoji:'📊', deadline:'15 ส.ค. 69', spots:100, cert:'ประเทศ' },
  { id:29, name:'โครงการแลกเปลี่ยนนักเรียน AFS', type:'language', level:'international', month:6, emoji:'✈️', deadline:'1 พ.ค. 69', spots:30, cert:'นานาชาติ' },
  { id:30, name:'ค่ายเตรียมความพร้อมสู่วิศวกรรมศาสตร์', type:'academic', level:'national', month:10, emoji:'⚙️', deadline:'15 ก.ย. 69', spots:150, cert:'ประเทศ' }
];

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
    const mult = { school:1, regional:2, national:3, international:4 };
    s[a.type] = (s[a.type]||0) + (mult[a.level]||1);
  });
  return s;
}

function getTargetReqs() {
  if (!appState.faculties.length) return { academic:2, volunteer:2, leadership:2, language:2, sport_art:2 };
  return FACULTIES.find(f => f.id === appState.faculties[0])?.req || { academic:2, volunteer:2, leadership:2, language:2, sport_art:2 };
}

function getCompletionPct() {
  const scores = getScores(), reqs = getTargetReqs();
  let total = 0, met = 0;
  Object.keys(reqs).forEach(k => {
    if (reqs[k] > 0) { total += reqs[k]; met += Math.min(scores[k]||0, reqs[k]); }
  });
  return total ? Math.round((met/total)*100) : 0;
}
