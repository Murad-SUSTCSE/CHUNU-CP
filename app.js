/* CP Tracker App - Initial Scaffold */
(function(){
  const STORAGE_KEY = 'cpTrackerDataV1';
  const THEME_KEY = 'cpTrackerTheme';

  const defaultData = { nextMonthRating: [], nextMonthTopic: [], topics4Weeks: [], upsolve: [] };
  let state = loadState();

  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return JSON.parse(JSON.stringify(defaultData));
      const parsed = JSON.parse(raw);
      return { ...defaultData, ...parsed };
    } catch(e){ console.warn('Failed loading state', e); return JSON.parse(JSON.stringify(defaultData)); }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); refreshStats(); }

  // Theme handling
  function loadTheme(){
    const t = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', t);
    document.getElementById('darkModeToggle').checked = t === 'dark';
  }
  function toggleTheme(){
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  }

  // Utility
  const uid = () => Math.random().toString(36).slice(2,11);
  const byId = id => document.getElementById(id);

  // Section navigation
  function showSection(key){
    document.querySelectorAll('.app-section').forEach(s=>s.classList.add('d-none'));
    const target = byId('section-' + key);
    if(target){ target.classList.remove('d-none'); }
    if(key === 'dashboard') refreshStats();
    if(key === 'next-month') { renderRatingProblems(); renderTopicProblems(); }
    if(key === 'topics-4-weeks') render4WeekTopics();
    if(key === 'upsolve') renderUpsolve();
    if(key === 'calendar') renderCalendar();
  }

  // Stats
  function refreshStats(){
    const totalProblems = state.nextMonthRating.length + state.nextMonthTopic.length + state.upsolve.length;
    const solvedRating = state.nextMonthRating.filter(p=>p.solved).length;
    const solvedTopic = state.nextMonthTopic.filter(p=>p.solved).length;
    const solvedUpsolve = state.upsolve.filter(p=>p.solved).length;
    const solvedTotal = solvedRating + solvedTopic + solvedUpsolve;
    const pct = totalProblems ? Math.round((solvedTotal/totalProblems)*100) : 0;

    byId('overallSummary').textContent = `${solvedTotal}/${totalProblems} solved (${pct}%)`;
    byId('dashRatingCounts').textContent = `${solvedRating}/${state.nextMonthRating.length} solved`;
    byId('dashTopicCounts').textContent = `${solvedTopic}/${state.nextMonthTopic.length} solved`;
    byId('dashUpsolveCounts').textContent = `${solvedUpsolve}/${state.upsolve.length} solved`;
    const topicsCompleted = state.topics4Weeks.filter(t=>t.status==='completed').length;
    byId('dash4WeekCounts').textContent = `${topicsCompleted}/${state.topics4Weeks.length} completed`;
    drawDonut(pct, solvedTotal, totalProblems);
  }

  function drawDonut(pct, solved, total){
    const canvas = byId('progressDonut'); if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth || 140;
    const h = canvas.height = 140;
    ctx.clearRect(0,0,w,h);
    const cx = w/2, cy = h/2, r = Math.min(w,h)/2 - 10;
    // background ring
    ctx.lineWidth = 18;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border') || '#ccc';
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    // progress arc
    const end = (pct/100)*Math.PI*2 - Math.PI/2; // start at top
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#0d6efd';
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI/2,end); ctx.stroke();
    // text
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#000';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pct+'%', cx, cy-4);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`${solved}/${total}`, cx, cy+14);
  }

  // Analytics
  function computeAnalytics(){
    // Rating buckets
    const buckets = {};
    state.nextMonthRating.forEach(p=>{
      const r = parseInt(p.rating,10);
      const bStart = isNaN(r)? 'Unrated' : (Math.floor(r/200)*200)+'-'+(Math.floor(r/200)*200+200);
      buckets[bStart] = buckets[bStart] || { total:0, solved:0 };
      buckets[bStart].total++; if(p.solved) buckets[bStart].solved++;
    });
    const ratingArray = Object.entries(buckets).sort((a,b)=> a[0].localeCompare(b[0]))
      .map(([label,val])=> ({ label, ...val, pct: val.total? Math.round(val.solved/val.total*100):0 }));
    // Topic problems distribution
    const topicMap = {};
    state.nextMonthTopic.forEach(p=>{ const t=(p.topic||'General').trim(); topicMap[t]=topicMap[t]||{total:0,solved:0}; topicMap[t].total++; if(p.solved) topicMap[t].solved++; });
    const topicArray = Object.entries(topicMap).sort((a,b)=> a[0].localeCompare(b[0]))
      .map(([topic,val])=> ({ topic, ...val, pct: val.total? Math.round(val.solved/val.total*100):0 }));
    // Upsolve contest stats
    const contests = state.upsolve.filter(u=>u.kind==='contest');
    const contestStats = contests.map(c=>{
      const total = c.problems? c.problems.length:0;
      const solved = c.problems? c.problems.filter(x=>x.solved).length:0;
      return { name:c.name, platform:c.platform||'', solved, total, pct: total? Math.round(solved/total*100):0, status: c.solved };
    });
    // 4-week topics progress
    const fourWeek = state.topics4Weeks.map(t=> ({ topic:t.topic, status:t.status||'not started' }));
    return { ratingArray, topicArray, contestStats, fourWeek };
  }
  function openAnalytics(){
    const data = computeAnalytics();
    const body = `
      <div class='mb-3'>
        <h6>Rating Buckets</h6>
        ${data.ratingArray.length? tableHtml(['Bucket','Solved','Total','%'], data.ratingArray.map(r=> [r.label, r.solved, r.total, r.pct+'%'])):'<div class="text-muted small">No rating problems.</div>'}
      </div>
      <div class='mb-3'>
        <h6>Topics</h6>
        ${data.topicArray.length? tableHtml(['Topic','Solved','Total','%'], data.topicArray.map(r=> [escapeHtml(r.topic), r.solved, r.total, r.pct+'%'])):'<div class="text-muted small">No topic problems.</div>'}
      </div>
      <div class='mb-3'>
        <h6>Upsolve Contests</h6>
        ${data.contestStats.length? tableHtml(['Contest','Platform','Solved','Total','%'], data.contestStats.map(c=> [escapeHtml(c.name), escapeHtml(c.platform), c.solved, c.total, c.pct+'%'])):'<div class="text-muted small">No contests.</div>'}
      </div>
      <div class='mb-2'>
        <h6>4 Week Topics</h6>
        ${data.fourWeek.length? tableHtml(['Topic','Status'], data.fourWeek.map(t=> [escapeHtml(t.topic), escapeHtml(t.status)])):'<div class="text-muted small">No 4-week topics.</div>'}
      </div>`;
    openModal('Analytics', body, ()=>{});
  }
  function tableHtml(headers, rows){
    return `<div class='table-responsive'><table class='table table-sm align-middle mb-0'>
      <thead><tr>${headers.map(h=> `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r=> `<tr>${r.map(c=> `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  // Rendering placeholders (will expand later)
  function groupRatings(){
    const buckets = {};
    state.nextMonthRating.forEach(p=>{
      const r = parseInt(p.rating,10) || 0;
      const bucketStart = Math.floor(r/200)*200 || 0; // 0 groups unknown
      const label = bucketStart? `${bucketStart}-${bucketStart+200}`: 'Unrated';
      buckets[label] = buckets[label] || [];
      buckets[label].push(p);
    });
    return Object.entries(buckets).sort((a,b)=> a[0].localeCompare(b[0]));
  }
  function renderRatingProblems(){
    const wrap = byId('ratingProblemsContainer');
    if(!wrap) return; 
    const filter = byId('ratingFilter').value;
    const groups = groupRatings();
    if(groups.length===0){ wrap.innerHTML = '<div class="placeholder-empty p-3">No rating problems yet.</div>'; return; }
    wrap.innerHTML = groups.map(([,arr],i)=>{
      const items = arr.filter(p=> filter==='all' || (filter==='solved'?p.solved:!p.solved))
        .map(p=> `<div class='d-flex align-items-center justify-content-between py-1'>
          <div class='flex-grow-1'><input type='checkbox' data-action='toggle-rating' data-id='${p.id}' ${p.solved?'checked':''} class='form-check-input me-2'>
            <a href='${p.link}' target='_blank' rel='noopener' class='me-2'>${escapeHtml(p.name||'Untitled')}</a>
            <span class='badge ${p.solved?'badge-solved':'badge-unsolved'}'>${p.solved?'Solved':'Todo'}</span>
            <small class='text-muted ms-2'>${p.rating||'-'}</small>
          </div>
          <div class='btn-group btn-group-sm'>
            <button class='btn btn-outline-secondary' data-action='edit-rating' data-id='${p.id}'>Edit</button>
            <button class='btn btn-outline-danger' data-action='delete-rating' data-id='${p.id}'>Del</button>
          </div>
        </div>`).join('');
      if(!items) return '';
      return `<div class='accordion-item'>
        <h2 class='accordion-header'>
          <button class='accordion-button collapsed' type='button' data-bs-toggle='collapse' data-bs-target='#rg${i}'>${groups[i][0]}</button>
        </h2>
        <div id='rg${i}' class='accordion-collapse collapse'>
          <div class='accordion-body p-2'>${items||'<em>Empty</em>'}</div>
        </div>
      </div>`;
    }).join('');
  }

  function groupTopics(){
    const map = {};
    state.nextMonthTopic.forEach(p=>{ const key = (p.topic||'General').trim(); map[key]=map[key]||[]; map[key].push(p); });
    return Object.entries(map).sort((a,b)=> a[0].localeCompare(b[0]));
  }
  function renderTopicProblems(){
    const wrap = byId('topicProblemsContainer'); if(!wrap) return;
    const filter = byId('topicFilter').value;
    const groups = groupTopics();
    if(groups.length===0){ wrap.innerHTML = '<div class="placeholder-empty p-3">No topic problems yet.</div>'; return; }
    wrap.innerHTML = groups.map((g,i)=>{
      const [topic, arr] = g;
      const items = arr.filter(p=> filter==='all' || (filter==='solved'?p.solved:!p.solved))
        .map(p=> `<div class='d-flex align-items-center justify-content-between py-1'>
          <div class='flex-grow-1'><input type='checkbox' data-action='toggle-topicprob' data-id='${p.id}' ${p.solved?'checked':''} class='form-check-input me-2'>
            <a href='${p.link}' target='_blank' rel='noopener' class='me-2'>${escapeHtml(p.name||'Untitled')}</a>
            <span class='badge ${p.solved?'badge-solved':'badge-unsolved'}'>${p.solved?'Solved':'Todo'}</span>
          </div>
          <div class='btn-group btn-group-sm'>
            <button class='btn btn-outline-secondary' data-action='edit-topicprob' data-id='${p.id}'>Edit</button>
            <button class='btn btn-outline-danger' data-action='delete-topicprob' data-id='${p.id}'>Del</button>
          </div>
        </div>`).join('');
      if(!items) return '';
      return `<div class='accordion-item'>
        <h2 class='accordion-header'>
          <button class='accordion-button collapsed' type='button' data-bs-toggle='collapse' data-bs-target='#tp${i}'>${escapeHtml(topic)}</button>
        </h2>
        <div id='tp${i}' class='accordion-collapse collapse'>
          <div class='accordion-body p-2'>${items||'<em>Empty</em>'}</div>
        </div>
      </div>`;
    }).join('');
  }

  function render4WeekTopics(){
    const wrap = byId('topics4WeeksContainer'); if(!wrap) return;
    if(state.topics4Weeks.length===0){ wrap.innerHTML = '<div class="placeholder-empty p-3">No topics added.</div>'; return; }
    wrap.innerHTML = state.topics4Weeks.sort((a,b)=> (a.startDate||'').localeCompare(b.startDate||''))
      .map(t=> `<div class='list-group-item'>
        <div class='d-flex justify-content-between align-items-center'>
          <div>
            <strong>${escapeHtml(t.topic)}</strong>
            <small class='text-muted ms-2'>${t.startDate||'?'} → ${t.endDate||'?'}</small>
            <select class='form-select form-select-sm d-inline-block ms-2 w-auto topic-status-select' data-id='${t.id}'>
              ${['not started','in progress','completed'].map(st=> `<option value='${st}' ${t.status===st?'selected':''}>${st}</option>`).join('')}
            </select>
          </div>
          <div class='btn-group btn-group-sm'>
            <button class='btn btn-outline-secondary' data-action='edit-4week' data-id='${t.id}'>Edit</button>
            <button class='btn btn-outline-danger' data-action='delete-4week' data-id='${t.id}'>Del</button>
          </div>
        </div>
        ${renderResourceCollapse(t)}
      </div>`).join('');
  }
  function open4WeekTopicModal(existing){
    const resRows = (existing?.resources||[]).map((r,i)=> resourceRow(i,r.url,r.desc)).join('');
    const m = openModal(existing? 'Edit Topic (4 Weeks)':'Add Topic (4 Weeks)', `
      <form id='topic4Form'>
        <div class='mb-2'>
          <label class='form-label'>Topic *</label>
          <input required type='text' name='topic' class='form-control' value='${escapeHtml(existing?.topic||'')}' />
        </div>
        <div class='row'>
          <div class='col-md-6 mb-2'>
            <label class='form-label'>Start Date</label>
            <input type='date' name='startDate' class='form-control' value='${escapeHtml(existing?.startDate||'')}' />
          </div>
          <div class='col-md-6 mb-2'>
            <label class='form-label'>End Date</label>
            <input type='date' name='endDate' class='form-control' value='${escapeHtml(existing?.endDate||'')}' />
          </div>
        </div>
        <div class='mb-2'>
          <label class='form-label'>Status</label>
          <select name='status' class='form-select'>
            <option value='not started' ${existing?.status==='not started'?'selected':''}>Not started</option>
            <option value='in progress' ${existing?.status==='in progress'?'selected':''}>In progress</option>
            <option value='completed' ${existing?.status==='completed'?'selected':''}>Completed</option>
          </select>
        </div>
        <div class='mb-2'>
          <div class='d-flex justify-content-between align-items-center'>
            <label class='form-label mb-0'>Resources (max 10)</label>
            <button type='button' class='btn btn-sm btn-outline-primary' id='addResRowBtn'>Add Resource</button>
          </div>
          <div id='resRows'>${resRows||''}</div>
        </div>
      </form>
    `, (modal)=>{
      const form = modal.querySelector('#topic4Form');
      if(!form.reportValidity()) return false;
      const fd = new FormData(form);
      const base = Object.fromEntries(fd.entries());
      const resources = [...modal.querySelectorAll('.res-row')].map(row=>{
        const url = row.querySelector('input[name="resUrl"]').value.trim();
        const desc = row.querySelector('input[name="resDesc"]').value.trim();
        return url? {url, desc}: null;
      }).filter(Boolean);
      if(existing){
        Object.assign(existing, base, { resources });
      } else {
        state.topics4Weeks.push({ id: uid(), resources, ...base });
      }
      saveState();
      render4WeekTopics();
      refreshStats();
    });
    m.querySelector('#addResRowBtn').addEventListener('click', ()=>{
      const container = m.querySelector('#resRows');
      const count = container.querySelectorAll('.res-row').length;
      if(count>=10) return; 
      container.insertAdjacentHTML('beforeend', resourceRow(count,'',''));
    });
    m.addEventListener('click', (ev)=>{
      if(ev.target.matches('.remove-res-row')){
        ev.target.closest('.res-row').remove();
      }
    });
  }
  function resourceRow(i,url='',desc=''){
    return `<div class='res-row border rounded p-2 mb-2'>
      <div class='mb-1'>
        <input type='url' name='resUrl' class='form-control form-control-sm' placeholder='Resource URL' value='${escapeHtml(url)}' />
      </div>
      <div class='d-flex gap-2'>
        <input type='text' name='resDesc' class='form-control form-control-sm' placeholder='Description (optional)' value='${escapeHtml(desc)}' />
        <button type='button' class='btn btn-sm btn-outline-danger remove-res-row' title='Remove'>&times;</button>
      </div>
    </div>`;
  }
  function renderResourceCollapse(t){
    if(!t.resources || !t.resources.length) return '';
    const list = t.resources.map(r=> `<li><a href='${r.url}' target='_blank' rel='noopener'>${escapeHtml(r.desc||r.url)}</a></li>`).join('');
    return `<details class='mt-2'> <summary>Resources (${t.resources.length})</summary><ul class='small mt-2 mb-0'>${list}</ul></details>`;
  }
  function statusBadgeClass(st){
    switch(st){
      case 'completed': return 'badge-solved';
      case 'in progress': return 'badge-pending';
      default: return 'badge-unsolved';
    }
  }

  function renderUpsolve(){
    const wrap = byId('upsolveContainer'); if(!wrap) return;
    const filter = byId('upsolveFilter').value;
    if(state.upsolve.length===0){ wrap.innerHTML = '<div class="placeholder-empty p-3">No upsolve entries.</div>'; return; }
    wrap.innerHTML = state.upsolve.filter(p=> filter==='all' || (filter==='solved'?p.solved:!p.solved))
      .sort((a,b)=> (b.date||'').localeCompare(a.date||''))
      .map(p=> upsolveListItem(p)).join('');
  }
  function upsolveListItem(p){
    const typeBadge = `<span class='badge bg-secondary ms-1'>${p.kind==='contest'?'Contest':'Problem'}</span>`;
    let extra = '';
    if(p.kind==='contest' && p.platform){
      extra += `<small class='text-muted ms-2'>${escapeHtml(p.platform)}</small>`;
      if(p.problems && p.problems.length){
        extra += `<details class='mt-2'><summary class='small'>Problems (${p.problems.length})</summary><ul class='small mb-0 mt-2'>${p.problems.map(ch=> `<li><a href='${ch.link}' target='_blank' rel='noopener'>${escapeHtml(ch.name||ch.link)}</a>${ch.solved?" <span class='badge badge-solved ms-1'>Solved</span>":''}</li>`).join('')}</ul></details>`;
      }
    }
    return `<div class='list-group-item'>
      <div class='d-flex justify-content-between'>
        <div>
          <input type='checkbox' data-action='toggle-upsolve' data-id='${p.id}' ${p.solved?'checked':''} class='form-check-input me-2'>
          <a href='${p.link}' target='_blank' rel='noopener'>${escapeHtml(p.name||'Untitled')}</a>
          ${typeBadge}
          <span class='badge ms-2 ${p.solved?'badge-solved':'badge-unsolved'}'>${p.solved?'Solved':'Pending'}</span>
          <small class='text-muted ms-2'>${escapeHtml(p.reason||'')}</small>
          <small class='text-muted ms-2'>${p.date||''}</small>
        </div>
        <div class='btn-group btn-group-sm'>
          <button class='btn btn-outline-secondary' data-action='edit-upsolve' data-id='${p.id}'>Edit</button>
          <button class='btn btn-outline-danger' data-action='delete-upsolve' data-id='${p.id}'>Del</button>
        </div>
      </div>
      ${extra}
    </div>`;
  }

  function openUpsolveModal(existing){
    const problemsRows = (existing?.problems||[]).map(ch=> contestProblemRow(ch)).join('');
    const m = openModal(existing? 'Edit Upsolve Entry':'Add Upsolve Entry', `
      <form id='upsolveForm'>
        <div class='mb-2'>
          <label class='form-label'>Type</label>
          <select name='kind' class='form-select form-select-sm' id='upKind'>
            <option value='problem' ${existing?.kind!=='contest'?'selected':''}>Single Problem</option>
            <option value='contest' ${existing?.kind==='contest'?'selected':''}>Contest</option>
          </select>
        </div>
        <div class='mb-2'>
          <label class='form-label'>Name *</label>
          <input required type='text' name='name' class='form-control' value='${escapeHtml(existing?.name||'')}' />
        </div>
        <div class='mb-2'>
          <label class='form-label'>Main Link *</label>
          <input required type='url' name='link' class='form-control' value='${escapeHtml(existing?.link||'')}' />
        </div>
        <div id='contestFields' class='${existing?.kind==='contest'?'':'d-none'}'>
          <div class='mb-2'>
            <label class='form-label'>Platform</label>
            <select name='platform' class='form-select form-select-sm'>
              <option value=''>--</option>
              ${['Codeforces','AtCoder','CodeChef','VJudge','Other'].map(p=> `<option value='${p}' ${existing?.platform===p?'selected':''}>${p}</option>`).join('')}
            </select>
          </div>
          <div class='d-flex justify-content-between align-items-center mb-1'>
            <label class='form-label mb-0'>Contest Problems</label>
            <button type='button' class='btn btn-sm btn-outline-primary' id='addContestProbBtn'>Add Problem</button>
          </div>
          <div id='contestProblemsRows'>${problemsRows}</div>
        </div>
        <div class='row'>
          <div class='col-md-6 mb-2'>
            <label class='form-label'>Reason</label>
            <input type='text' name='reason' class='form-control' value='${escapeHtml(existing?.reason||'')}' placeholder='used editorial / partial' />
          </div>
          <div class='col-md-6 mb-2'>
            <label class='form-label'>Date Attempted</label>
            <input type='date' name='date' class='form-control' value='${escapeHtml(existing?.date||'')}' />
          </div>
        </div>
      </form>
    `, (modal)=>{
      const form = modal.querySelector('#upsolveForm');
      if(!form.reportValidity()) return false;
      const fd = new FormData(form);
      const base = Object.fromEntries(fd.entries());
      const kind = base.kind || 'problem';
      let problems = [];
      if(kind==='contest'){
        problems = [...modal.querySelectorAll('.contest-prob-row')].map(r=>{
          const name = r.querySelector("input[name='cName']").value.trim();
          const link = r.querySelector("input[name='cLink']").value.trim();
            const solved = r.querySelector("input[name='cSolved']").checked;
          return link? {name, link, solved}: null;
        }).filter(Boolean);
      }
      if(existing){
        Object.assign(existing, base, { problems, kind });
      } else {
        state.upsolve.push({ id: uid(), solved:false, kind, problems, ...base });
      }
      saveState();
      renderUpsolve();
      refreshStats();
    });
    const kindSel = m.querySelector('#upKind');
    kindSel.addEventListener('change', ()=>{
      m.querySelector('#contestFields').classList.toggle('d-none', kindSel.value!=='contest');
    });
    m.querySelector('#addContestProbBtn')?.addEventListener('click', ()=>{
      const container = m.querySelector('#contestProblemsRows');
      container.insertAdjacentHTML('beforeend', contestProblemRow({}));
    });
    m.addEventListener('click', (ev)=>{
      if(ev.target.matches('.remove-contest-prob')) ev.target.closest('.contest-prob-row').remove();
    });
  }
  function contestProblemRow(ch){
    return `<div class='contest-prob-row border rounded p-2 mb-2'>
      <div class='row g-2 align-items-center'>
        <div class='col-md-4'><input type='text' name='cName' class='form-control form-control-sm' placeholder='Name' value='${escapeHtml(ch.name||'')}' /></div>
        <div class='col-md-5'><input type='url' name='cLink' class='form-control form-control-sm' placeholder='Link' value='${escapeHtml(ch.link||'')}' /></div>
        <div class='col-md-2 form-check ms-2'>
          <input class='form-check-input' type='checkbox' name='cSolved' ${ch.solved?'checked':''} />
          <label class='form-check-label small'>Solved</label>
        </div>
        <div class='col-md-1 text-end'>
          <button type='button' class='btn btn-sm btn-outline-danger remove-contest-prob'>&times;</button>
        </div>
      </div>
    </div>`;
  }

  // Calendar (simple placeholder)
  function renderCalendar(){
    const container = byId('calendarContainer'); if(!container) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const dayData = [];
    for(let d=1; d<=daysInMonth; d++) dayData.push({ items: [] });
    // Map helper
    function dayIndex(dateStr){
      if(!dateStr) return -1; const dt = new Date(dateStr); if(dt.getMonth()!==month || dt.getFullYear()!==year) return -1; return dt.getDate()-1; }
    // 4-week topics spans
    state.topics4Weeks.forEach(t=>{
      if(!t.startDate || !t.endDate) return;
      const s = new Date(t.startDate); const e = new Date(t.endDate);
      if(isNaN(s)||isNaN(e)) return;
      for(let d=new Date(s); d<=e; d.setDate(d.getDate()+1)){
        if(d.getMonth()===month && d.getFullYear()===year){
          dayData[d.getDate()-1].items.push({ type:'fourweek', label:t.topic, id:t.id });
        }
      }
    });
    // Upsolve attempt days
    state.upsolve.forEach(u=>{
      const idx = dayIndex(u.date); if(idx>=0){ dayData[idx].items.push({ type: u.kind==='contest' ? 'upsolve-contest':'upsolve-problem', label:u.name, id:u.id }); }
    });
    // Rating problems (if we later add a dueDate field it will appear here) placeholder
    // Render cells
    const cells = [];
    for(let i=0;i<startDay;i++) cells.push('<div></div>');
    for(let d=1; d<=daysInMonth; d++){
      const data = dayData[d-1];
      const content = data.items.map(it=> {
        let cls = 'rating';
        if(it.type==='fourweek') cls = 'fourweek';
        else if(it.type==='upsolve-contest') cls = 'upsolve-contest';
        else if(it.type==='upsolve-problem') cls = 'upsolve-problem';
        return `<span class='calendar-item ${cls}' data-cal-type='${it.type}' data-id='${it.id}'>${escapeHtml(it.label.slice(0,10))}</span>`;
      }).join('');
      cells.push(`<div class='day'><div class='date'>${d}</div>${content}</div>`);
    }
    container.innerHTML = cells.join('');
    // Legend
    const legend = byId('calendarLegend');
    if(legend){
      legend.innerHTML = `<span class='calendar-item fourweek me-2'>4W Topic</span>
        <span class='calendar-item upsolve-contest me-2'>Contest</span>
        <span class='calendar-item upsolve-problem me-2'>Problem</span>`;
    }
  }

  // Simple search across names
  function globalSearch(query){
    query = query.trim().toLowerCase();
    const results = [];
    if(!query){ byId('section-search-results').classList.add('d-none'); return; }
    const pushMatch = (type,obj,nameField='name')=>{
      if((obj[nameField]||'').toLowerCase().includes(query)) results.push({type,...obj});
    };
    state.nextMonthRating.forEach(p=> pushMatch('rating', p));
    state.nextMonthTopic.forEach(p=> pushMatch('topicProblem', p));
    state.topics4Weeks.forEach(p=> pushMatch('fourWeek', p, 'topic'));
    state.upsolve.forEach(p=> pushMatch('upsolve', p));
    const wrap = byId('searchResultsContainer'); wrap.innerHTML = results.map(r=> `<div class='col-12 col-md-6'>
      <div class='card card-sm p-2'>
        <div><strong>${escapeHtml(r.name||r.topic||'Untitled')}</strong> <span class='badge bg-secondary'>${r.type}</span></div>
        <div class='small text-truncate'><a href='${r.link||'#'}' target='_blank'>${r.link||''}</a></div>
      </div>
    </div>`).join('') || '<div class="p-2 text-muted">No matches.</div>';
    showSection('search-results');
  }

  // Escape helper
  function escapeHtml(str){
    return (str||'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  // Modal factory (simplified, just rating add for now)
  function openModal(title, bodyHtml, onSave){
    const id = 'modal'+uid();
    const modalHtml = `<div class='modal fade' id='${id}' tabindex='-1'>
      <div class='modal-dialog modal-dialog-scrollable'>
        <div class='modal-content'>
          <div class='modal-header'>
            <h5 class='modal-title'>${title}</h5>
            <button type='button' class='btn-close' data-bs-dismiss='modal'></button>
          </div>
          <div class='modal-body'>${bodyHtml}</div>
          <div class='modal-footer'>
            <button type='button' class='btn btn-secondary' data-bs-dismiss='modal'>Cancel</button>
            <button type='button' class='btn btn-primary' data-action='save'>Save</button>
          </div>
        </div>
      </div>
    </div>`;
    byId('modalContainer').insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = byId(id);
    const bsModal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', ()=> modalEl.remove());
    modalEl.querySelector('[data-action="save"]').addEventListener('click', ()=>{
      if(onSave(modalEl) !== false){ bsModal.hide(); }
    });
    bsModal.show();
    return modalEl;
  }

  function addOrEditRatingProblem(existing){
    const m = openModal(existing? 'Edit Rating Problem':'Add Rating Problem', `
      <form id='ratingForm'>
        <div class='mb-2'>
          <label class='form-label'>Name</label>
          <input type='text' name='name' class='form-control' value='${escapeHtml(existing?.name||'')}' />
        </div>
        <div class='mb-2'>
          <label class='form-label'>Link *</label>
          <input required type='url' name='link' class='form-control' value='${escapeHtml(existing?.link||'')}' />
        </div>
        <div class='mb-2'>
          <label class='form-label'>Rating</label>
          <input type='number' name='rating' class='form-control' value='${escapeHtml(existing?.rating||'')}' />
        </div>
        <div class='mb-2'>
          <label class='form-label'>Notes</label>
          <textarea name='notes' class='form-control' rows='2'>${escapeHtml(existing?.notes||'')}</textarea>
        </div>
      </form>
    `, (modal)=>{
      const form = modal.querySelector('#ratingForm');
      if(!form.reportValidity()) return false;
      const fd = new FormData(form);
      if(existing){
        Object.assign(existing, Object.fromEntries(fd.entries()));
      } else {
        state.nextMonthRating.push({ id: uid(), solved:false, ...Object.fromEntries(fd.entries()) });
      }
      saveState();
      renderRatingProblems();
      refreshStats();
    });
  }
  function addOrEditTopicProblem(existing){
    const m = openModal(existing? 'Edit Topic Problem':'Add Topic Problem', `
      <form id='topicProbForm'>
        <div class='mb-2'>
          <label class='form-label'>Name</label>
          <input type='text' name='name' class='form-control' value='${escapeHtml(existing?.name||'')}' />
        </div>
        <div class='mb-2'>
          <label class='form-label'>Link *</label>
          <input required type='url' name='link' class='form-control' value='${escapeHtml(existing?.link||'')}' />
        </div>
        <div class='mb-2'>
          <label class='form-label'>Topic</label>
          <input type='text' name='topic' class='form-control' value='${escapeHtml(existing?.topic||'')}' placeholder='DP, Graphs, ...' />
        </div>
        <div class='mb-2'>
          <label class='form-label'>Notes</label>
          <textarea name='notes' class='form-control' rows='2'>${escapeHtml(existing?.notes||'')}</textarea>
        </div>
      </form>
    `, (modal)=>{
      const form = modal.querySelector('#topicProbForm');
      if(!form.reportValidity()) return false;
      const fd = new FormData(form);
      if(existing){
        Object.assign(existing, Object.fromEntries(fd.entries()));
      } else {
        state.nextMonthTopic.push({ id: uid(), solved:false, ...Object.fromEntries(fd.entries()) });
      }
      saveState();
      renderTopicProblems();
      refreshStats();
    });
  }

  // Event Delegation
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('[data-section]');
    if(a){
      document.querySelectorAll('.nav-link[data-section]').forEach(n=> n.classList.remove('active'));
      a.classList.add('active');
      showSection(a.getAttribute('data-section'));
    }
    const jump = e.target.closest('[data-section-jump]');
    if(jump){
      const key = jump.getAttribute('data-section-jump');
      document.querySelector(`.nav-link[data-section='${key}']`)?.click();
      const tab = jump.getAttribute('data-tab');
      if(tab){
        const tabBtn = byId(tab+'-tab');
        if(tabBtn){ new bootstrap.Tab(tabBtn).show(); }
      }
    }
    const actionBtn = e.target.closest('[data-action]');
    if(actionBtn){
      const action = actionBtn.getAttribute('data-action');
      const id = actionBtn.getAttribute('data-id');
      if(action==='save') return; // handled earlier
      if(action==='edit-rating'){
        const item = state.nextMonthRating.find(p=>p.id===id); if(item) addOrEditRatingProblem(item);
      } else if(action==='delete-rating'){
        state.nextMonthRating = state.nextMonthRating.filter(p=>p.id!==id); saveState(); renderRatingProblems(); refreshStats();
      } else if(action==='edit-topicprob'){
        const item = state.nextMonthTopic.find(p=>p.id===id); if(item) addOrEditTopicProblem(item);
      } else if(action==='delete-topicprob'){
        state.nextMonthTopic = state.nextMonthTopic.filter(p=>p.id!==id); saveState(); renderTopicProblems(); refreshStats();
      } else if(action==='edit-4week'){
        const item = state.topics4Weeks.find(p=>p.id===id); if(item) open4WeekTopicModal(item);
      } else if(action==='delete-4week'){
        state.topics4Weeks = state.topics4Weeks.filter(p=>p.id!==id); saveState(); render4WeekTopics(); refreshStats();
      } else if(action==='edit-upsolve'){
        const item = state.upsolve.find(p=>p.id===id); if(item) openUpsolveModal(item);
      } else if(action==='delete-upsolve'){
        state.upsolve = state.upsolve.filter(p=>p.id!==id); saveState(); renderUpsolve(); refreshStats();
      }
    }
  });
  document.addEventListener('change', (e)=>{
    if(e.target.id==='darkModeToggle') toggleTheme();
    if(e.target.id==='ratingFilter') renderRatingProblems();
    if(e.target.id==='topicFilter') renderTopicProblems();
    if(e.target.id==='upsolveFilter') renderUpsolve();
    if(e.target.classList.contains('topic-status-select')){
      const id = e.target.getAttribute('data-id');
      const item = state.topics4Weeks.find(t=>t.id===id);
      if(item){ item.status = e.target.value; saveState(); refreshStats(); }
    }
    if(e.target.matches('[data-action="toggle-rating"]')){ const item = state.nextMonthRating.find(p=>p.id===e.target.dataset.id); if(item){ item.solved = e.target.checked; saveState(); renderRatingProblems(); }}
    if(e.target.matches('[data-action="toggle-topicprob"]')){ const item = state.nextMonthTopic.find(p=>p.id===e.target.dataset.id); if(item){ item.solved = e.target.checked; saveState(); renderTopicProblems(); }}
    if(e.target.matches('[data-action="toggle-upsolve"]')){ const item = state.upsolve.find(p=>p.id===e.target.dataset.id); if(item){ item.solved = e.target.checked; saveState(); renderUpsolve(); }}
  });
  byId('addRatingProblemBtn').addEventListener('click', ()=> addOrEditRatingProblem());
  byId('addTopicProblemBtn').addEventListener('click', ()=> addOrEditTopicProblem());
  byId('add4WeekTopicBtn').addEventListener('click', ()=> open4WeekTopicModal());
  byId('addUpsolveBtn').addEventListener('click', ()=> openUpsolveModal());
  byId('openAnalyticsBtn').addEventListener('click', openAnalytics);
  byId('globalSearch').addEventListener('input', (e)=> globalSearch(e.target.value));
  byId('exportDataBtn').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cp-tracker-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  byId('importDataInput').addEventListener('change', (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{ try { const data = JSON.parse(reader.result); state = { ...defaultData, ...data }; saveState(); renderAll(); } catch(err){ alert('Invalid file'); } };
    reader.readAsText(file);
  });

  function renderAll(){ refreshStats(); renderRatingProblems(); renderTopicProblems(); render4WeekTopics(); renderUpsolve(); renderCalendar(); }

  // Init
  loadTheme();
  showSection('dashboard');
  renderAll();
})();
