// ========== Router ==========
let currentPage = 'dashboard';
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-link,.tab-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  const main = document.getElementById('mainContent');
  main.style.animation = 'none'; main.offsetHeight; main.style.animation = 'fadeIn .3s ease';
  try {
    const renderers = { dashboard: renderDashboard, portfolio: renderPortfolio, explore: renderExplore, roadmap: renderRoadmap, global: renderGlobal, rate: renderRate };
    (renderers[page] || renderDashboard)();
  } catch(e) { console.error('Navigate error:', e); renderDashboard(); }
}
document.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); }));

// ========== SVG Helpers ==========
function progressRingSVG(pct, size = 120, stroke = 10) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return `<div class="progress-ring-wrap"><svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--gray-100)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#pg)" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" style="transition:stroke-dashoffset 1s ease"/>
    <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="var(--primary)"/><stop offset="100%" stop-color="var(--accent)"/></linearGradient></defs>
  </svg><span class="progress-ring-text">${pct}%</span></div>`;
}

// ========== Countdown ==========
function getCountdown() {
  const target = new Date('2026-10-01T00:00:00+07:00'), now = new Date();
  const diff = Math.max(0, target - now), d = Math.floor(diff / 864e5), h = Math.floor((diff % 864e5) / 36e5), m = Math.floor((diff % 36e5) / 6e4);
  return { days: d, hours: h, mins: m };
}

// ========== Dashboard ==========
function renderDashboard() {
  if (EXPLORE_ITEMS.length === 0 || FACULTIES.length === 0) {
    document.getElementById('mainContent').innerHTML = '<div style="text-align:center;padding:100px 20px;color:var(--gray-400);"><h2>ไม่สามารถโหลดข้อมูลได้ (Backend Offline)</h2><p>กรุณารันคำสั่ง <code>python api.py</code> ในโฟลเดอร์ backend</p></div>';
    return;
  }
  const cd = getCountdown();
  const ai = runAIAnalysis();
  const pct = ai.overallScore;
  const reqs = getTargetReqs();
  const fac = appState.faculties.length ? FACULTIES.find(f => f.id === appState.faculties[0]) : null;
  const recActivities = ai.recommendations.length ? ai.recommendations : EXPLORE_ITEMS.slice(0, 3);

  document.getElementById('mainContent').innerHTML = `
  <div class="dashboard-hero">
    <div class="hero-content">
      <div class="hero-left">
        <h1 style="display:flex;align-items:center;gap:8px;"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg> พร้อมลุย TCAS รอบ 1!</h1>
        <p>เตรียมพอร์ตฟอลิโอให้ปังก่อนเปิดรับสมัคร</p>
        <div class="countdown-display">
          <div class="countdown-item"><span class="countdown-num">${cd.days}</span><span class="countdown-label">วัน</span></div>
          <div class="countdown-item"><span class="countdown-num">${cd.hours}</span><span class="countdown-label">ชั่วโมง</span></div>
          <div class="countdown-item"><span class="countdown-num">${cd.mins}</span><span class="countdown-label">นาที</span></div>
        </div>
      </div>
      <div class="hero-right">${progressRingSVG(pct, 140, 12)}</div>
    </div>
  </div>

  <div class="quick-actions">
    <button class="quick-btn" onclick="navigate('portfolio')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> My Portfolio</button>
    <button class="quick-btn" onclick="navigate('explore')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Explore</button>
    <button class="quick-btn" onclick="navigate('global')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> Share</button>
    <button class="quick-btn" onclick="showOnboarding()"><svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> ตั้งเป้าหมาย</button>
  </div>

  <div class="dash-grid">
    <div class="ai-card">
      <h3>AI Matching — ${fac ? fac.name + ' ' + fac.uni : 'ยังไม่ได้เลือกคณะ'}</h3>
      <div class="ai-verdict ai-verdict-${ai.verdictType}">
        <strong>${ai.verdict}</strong>
      </div>
      ${ai.strengths.length ? '<div style="margin-top:10px"><strong style="color:#6EE7B7">✓ จุดแข็ง</strong></div>' + ai.strengths.map(s => `<div class="ai-item" style="border-color:rgba(110,231,183,.3)"><span class="ai-icon" style="color:#6EE7B7">✓</span><div><strong>${s.message}</strong><br><span style="opacity:.7;font-size:.78rem">${s.detail}</span></div></div>`).join('') : ''}
      ${ai.gaps.length ? '<div style="margin-top:10px"><strong style="color:#FCA5A5">✗ ช่องว่าง</strong></div>' + ai.gaps.map(g => `<div class="ai-item" style="border-color:rgba(252,165,165,.3)"><span class="ai-icon" style="color:${g.severity==='critical'?'#EF4444':g.severity==='high'?'#F59E0B':'#60A5FA'}">●</span><div><strong>${g.message}</strong><br><span style="opacity:.7;font-size:.78rem">${g.detail}</span></div></div>`).join('') : ''}
      ${ai.warnings.length ? ai.warnings.map(w => `<div class="ai-item" style="border-color:rgba(251,191,36,.3)"><span class="ai-icon" style="color:#FBBF24">⚠</span><div style="font-size:.82rem">${w}</div></div>`).join('') : ''}
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;font-size:.72rem;opacity:.6">
        <span>กิจกรรม: ${ai.stats.totalActivities}</span>
        <span>เสร็จ: ${ai.stats.completedActivities}</span>
        <span>หมวด: ${ai.stats.activeCategoriesCount}/5</span>
      </div>
    </div>

    <div>
      <h3 class="section-title" style="margin-bottom:12px">วิเคราะห์ตามหมวด (AI)</h3>
      ${Object.keys(TYPE_LABELS).map(k => {
    const sig = ai.categorySignals[k];
    const p = Math.round(sig.fulfillment * 100);
    const statusColor = sig.status==='strong'?'var(--green)':sig.status==='developing'?'var(--orange)':sig.status==='weak'||sig.status==='missing'?'var(--red)':'var(--gray-400)';
    const statusLabel = sig.status==='strong'?'ผ่าน':sig.status==='developing'?'พัฒนา':sig.status==='weak'?'อ่อน':sig.status==='missing'?'ขาด':'ไม่จำเป็น';
    return `<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:4px"><span>${TYPE_EMOJIS[k]} ${TYPE_LABELS[k]}</span><span style="font-weight:700;color:${statusColor}">${statusLabel} (${sig.count} กิจกรรม)</span></div><div class="stat-bar"><div class="stat-bar-fill" style="width:${p}%;background:${statusColor}"></div></div></div>`;
  }).join('')}
    </div>
  </div>

  <h3 class="section-title">กิจกรรมแนะนำ (AI)</h3>
  <div class="dash-grid-3">
    ${recActivities.map(a => `
      <div class="card" style="display:flex; flex-direction:column;">
        <div style="font-size:2rem;margin-bottom:8px">${a.emoji || TYPE_EMOJIS[a.type] || ''}</div>
        <h4 style="font-size:.9rem;font-weight:700;margin-bottom:4px">${a.name}</h4>
        <p style="font-size:.78rem;color:var(--gray-400);margin-bottom:8px">${a.deadline} · ${a.cert || ''}</p>
        <div style="margin-bottom:16px;"><span class="tag tag-${a.type}">${TYPE_LABELS[a.type]}</span>${a.reason ? `<span style="font-size:.7rem;color:var(--orange);margin-left:6px">${a.reason}</span>` : ''}</div>
        <div style="display:flex;gap:8px;flex-direction:row; margin-top:auto;">
          <button class="btn btn-primary btn-sm" style="flex:1" onclick="addToRoadmapFromExplore(${a.id})">+ Roadmap</button>
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ========== Portfolio ==========
let portfolioFilter = 'all';
function renderPortfolio() {
  const scores = getScores(), reqs = getTargetReqs();
  const filtered = portfolioFilter === 'all' ? appState.activities : appState.activities.filter(a => a.type === portfolioFilter);
  const gaps = Object.keys(reqs).filter(k => reqs[k] > 0 && (scores[k] || 0) < reqs[k]);
  const strongs = Object.keys(reqs).filter(k => reqs[k] > 0 && (scores[k] || 0) >= reqs[k]);

  document.getElementById('mainContent').innerHTML = `
  <div class="portfolio-header">
    <h1 style="font-size:1.4rem;font-weight:800;display:flex;align-items:center;gap:8px;"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> My Portfolio</h1>
    <button class="btn btn-primary" onclick="openActivityModal()">+ เพิ่มกิจกรรม</button>
  </div>
  <div class="portfolio-tabs" style="margin-bottom:20px">
    ${[['all', 'ทั้งหมด'], ...Object.entries(TYPE_LABELS)].map(([k, v]) =>
    `<button class="ptab ${portfolioFilter === k ? 'active' : ''}" onclick="portfolioFilter='${k}';renderPortfolio()">${v} ${k === 'all' ? '(' + appState.activities.length + ')' : '(' + appState.activities.filter(a => a.type === k).length + ')'}</button>`
  ).join('')}
  </div>
  <div class="score-section">
    <div class="card score-ring-card">${progressRingSVG(getCompletionPct(), 130, 10)}<p style="margin-top:12px;font-size:.85rem;color:var(--gray-400)">ความสมบูรณ์ของพอร์ต</p></div>
    <div>
      ${gaps.length ? `<div class="gap-panel"><h3 style="display:flex;align-items:center;gap:6px;"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> ยังขาด</h3>${gaps.map(k => `<div class="gap-item"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; color:var(--red);"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> ${TYPE_LABELS[k]} — ต้องการเพิ่มอีก ${Math.max(0, reqs[k] - (scores[k] || 0))} คะแนน</div>`).join('')}</div>` : ''}
      ${strongs.length ? `<div class="strength-panel" style="margin-top:12px"><h3 style="display:flex;align-items:center;gap:6px;"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> จุดแข็ง</h3>${strongs.map(k => `<div class="gap-item" style="color:#065F46"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ${TYPE_LABELS[k]} — ผ่านเกณฑ์แล้ว</div>`).join('')}</div>` : ''}
    </div>
  </div>
  <h3 class="section-title" style="display:flex;align-items:center;gap:8px;"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> รายการกิจกรรม</h3>
  <div class="portfolio-list">
    ${filtered.length ? filtered.map(a => `
      <div class="activity-card">
        <div class="activity-icon" style="background:${getCatBg(a.type)}">${TYPE_EMOJIS[a.type]}</div>
        <div class="activity-info"><h4>${a.name}</h4><p>${LEVEL_LABELS[a.level]} · ${STATUS_LABELS[a.status]}${a.desc ? ' · ' + a.desc : ''}</p></div>
        <div class="activity-meta"><span class="tag tag-${a.type}">${TYPE_LABELS[a.type]}</span><br><span class="date">${a.date || ''}</span></div>
        <button class="btn btn-sm btn-secondary" onclick="deleteActivity(${a.id})" title="ลบ"><svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
      </div>
    `).join('') : `<div class="empty-state"><h3>ยังไม่มีกิจกรรม</h3><p>เริ่มเพิ่มกิจกรรมเพื่อสร้างพอร์ตฟอลิโอของคุณ</p><button class="btn btn-primary" onclick="openActivityModal()">+ เพิ่มกิจกรรม</button></div>`}
  </div>`;
}
function getCatBg(t) { return { academic: 'rgba(129,140,248,.15)', volunteer: 'rgba(244,114,182,.15)', leadership: 'rgba(251,191,36,.15)', sport_art: 'rgba(52,211,153,.15)', language: 'rgba(96,165,250,.15)' }[t] || 'var(--gray-100)'; }

// ========== Explore ==========
let exploreFilter = 'all';
function renderExplore() {
  if (EXPLORE_ITEMS.length === 0) {
    document.getElementById('mainContent').innerHTML = '<div style="text-align:center;padding:100px 20px;color:var(--gray-400);"><h2>ไม่สามารถโหลดข้อมูลได้ (Backend Offline)</h2><p>กรุณารันคำสั่ง <code>python api.py</code> ในโฟลเดอร์ backend</p></div>';
    return;
  }
  const items = exploreFilter === 'all' ? EXPLORE_ITEMS : EXPLORE_ITEMS.filter(e => e.type === exploreFilter);
  document.getElementById('mainContent').innerHTML = `
  <h1 style="font-size:1.4rem;font-weight:800;margin-bottom:4px"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>Explore</h1>
  <p style="color:var(--gray-400);margin-bottom:20px;font-size:.9rem">ค้นหาค่าย การแข่งขัน และกิจกรรมจิตอาสาที่เหมาะกับคุณ</p>
  <div class="explore-filters">
    ${[['all', 'ทั้งหมด'], ...Object.entries(TYPE_LABELS)].map(([k, v]) =>
    `<button class="filter-chip ${exploreFilter === k ? 'active' : ''}" onclick="exploreFilter='${k}';renderExplore()">${v}</button>`
  ).join('')}
  </div>
  <div class="explore-grid">
    ${items.map(a => `
      <div class="card explore-card">
        <div class="explore-card-img" style="background:linear-gradient(135deg,${getCatGrad(a.type)})">${a.emoji}</div>
        <div class="explore-card-body">
          <span class="tag tag-${a.type}" style="margin-bottom:8px">${TYPE_LABELS[a.type]}</span>
          <h3>${a.name}</h3>
          <div class="explore-card-meta">
            <span><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${a.deadline}</span><span><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> ${a.spots} คน</span><span><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg> ระดับ${a.cert}</span>
          </div>
          <div style="display:flex;gap:8px;flex-direction:row">
            <button class="btn btn-primary btn-sm" style="flex:1" onclick="addToRoadmapFromExplore(${a.id})">+ เพิ่มใน Roadmap</button>
          </div>
        </div>
      </div>
    `).join('')}
  </div>`;
}
function getCatGrad(t) { return { academic: '#818CF8,#6366F1', volunteer: '#F472B6,#EC4899', leadership: '#FBBF24,#D97706', sport_art: '#34D399,#059669', language: '#60A5FA,#2563EB' }[t] || 'var(--primary),var(--accent)'; }

// ========== Roadmap ==========
function renderRoadmap() {
  const now = new Date().getMonth();
  document.getElementById('mainContent').innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
    <div><h1 style="font-size:1.4rem;font-weight:800;display:flex;align-items:center;gap:8px;"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg> Roadmap</h1><p style="color:var(--gray-400);font-size:.85rem">แผนกิจกรรมตลอดทั้งปี</p></div>
    <button class="btn btn-primary btn-sm" onclick="openActivityModal()">+ เพิ่มกิจกรรม</button>
  </div>
  <div class="roadmap-container">
    <div class="roadmap-timeline">
      ${MONTHS.map((m, i) => {
    const items = [...appState.roadmap.filter(r => r.month === i + 1), ...appState.activities.filter(a => a.date && new Date(a.date).getMonth() === i)];
    return `<div class="roadmap-month">
          <div class="roadmap-month-header ${i === now ? 'current' : ''}">${m}</div>
          <div class="roadmap-items">${items.map(it => {
      const st = it.status || 'planned';
      const catColor = { academic: 'var(--cat-academic)', volunteer: 'var(--cat-volunteer)', leadership: 'var(--cat-leadership)', sport_art: 'var(--cat-sport)', language: 'var(--cat-language)' }[it.type] || 'var(--gray-400)';
      const isDeadlineSoon = it.month && it.month === now + 1;
      const isActivity = it.date !== undefined;
      return `<div class="roadmap-block status-${st}" style="background:${getCatBg(it.type)};border-color:${catColor}">
        <div style="padding-right:12px;">${it.name}${isDeadlineSoon && st === 'planned' ? '<span class="deadline-badge">ใกล้ถึง!</span>' : ''}</div>
        <button class="roadmap-delete-btn" onclick="event.stopPropagation(); ${isActivity ? `deleteActivity(${it.id})` : `deleteRoadmapItem(${it.id})`}" title="ลบ">✕</button>
      </div>`;
    }).join('')}${items.length === 0 ? '<div style="font-size:.7rem;color:var(--gray-300);text-align:center;padding:8px">—</div>' : ''}</div>
        </div>`;
  }).join('')}
    </div>
  </div>
  <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:16px">
    ${Object.entries(TYPE_LABELS).map(([k, v]) => `<div style="display:flex;align-items:center;gap:6px;font-size:.78rem"><div style="width:12px;height:12px;border-radius:3px;background:var(--cat-${k === 'sport_art' ? 'sport' : k})"></div>${v}</div>`).join('')}
    <div style="display:flex;align-items:center;gap:12px;font-size:.75rem;color:var(--gray-400);margin-left:auto">
      <span><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> วางแผน</span><span><svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" style="vertical-align:middle; opacity:0.5;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> กำลังสมัคร</span><span style="text-decoration:line-through"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ผ่านแล้ว</span>
    </div>
  </div>`;
}

// ========== Global ==========
function renderGlobal() {
  document.getElementById('mainContent').innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
    <div>
      <h1 style="font-size:1.4rem;font-weight:800;display:flex;align-items:center;gap:8px;"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> Global Portfolios</h1>
      <p style="color:var(--gray-400);font-size:.85rem">ดูพอร์ตฟอลิโอของเพื่อนๆ และแชร์พอร์ตของคุณให้โลกเห็น</p>
    </div>
    <button class="btn btn-primary btn-sm" onclick="openProfileModal()">ตั้งค่าโปรไฟล์ & แชร์</button>
  </div>
  
  <div class="dash-grid" style="grid-template-columns: 1fr;">
    <div class="card" style="text-align:center; padding:40px 20px;">
      <h3 style="margin-bottom:12px;">🌟 แรงบันดาลใจจากเพื่อนๆ 🌟</h3>
      <p style="color:var(--gray-400); margin-bottom: 24px;">ดูพอร์ตที่น่าสนใจของคนที่เปิดสาธารณะ</p>
      
      <div id="publicUsersGrid" class="dash-grid-3">
        <p style="grid-column: 1/-1; color:var(--gray-400); text-align:center;">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  </div>`;
  loadPublicUsers();
}

async function loadPublicUsers() {
  try {
    const snap = await db.collection('users').where('isPublic', '==', true).limit(12).get();
    let html = '';
    snap.forEach(doc => {
      const data = doc.data();
      const pct = Math.min(100, Math.round((data.activities?.length || 0) * 15));
      html += `
        <div class="card" style="border: 1px solid var(--border); box-shadow:none; text-align:left;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <div style="font-size:2rem; color:var(--primary)"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
            <div>
              <div style="font-weight:700;">${data.name || 'Anonymous'}</div>
              <div style="font-size:0.8rem; color:var(--gray-400);">${data.grade || '-'} — ${data.track || '-'}</div>
            </div>
          </div>
          <div class="stat-bar" style="margin-bottom:12px;"><div class="stat-bar-fill" style="width:${pct}%;background:var(--primary)"></div></div>
          <p style="font-size:0.8rem; margin-bottom:12px;">${data.bio || 'ไม่มีข้อมูลแนะนำตัว'}</p>
          <button class="btn btn-secondary btn-sm btn-full" disabled>ดูพอร์ตฟอลิโอ</button>
        </div>
      `;
    });
    if(!html) html = '<p style="grid-column: 1/-1; color:var(--gray-400); text-align:center;">ยังไม่มีใครเปิดพอร์ตเป็นสาธารณะตอนนี้</p>';
    const grid = document.getElementById('publicUsersGrid');
    if (grid) grid.innerHTML = html;
  } catch (e) {
    const grid = document.getElementById('publicUsersGrid');
    if (grid) grid.innerHTML = '<p style="grid-column: 1/-1; color:var(--red); text-align:center;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    console.error("Error loading public users:", e);
  }
}

// ========== Rate Us ==========
function renderRate() {
  document.getElementById('mainContent').innerHTML = `
  <div style="max-width: 600px; margin: 0 auto; padding-top: 40px;">
    <div style="text-align:center; margin-bottom:32px;">
      <h1 style="font-size:1.8rem; font-weight:800; margin-bottom:8px;">
        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; color:var(--primary);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        ให้คะแนน TCASX
      </h1>
      <p style="color:var(--gray-400);">ความคิดเห็นของคุณมีความหมาย! ช่วยเราพัฒนา TCASX ให้ดียิ่งขึ้น</p>
    </div>
    <div class="card" style="padding: 32px;">
      <form id="rateForm" onsubmit="submitRate(event)">
        <div class="form-group" style="text-align:center; margin-bottom: 24px;">
          <label style="font-size: 1.1rem; font-weight: 700; margin-bottom: 12px; display:block;">คุณให้คะแนนเรากี่ดาว?</label>
          <div class="star-rating" id="starRating" style="font-size: 2.5rem; color: var(--gray-300); cursor: pointer; display: flex; justify-content: center; gap: 8px;">
            <span data-val="1" onmouseenter="hoverStars(1)" onmouseleave="resetStarHover()">&#9733;</span><span data-val="2" onmouseenter="hoverStars(2)" onmouseleave="resetStarHover()">&#9733;</span><span data-val="3" onmouseenter="hoverStars(3)" onmouseleave="resetStarHover()">&#9733;</span><span data-val="4" onmouseenter="hoverStars(4)" onmouseleave="resetStarHover()">&#9733;</span><span data-val="5" onmouseenter="hoverStars(5)" onmouseleave="resetStarHover()">&#9733;</span>
          </div>
          <input type="hidden" id="rateStars" value="0">
        </div>
        <div class="form-group">
          <label>ข้อเสนอแนะเพิ่มเติม</label>
          <textarea id="rateComment" rows="4" placeholder="บอกเราหน่อยว่าชอบอะไร หรืออยากให้ปรับปรุงอะไร..." required></textarea>
        </div>
        <button type="submit" id="rateSubmitBtn" class="btn btn-primary btn-full">ส่งความคิดเห็น</button>
      </form>
    </div>
  </div>`;
  document.querySelectorAll('#starRating span').forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.val);
      document.getElementById('rateStars').value = val;
      document.querySelectorAll('#starRating span').forEach((s, i) => s.style.color = i < val ? 'var(--orange)' : 'var(--gray-300)');
    });
  });
}
let _selectedStars = 0;
function hoverStars(n) { document.querySelectorAll('#starRating span').forEach((s, i) => s.style.color = i < n ? 'var(--orange)' : 'var(--gray-300)'); }
function resetStarHover() { const v = parseInt(document.getElementById('rateStars')?.value || 0); document.querySelectorAll('#starRating span').forEach((s, i) => s.style.color = i < v ? 'var(--orange)' : 'var(--gray-300)'); }

async function submitRate(e) {
  e.preventDefault();
  const stars = document.getElementById('rateStars').value;
  const comment = document.getElementById('rateComment').value;
  if (stars === "0") { showNotification('กรุณาเลือกจำนวนดาว', 'warning'); return; }
  const btn = document.getElementById('rateSubmitBtn');
  btn.disabled = true; btn.innerText = 'กำลังส่ง...';
  const webhookUrl = 'https://discord.com/api/webhooks/1503041111969632427/IevVUfYevqaBQXW0sY_sNnJxEqsMsFTDD9rm88j_NifwFEiGyAzPvao-RoCB7ojzfUJP';
  const payload = { embeds: [{ title: "New TCASX Review", color: 16766720, fields: [
    { name: "User", value: appState.currentUser?.name || "Anonymous", inline: true },
    { name: "Email", value: appState.currentUser?.username || "N/A", inline: true },
    { name: "Rating", value: String.fromCodePoint(11088).repeat(parseInt(stars)), inline: false },
    { name: "Comment", value: comment, inline: false }
  ], timestamp: new Date().toISOString() }] };
  try {
    await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    showNotification('ส่งความคิดเห็นเรียบร้อย ขอบคุณครับ!', 'success');
    document.getElementById('rateForm').reset();
    document.getElementById('rateStars').value = "0";
    document.querySelectorAll('#starRating span').forEach(s => s.style.color = 'var(--gray-300)');
  } catch(err) { showNotification('ไม่สามารถส่งข้อมูลได้', 'error'); }
  finally { btn.disabled = false; btn.innerText = 'ส่งความคิดเห็น'; }
}

// ========== Auth Logic ==========
let isSignupMode = false;
function toggleAuthMode() {
  isSignupMode = !isSignupMode;
  document.getElementById('authTitle').innerText = isSignupMode ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
  document.getElementById('authSubtitle').innerText = isSignupMode ? 'สร้างบัญชีเพื่อเริ่มวางแผนพอร์ตฟอลิโอของคุณ' : 'ยินดีต้อนรับกลับมา! พร้อมลุยพอร์ตหรือยัง?';
  document.getElementById('signupFields').style.display = isSignupMode ? 'block' : 'none';
  document.getElementById('authSubmitBtn').innerText = isSignupMode ? 'สร้างบัญชี' : 'เข้าสู่ระบบ';
  document.getElementById('authSwitchText').innerText = isSignupMode ? 'มีบัญชีอยู่แล้วใช่ไหม?' : 'ยังไม่มีบัญชีใช่ไหม?';
  document.getElementById('authSwitchLink').innerText = isSignupMode ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก';
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('authUsername').value;
  const password = document.getElementById('authPassword').value;
  const name = isSignupMode ? document.getElementById('authName').value : '';

  try {
    if (isSignupMode) {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName: name });
      await completeLogin(userCredential.user);
    } else {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      await completeLogin(userCredential.user);
    }
  } catch (error) {
    let msg = error.message;
    if (error.code === 'auth/email-already-in-use') msg = 'อีเมลนี้ถูกใช้งานแล้ว';
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') msg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    if (error.code === 'auth/weak-password') msg = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    showNotification("เกิดข้อผิดพลาด: " + msg, 'error');
  }
}

async function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    await completeLogin(result.user);
  } catch (error) {
    showNotification("Google Sign In Error: " + error.message, 'error');
  }
}

async function completeLogin(user) {
  appState.isAuthenticated = true;
  appState.currentUser = { name: user.displayName || user.email, username: user.email };

  try {
    // Fetch user data from Firestore
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
      const data = doc.data();
      if (data.grade) appState.grade = data.grade;
      if (data.track) appState.track = data.track;
      if (data.faculties && data.faculties.length > 0) appState.faculties = data.faculties;
      if (data.onboarded !== undefined) appState.onboarded = data.onboarded;
      if (data.activities) appState.activities = data.activities;
      if (data.roadmap) appState.roadmap = data.roadmap;
      if (data.name) appState.currentUser.name = data.name;
      appState.currentUser.bio = data.bio || '';
      appState.currentUser.isPublic = !!data.isPublic;
    }
  } catch (e) {
    console.error("Error fetching user data", e);
  }

  saveState();
  
  // Directly transition UI instead of calling initApp()
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appWrapper').style.display = 'block';
  updateSidebarUser();
  let validFaculty = false;
  if (appState.faculties && appState.faculties.length > 0) {
    validFaculty = !!FACULTIES.find(f => f.id === appState.faculties[0]);
  }
  if (!appState.onboarded || !validFaculty) {
    if (FACULTIES.length > 0) {
      appState.onboarded = false;
      appState.faculties = [];
      showOnboarding();
    } else {
      navigate(currentPage === 'dashboard' ? 'dashboard' : currentPage);
    }
  } else {
    navigate(currentPage === 'dashboard' ? 'dashboard' : currentPage);
  }
}

function logout() {
  auth.signOut().then(() => {
    appState.isAuthenticated = false;
    appState.currentUser = null;
    saveState();
    document.getElementById('appWrapper').style.display = 'none';
    document.getElementById('authScreen').style.display = 'flex';
  });
}

function initApp() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      if (!appState.isAuthenticated) {
        await completeLogin(user);
      } else {
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('appWrapper').style.display = 'block';
        updateSidebarUser();
        let validFaculty = false;
        if (appState.faculties && appState.faculties.length > 0) {
          validFaculty = !!FACULTIES.find(f => f.id === appState.faculties[0]);
        }
        if (!appState.onboarded || !validFaculty) {
          if (FACULTIES.length > 0) { // Only force reset if API is actually loaded
            appState.onboarded = false;
            appState.faculties = [];
            showOnboarding();
          } else {
            navigate(currentPage === 'dashboard' ? 'dashboard' : currentPage);
          }
        } else {
          navigate(currentPage === 'dashboard' ? 'dashboard' : currentPage);
        }
      }
    } else {
      appState.isAuthenticated = false;
      document.getElementById('appWrapper').style.display = 'none';
      document.getElementById('authScreen').style.display = 'flex';
    }
  });
}

// ========== Onboarding ==========
let obStep = 1;
function showOnboarding() {
  if (FACULTIES.length === 0) {
    document.getElementById('mainContent').innerHTML = '<div style="text-align:center;padding:100px 20px;color:var(--gray-400);"><h2>ไม่สามารถโหลดข้อมูลได้ (Backend Offline)</h2><p>กรุณารันคำสั่ง <code>python api.py</code> ในโฟลเดอร์ backend</p></div>';
    return;
  }
  document.getElementById('onboardingModal').style.display = 'flex';
  obStep = 1; renderOnboardingStep();
}
function hideOnboarding() { document.getElementById('onboardingModal').style.display = 'none'; }
function renderOnboardingStep() {
  const fill = document.getElementById('obProgressFill');
  const label = document.getElementById('obStepLabel');
  const content = document.getElementById('onboardingContent');
  fill.style.width = (obStep / 3 * 100) + '%';
  label.textContent = `ขั้นตอนที่ ${obStep}/3`;

  if (obStep === 1) {
    content.innerHTML = `
      <h2 class="ob-title" style="font-size: 1.8rem; text-align: center; margin-bottom: 8px;"><svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; color:var(--primary); margin-right: 8px;"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>สวัสดี! มาเริ่มกันเลย</h2>
      <p class="ob-subtitle" style="text-align: center; margin-bottom: 32px;">เลือกชั้นปีและสายการเรียนของคุณ</p>
      <div class="form-group"><label style="font-size: 1.1rem; font-weight: 700;">ชั้นปี</label>
        <div class="ob-options">${['ม.4', 'ม.5', 'ม.6'].map(g => `<div class="ob-option ${appState.grade === g ? 'selected' : ''}" onclick="selectGrade('${g}',this)">${g}</div>`).join('')}</div>
      </div>
      <div class="form-group" style="margin-top: 24px;"><label style="font-size: 1.1rem; font-weight: 700;">สายการเรียน</label>
        <div class="ob-options">${['วิทย์-คณิต', 'ศิลป์-คำนวณ', 'ศิลป์-ภาษา', 'ศิลป์-สังคม'].map(t => `<div class="ob-option ${appState.track === t ? 'selected' : ''}" onclick="selectTrack('${t}',this)">${t}</div>`).join('')}</div>
      </div>
      <div class="ob-nav" style="margin-top: 40px;"><div></div><button class="btn btn-primary" style="padding: 14px 32px; font-size: 1.1rem;" onclick="obStep=2;renderOnboardingStep()">ถัดไป →</button></div>`;
  } else if (obStep === 2) {
    content.innerHTML = `
      <h2 class="ob-title" style="font-size: 1.8rem; text-align: center; margin-bottom: 8px;"><svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; color:var(--primary); margin-right: 8px;"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>เลือกคณะเป้าหมาย</h2>
      <p class="ob-subtitle" style="text-align: center; margin-bottom: 32px;">ค้นหาและเลือกคณะในฝันของคุณ (เลือกได้สูงสุด 3 คณะ)</p>
      
      <div class="search-dropdown">
        <input type="text" class="search-dropdown-input" id="facultySearch" placeholder="🔍 ค้นหาคณะ หรือ มหาวิทยาลัย..." style="padding: 16px; font-size: 1.05rem;" oninput="filterFaculties(this.value)" onfocus="document.getElementById('facultyList').classList.add('active')">
        <div class="search-dropdown-list" id="facultyList">
          ${renderFacultyDropdownItems(FACULTIES)}
        </div>
      </div>
      
      <div id="selectedFaculties" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; margin-bottom:24px;">
        ${renderSelectedFaculties()}
      </div>

      <div class="ob-nav" style="margin-top: 40px;">
        <button class="btn btn-secondary" style="padding: 14px 24px; font-size: 1.1rem;" onclick="obStep=1;renderOnboardingStep()">← ย้อนกลับ</button>
        <button class="btn btn-primary" style="padding: 14px 32px; font-size: 1.1rem;" onclick="if(appState.faculties.length === 0) { showNotification('กรุณาเลือกคณะเป้าหมายอย่างน้อย 1 คณะ', 'warning'); } else { obStep=3;renderOnboardingStep(); }">ถัดไป →</button>
      </div>`;

    // Close dropdown when clicking outside
    setTimeout(() => {
      document.addEventListener('click', closeDropdownOutside);
    }, 100);
  } else {
    document.removeEventListener('click', closeDropdownOutside);
    const fac = FACULTIES.find(f => f.id === appState.faculties[0]);
    content.innerHTML = `
      <h2 class="ob-title" style="font-size: 1.8rem; text-align: center; margin-bottom: 8px;"><svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; color:var(--primary); margin-right: 8px;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>สรุปเป้าหมาย</h2>
      <p class="ob-subtitle" style="text-align: center; margin-bottom: 32px;">ตรวจสอบข้อมูลของคุณก่อนเริ่มต้น</p>
      <div class="ob-summary"><h4>ข้อมูลของคุณ</h4><ul>
        <li><svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> ${appState.grade || 'ยังไม่ได้เลือก'} — ${appState.track || 'ยังไม่ได้เลือก'}</li>
        <li><svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; color:var(--primary);"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg> คณะเป้าหมาย: ${appState.faculties.map(id => { const f = FACULTIES.find(x => x.id === id); return f ? f.emoji + ' ' + f.name + ' ' + f.uni : ''; }).join(', ') || 'ยังไม่ได้เลือก'}</li>
      </ul></div>
      ${fac ? `<div class="ob-summary"><h4>เกณฑ์ TCAS รอบ 1 — ${fac.name} ${fac.uni}</h4><ul>
        ${Object.entries(fac.req).filter(([, v]) => v > 0).map(([k, v]) => `<li>${TYPE_EMOJIS[k]} ${TYPE_LABELS[k]}: ต้องการ ${v} คะแนนขึ้นไป</li>`).join('')}
      </ul></div>` : ''}
      <div class="ob-nav" style="margin-top: 40px;"><button class="btn btn-secondary" style="padding: 14px 24px; font-size: 1.1rem;" onclick="obStep=2;renderOnboardingStep()">← ย้อนกลับ</button><button class="btn btn-accent" style="padding: 14px 32px; font-size: 1.1rem;" onclick="finishOnboarding()"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> เริ่มวางแผน!</button></div>`;
  }
}

function selectGrade(g, el) { appState.grade = g; saveState(); el.parentElement.querySelectorAll('.ob-option').forEach(o => o.classList.remove('selected')); el.classList.add('selected'); updateSidebarUser(); }
function selectTrack(t, el) { appState.track = t; saveState(); el.parentElement.querySelectorAll('.ob-option').forEach(o => o.classList.remove('selected')); el.classList.add('selected'); updateSidebarUser(); }

// Dropdown Logic
function renderFacultyDropdownItems(facs) {
  return facs.map(f => `
    <div class="search-item" onclick="selectFacultyFromDropdown('${f.id}')">
      <div class="search-item-title"><span>${f.emoji}</span> ${f.name}</div>
      <div class="search-item-subtitle">${f.uni}</div>
    </div>
  `).join('') || `<div class="search-item" style="color:var(--gray-400); text-align:center;">ไม่พบข้อมูล</div>`;
}
function filterFaculties(query) {
  query = query.toLowerCase();
  const list = document.getElementById('facultyList');
  if (!list) return;
  list.classList.add('active');
  const filtered = FACULTIES.filter(f => f.name.toLowerCase().includes(query) || f.uni.toLowerCase().includes(query));
  list.innerHTML = renderFacultyDropdownItems(filtered);
}
function closeDropdownOutside(e) {
  const list = document.getElementById('facultyList');
  const input = document.getElementById('facultySearch');
  if (list && !list.contains(e.target) && e.target !== input) {
    list.classList.remove('active');
  }
}
function renderSelectedFaculties() {
  return appState.faculties.map(id => {
    const f = FACULTIES.find(x => x.id === id);
    if (!f) return '';
    return `<div class="tag" style="background:var(--primary-light); color:white; padding:6px 12px; font-size:0.8rem;">
      ${f.emoji} ${f.name} (${f.uni}) <span style="cursor:pointer; margin-left:6px; font-weight:800;" onclick="removeFaculty('${id}')">×</span>
    </div>`;
  }).join('');
}
function selectFacultyFromDropdown(id) {
  if (!appState.faculties.includes(id)) {
    if (appState.faculties.length >= 3) {
      showNotification('เลือกคณะเป้าหมายได้สูงสุด 3 คณะ', 'warning');
    } else {
      appState.faculties.push(id);
      saveState();
    }
  }
  document.getElementById('facultySearch').value = '';
  document.getElementById('facultyList').classList.remove('active');
  document.getElementById('selectedFaculties').innerHTML = renderSelectedFaculties();
}
function removeFaculty(id) {
  appState.faculties = appState.faculties.filter(fId => fId !== id);
  saveState();
  document.getElementById('selectedFaculties').innerHTML = renderSelectedFaculties();
}

function finishOnboarding() { appState.onboarded = true; saveState(); hideOnboarding(); navigate('dashboard'); updateSidebarUser(); }
function updateSidebarUser() {
  const n = document.getElementById('sidebarUserName'); const l = document.getElementById('sidebarUserLevel');
  if (n) n.textContent = appState.currentUser?.name || 'นักเรียน';
  if (l) l.textContent = (appState.grade || 'ม.5') + ' — ' + (appState.track || 'สายวิทย์');
}

// ========== Activity Management ==========
function openActivityModal() { document.getElementById('addActivityModal').style.display = 'flex'; }
function closeActivityModal() { document.getElementById('addActivityModal').style.display = 'none'; document.getElementById('activityForm').reset(); }
document.getElementById('activityForm').addEventListener('submit', e => {
  e.preventDefault();
  const a = {
    id: Date.now(), name: document.getElementById('actName').value, type: document.getElementById('actType').value,
    level: document.getElementById('actLevel').value, date: document.getElementById('actDate').value,
    status: document.getElementById('actStatus').value, desc: document.getElementById('actDesc').value
  };
  appState.activities.push(a); saveState(); closeActivityModal(); navigate(currentPage);
});
function deleteActivity(id) { appState.activities = appState.activities.filter(a => a.id !== id); saveState(); navigate(currentPage); }
function addToRoadmapFromExplore(eid) {
  const item = EXPLORE_ITEMS.find(e => e.id === eid);
  if (!item || appState.roadmap.find(r => r.name === item.name)) { showNotification(item ? 'มีในแผนแล้ว!' : 'ไม่พบกิจกรรม', 'warning'); return; }
  appState.roadmap.push({ id: Date.now(), name: item.name, type: item.type, month: item.month, status: 'planned' });
  saveState(); showNotification('เพิ่มใน Roadmap แล้ว!', 'success');
}

// File upload area
const fua = document.getElementById('fileUploadArea');
if (fua) { fua.addEventListener('click', () => document.getElementById('actCert').click()); }

function deleteRoadmapItem(id) {
  appState.roadmap = appState.roadmap.filter(r => r.id !== id);
  saveState();
  navigate(currentPage);
}

// ========== Profile & Settings ==========
function openProfileModal() {
  document.getElementById('profileModal').style.display = 'flex';
  document.getElementById('profName').value = appState.currentUser?.name || '';
  document.getElementById('profBio').value = appState.currentUser?.bio || '';
  document.getElementById('profGrade').value = appState.grade || 'ม.4';
  document.getElementById('profTrack').value = appState.track || 'วิทย์-คณิต';
  document.getElementById('profPublic').checked = !!appState.currentUser?.isPublic;
}
function closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; }
document.getElementById('profileForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('profName').value;
  const bio = document.getElementById('profBio').value;
  const grade = document.getElementById('profGrade').value;
  const track = document.getElementById('profTrack').value;
  const isPublic = document.getElementById('profPublic').checked;
  
  if(appState.currentUser) {
    appState.currentUser.name = name;
    appState.currentUser.bio = bio;
    appState.currentUser.isPublic = isPublic;
  }
  appState.grade = grade;
  appState.track = track;
  saveState();
  updateSidebarUser();
  closeProfileModal();
  showNotification('อัพเดตโปรไฟล์เรียบร้อยแล้ว!', 'success');
});

// ========== Notifications ==========
function showNotification(msg, type = 'info') {
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `custom-toast toast-${type}`;
  
  let icon = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  if (type === 'error') icon = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  if (type === 'success') icon = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
  if (type === 'warning') icon = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
  
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);
  
  // force reflow
  toast.offsetHeight;
  
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}



// ========== Init ==========
loadExternalData().then(() => {
  initApp();
});
