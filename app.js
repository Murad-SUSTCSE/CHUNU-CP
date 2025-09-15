/* CP Tracker App - Initial Scaffold */
(function(){
  const STORAGE_KEY = 'cpTrackerDataV1';
  const ACCENT_KEY = 'cpTrackerAccent';

  const defaultData = { nextMonthRating: [], nextMonthTopic: [], topics4Weeks: [], upsolve: [] };
  let state = loadState();

  function loadState(){
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw? { ...defaultData, ...JSON.parse(raw)}: JSON.parse(JSON.stringify(defaultData)); } catch(e){ return JSON.parse(JSON.stringify(defaultData)); }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); refreshStats(); }

  // Single theme init (no toggle)
  function initTheme(){ document.documentElement.setAttribute('data-theme', 'dark'); }

  function loadAccent(){ const saved = localStorage.getItem(ACCENT_KEY); if(saved){ applyAccent(saved); const picker = byId('accentColorPicker'); if(picker) picker.value = saved; } }
  function applyAccent(hex){ const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); if(!m) return; const r=parseInt(m[1],16),g=parseInt(m[2],16),b=parseInt(m[3],16); const root=document.documentElement; root.style.setProperty('--accent', hex); root.style.setProperty('--accent-rgb', `${r},${g},${b}`); }

  const uid = () => Math.random().toString(36).slice(2,11);
  const byId = id => document.getElementById(id);

  // Section toggling layout
  function showSection(key, skipHash){
    document.querySelectorAll('.app-section').forEach(sec=>{
      if(sec.id === 'section-'+key) sec.classList.remove('d-none');
      else sec.classList.add('d-none');
    });
    const target = byId('section-'+key);
    if(target) target.scrollTop = 0;
    if(key==='dashboard') refreshStats();
  if(key==='next-month'){ renderRatingProblems(); }
    if(key==='topics-4-weeks') render4WeekTopics();
    if(key==='upsolve') renderUpsolve();
    if(key==='calendar') renderCalendar();
    if(key==='all-problems') renderAllProblems();
    if(!skipHash){ const current = location.hash.replace('#',''); if(current!==key) history.pushState({section:key}, '', '#'+key); }
  }
  window.addEventListener('popstate', ()=>{ const sec=(location.hash||'').replace('#','')||'dashboard'; showSection(sec,true); });

  function refreshStats(){
    const total= state.nextMonthRating.length + state.nextMonthTopic.length + state.upsolve.length;
    const sr= state.nextMonthRating.filter(p=>p.solved).length;
    const st= state.nextMonthTopic.filter(p=>p.solved).length;
    const su= state.upsolve.filter(p=>p.solved).length;
    const solved= sr+st+su;
    const pct = total? Math.round(solved/total*100):0;
    byId('overallSummary').textContent = `${solved}/${total} solved (${pct}%)`;
    byId('dashRatingCounts').textContent=`${sr}/${state.nextMonthRating.length} solved`;
    const dashUps = byId('dashUpsolveCounts'); if(dashUps) dashUps.textContent=`${su}/${state.upsolve.length} solved`;
    const topicsCompleted = state.topics4Weeks.filter(t=>t.status==='completed').length;
    const dash4 = byId('dash4WeekCounts'); if(dash4) dash4.textContent = `${topicsCompleted}/${state.topics4Weeks.length} completed`;
    const allCountsEl = byId('dashAllProblemsCounts');
    if(allCountsEl){
      allCountsEl.textContent = `${solved}/${total} solved`; // mirrors overall but scoped to problems
    }
    animateDonut(pct, solved, total);
  }

  // Animated donut
  let donutAnimating=false; function animateDonut(targetPct, solved, total){ const canvas=byId('progressDonut'); if(!canvas) return; const ctx=canvas.getContext('2d'); const w = canvas.width = canvas.clientWidth || 140; const h = canvas.height = 140; const cx=w/2, cy=h/2, r=Math.min(w,h)/2-10; const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#0d6efd'; const border = getComputedStyle(document.documentElement).getPropertyValue('--border').trim()||'#334'; let start=null; const duration=900; donutAnimating=true; function frame(ts){ if(!start) start=ts; const t=(ts-start)/duration; const ease = t<1? (1- Math.pow(1-t,3)):1; const pct = Math.round(targetPct*ease); ctx.clearRect(0,0,w,h); ctx.lineWidth=18; ctx.strokeStyle=border; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke(); const end = (pct/100)*Math.PI*2 - Math.PI/2; ctx.strokeStyle=accent; ctx.lineCap='round'; ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI/2,end); ctx.stroke(); ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text'); ctx.font='bold 18px system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(pct+'%', cx, cy-4); ctx.font='12px system-ui,sans-serif'; ctx.fillText(`${solved}/${total}`, cx, cy+14); if(ease<1) requestAnimationFrame(frame); else donutAnimating=false; } requestAnimationFrame(frame); }

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
    // Topic problems removed
    const topicArray = [];
    // Upsolve contest stats
    const contests = state.upsolve.filter(u=>u.kind==='contest');
    const contestStats = contests.map(c=>{
      const total = c.problems? c.problems.length:0;
      const solved = c.problems? c.problems.filter(x=>x.solved).length:0;
      return { name:c.name, platform:c.platform||'', solved, total, pct: total? Math.round(solved/total*100):0, status: c.solved };
    });
  // Study topics progress (formerly 4-week)
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
        <h6>Upsolve Contests</h6>
        ${data.contestStats.length? tableHtml(['Contest','Platform','Solved','Total','%'], data.contestStats.map(c=> [escapeHtml(c.name), escapeHtml(c.platform), c.solved, c.total, c.pct+'%'])):'<div class="text-muted small">No contests.</div>'}
      </div>
      <div class='mb-2'>
        <h6>Study Topics</h6>
        ${data.fourWeek.length? tableHtml(['Topic','Status'], data.fourWeek.map(t=> [escapeHtml(t.topic), escapeHtml(t.status)])):'<div class="text-muted small">No study topics.</div>'}
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
    const filter = byId('ratingFilter').value; // reuse same filter select
    const groups = groupTopics();
    if(groups.length===0){ wrap.innerHTML = '<div class="placeholder-empty p-3">No topic problems yet.</div>'; return; }
    wrap.innerHTML = groups.map((g,i)=>{
      const [topic, arr] = g;
      const items = arr.filter(p=> filter==='all' || (filter==='solved'?p.solved:!p.solved))
        .map(p=> `<div class='d-flex align-items-center justify-content-between py-1'>
          <div class='flex-grow-1'><input type='checkbox' data-action='toggle-topicprob' data-id='${p.id}' ${p.solved?'checked':''} class='form-check-input me-2'>
            <a href='${p.link}' target='_blank' rel='noopener' class='me-2'>${escapeHtml(p.name||'Untitled')}</a>
            <span class='badge ${p.solved?'badge-solved':'badge-unsolved'}'>${p.solved?'Solved':'Todo'}</span>
            <small class='text-muted ms-2'>${escapeHtml(p.topic||'')}</small>
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
  const m = openModal(existing? 'Edit Study Topic':'Add Study Topic', `
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
        const full = escapeHtml(it.label);
        return `<span class='calendar-item ${cls}' data-cal-type='${it.type}' data-id='${it.id}' title='${full}' aria-label='${full}'>${escapeHtml(it.label.slice(0,10))}</span>`;
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
  // topic problems removed
    state.topics4Weeks.forEach(p=> pushMatch('fourWeek', p, 'topic'));
    state.upsolve.forEach(p=> pushMatch('upsolve', p));
    const wrap = byId('searchResultsContainer'); wrap.innerHTML = results.map(r=> `<div class='col-12 col-md-6'>
      <div class='card card-sm p-2'>
        <div><strong>${escapeHtml(r.name||r.topic||'Untitled')}</strong> <span class='badge bg-secondary'>${r.type}</span></div>
        <div class='small text-truncate'><a href='${r.link||'#'}' target='_blank'>${r.link||''}</a></div>
      </div>
    </div>`).join('') || '<div class="p-2 text-muted">No matches.</div>';
  byId('section-search-results').classList.remove('d-none');
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

  function addOrEditProblemUnified(existing, forceType){
    const isTopic = forceType? forceType==='topic' : (!!existing && existing._kind==='topic');
    const problemType = existing? (existing._kind|| (existing.rating!==undefined?'rating':'topic')) : (forceType||'rating');
    const m = openModal(existing? 'Edit Problem':'Add Problem', `
      <form id='problemForm'>
        <div class='mb-2'>
          <label class='form-label'>Problem Type</label>
          <select name='ptype' id='problemTypeSelect' class='form-select form-select-sm'>
            <option value='rating' ${problemType==='rating'?'selected':''}>Rating Based</option>
            <option value='topic' ${problemType==='topic'?'selected':''}>Topic Based</option>
          </select>
        </div>
        <div class='mb-2'>
          <label class='form-label'>Name</label>
            <input type='text' name='name' class='form-control' value='${escapeHtml(existing?.name||'')}' />
        </div>
        <div class='mb-2'>
          <label class='form-label'>Link *</label>
          <input required type='url' name='link' class='form-control' value='${escapeHtml(existing?.link||'')}' />
        </div>
        <div class='mb-2 rating-field'>
          <label class='form-label'>Rating</label>
          <input type='number' name='rating' class='form-control' value='${problemType==='rating'? escapeHtml(existing?.rating||''):''}' />
        </div>
        <div class='mb-2 topic-field'>
          <label class='form-label'>Topic</label>
          <input type='text' name='topic' class='form-control' value='${problemType==='topic'? escapeHtml(existing?.topic||''):''}' placeholder='DP, Graphs, ...' />
        </div>
        <div class='mb-2'>
          <label class='form-label'>Notes</label>
          <textarea name='notes' class='form-control' rows='2'>${escapeHtml(existing?.notes||'')}</textarea>
        </div>
      </form>
    `, (modal)=>{
      const form = modal.querySelector('#problemForm');
      if(!form.reportValidity()) return false;
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      const type = data.ptype;
      if(existing){
        if(existing._kind==='rating' && type==='rating'){
          Object.assign(existing, { name:data.name, link:data.link, rating:data.rating, notes:data.notes });
        } else if(existing._kind==='topic' && type==='topic'){
          Object.assign(existing, { name:data.name, link:data.link, topic:data.topic, notes:data.notes });
        } else {
          // Moved between categories: delete old, add new
          if(existing._kind==='rating'){
            state.nextMonthRating = state.nextMonthRating.filter(p=>p.id!==existing.id);
          } else if(existing._kind==='topic'){
            state.nextMonthTopic = state.nextMonthTopic.filter(p=>p.id!==existing.id);
          }
          if(type==='rating') state.nextMonthRating.push({ id: uid(), solved: existing.solved||false, name:data.name, link:data.link, rating:data.rating, notes:data.notes, _kind:'rating' });
          else state.nextMonthTopic.push({ id: uid(), solved: existing.solved||false, name:data.name, link:data.link, topic:data.topic, notes:data.notes, _kind:'topic' });
        }
      } else {
        if(type==='rating') state.nextMonthRating.push({ id: uid(), solved:false, name:data.name, link:data.link, rating:data.rating, notes:data.notes, _kind:'rating' });
        else state.nextMonthTopic.push({ id: uid(), solved:false, name:data.name, link:data.link, topic:data.topic, notes:data.notes, _kind:'topic' });
      }
      saveState();
      renderRatingProblems();
      renderTopicProblems();
      refreshStats();
    });
    // Show/hide conditional fields
    function updateFields(){
      const sel = m.querySelector('#problemTypeSelect').value;
      m.querySelector('.rating-field').style.display = sel==='rating'? 'block':'none';
      m.querySelector('.topic-field').style.display = sel==='topic'? 'block':'none';
    }
    m.querySelector('#problemTypeSelect').addEventListener('change', updateFields);
    updateFields();
  }
  // Wrapper helpers for legacy calls (dashboard buttons, palette entries, existing edit handlers)
  function addOrEditRatingProblem(existing){
    addOrEditProblemUnified(existing, 'rating');
  }
  function addOrEditTopicProblem(existing){
    addOrEditProblemUnified(existing, 'topic');
  }
  // Topic problem add/edit removed

  // Event Delegation
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('[data-section]');
    if(a){
      const sec = a.getAttribute('data-section');
      showSection(sec);
      closeSideMenu();
    }
    const jump = e.target.closest('[data-section-jump]');
    if(jump){
      const key = jump.getAttribute('data-section-jump');
  showSection(key);
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
      } else if(action==='quick-add-rating') {
        addOrEditRatingProblem();
      } else if(action==='edit-topicprob') {
        const item = state.nextMonthTopic.find(p=>p.id===id); if(item) addOrEditTopicProblem(item);
      } else if(action==='delete-topicprob') {
        state.nextMonthTopic = state.nextMonthTopic.filter(p=>p.id!==id); saveState(); renderTopicProblems(); refreshStats();
      } else if(action==='quick-add-revision') {
        open4WeekTopicModal();
      } else if(action==='quick-add-upsolve') {
        openUpsolveModal();
      } else if(action==='edit-4week'){
        const item = state.topics4Weeks.find(p=>p.id===id); if(item) open4WeekTopicModal(item);
      } else if(action==='delete-4week'){
        state.topics4Weeks = state.topics4Weeks.filter(p=>p.id!==id); saveState(); render4WeekTopics(); refreshStats();
      } else if(action==='edit-upsolve'){
        const item = state.upsolve.find(p=>p.id===id); if(item) openUpsolveModal(item);
      } else if(action==='delete-upsolve'){
        state.upsolve = state.upsolve.filter(p=>p.id!==id); saveState(); renderUpsolve(); refreshStats();
      } else if(action==='delete-ap-rating'){
        state.nextMonthRating = state.nextMonthRating.filter(p=>p.id!==id); saveState(); renderAllProblems(); renderRatingProblems(); refreshStats();
      } else if(action==='delete-ap-topic'){
        state.nextMonthTopic = state.nextMonthTopic.filter(p=>p.id!==id); saveState(); renderAllProblems(); renderTopicProblems(); refreshStats();
      } else if(action==='delete-ap-upsolve'){
        state.upsolve = state.upsolve.filter(p=>p.id!==id); saveState(); renderAllProblems(); renderUpsolve(); refreshStats();
      }
    }
  });
  document.addEventListener('change', (e)=>{
    if(e.target.id==='darkModeToggle') toggleTheme();
    if(e.target.id==='ratingFilter') renderRatingProblems();
  // topic filter removed
    if(e.target.id==='upsolveFilter') renderUpsolve();
    if(e.target.classList.contains('topic-status-select')){
      const id = e.target.getAttribute('data-id');
      const item = state.topics4Weeks.find(t=>t.id===id);
      if(item){ item.status = e.target.value; saveState(); refreshStats(); }
    }
    if(e.target.matches('[data-action="toggle-rating"]')){ const item = state.nextMonthRating.find(p=>p.id===e.target.dataset.id); if(item){ item.solved = e.target.checked; saveState(); renderRatingProblems(); renderTopicProblems(); renderAllProblems(); }}
    if(e.target.matches('[data-action="toggle-topicprob"]')){ const item = state.nextMonthTopic.find(p=>p.id===e.target.dataset.id); if(item){ item.solved = e.target.checked; saveState(); renderTopicProblems(); renderRatingProblems(); renderAllProblems(); }}
    if(e.target.matches('[data-action="toggle-upsolve"]')){ const item = state.upsolve.find(p=>p.id===e.target.dataset.id); if(item){ item.solved = e.target.checked; saveState(); renderUpsolve(); }}
  if(e.target.matches('[data-action="toggle-ap-rating"]')){ const item = state.nextMonthRating.find(p=>p.id===e.target.dataset.id); if(item){ item.solved = e.target.checked; saveState(); renderAllProblems(); renderRatingProblems(); }}
  if(e.target.matches('[data-action="toggle-ap-topic"]')){ const item = state.nextMonthTopic.find(p=>p.id===e.target.dataset.id); if(item){ item.solved = e.target.checked; saveState(); renderAllProblems(); renderTopicProblems(); }}
  if(e.target.matches('[data-action="toggle-ap-upsolve"]')){ const item = state.upsolve.find(p=>p.id===e.target.dataset.id); if(item){ item.solved = e.target.checked; saveState(); renderAllProblems(); renderUpsolve(); }}
  if(e.target.matches('[data-action="toggle-ap-contest-problem"]')){
    // id format parentId:index
    const [parentId, idxStr] = e.target.dataset.id.split(':');
    const parent = state.upsolve.find(p=>p.id===parentId);
    const idx = parseInt(idxStr,10);
    if(parent && parent.problems && parent.problems[idx]){
      parent.problems[idx].solved = e.target.checked;
      saveState(); renderAllProblems(); renderUpsolve();
    }
  }
  });
  byId('addProblemUnifiedBtn')?.addEventListener('click', ()=> addOrEditProblemUnified());
  // Ensure menu button explicitly opens side menu
  const openMenuBtn = byId('openMenuBtn');
  if(openMenuBtn){
    openMenuBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); if(typeof openSideMenu==='function') openSideMenu(); });
  }
  byId('add4WeekTopicBtn')?.addEventListener('click', ()=> open4WeekTopicModal());
  byId('addUpsolveBtn')?.addEventListener('click', ()=> openUpsolveModal());
  const accentPicker = byId('accentColorPicker');
  if(accentPicker){
    accentPicker.addEventListener('input', (e)=>{
      const val = e.target.value; localStorage.setItem(ACCENT_KEY, val); applyAccent(val); refreshStats();
    });
  }
  byId('openAnalyticsBtn')?.addEventListener('click', openAnalytics);
  byId('globalSearch')?.addEventListener('input', (e)=> globalSearch(e.target.value));
  // High contrast toggle removed
  byId('exportDataBtn')?.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cp-tracker-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  byId('importDataInput')?.addEventListener('change', (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{ try { const data = JSON.parse(reader.result); state = { ...defaultData, ...data }; saveState(); renderAll(); } catch(err){ alert('Invalid file'); } };
    reader.readAsText(file);
  });

  // Command Palette
  function initCommandPalette(){
    if(document.getElementById('commandPalette')) return;
    const paletteHtml = `<div id='commandPalette' class='cp-overlay hidden'>
      <div class='cp-dialog'>
        <input type='text' id='cpInput' class='cp-input' placeholder='Type a command or search...' autofocus />
        <ul id='cpResults' class='cp-results'></ul>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', paletteHtml);
    const overlay = byId('commandPalette');
    const input = byId('cpInput');
    const results = byId('cpResults');
    const actions = buildPaletteActions();
    function open(){ overlay.classList.remove('hidden'); input.value=''; renderList(actions); input.focus(); document.body.classList.add('cp-open'); }
    function close(){ overlay.classList.add('hidden'); document.body.classList.remove('cp-open'); }
    function renderList(list){ results.innerHTML = list.map((a,i)=> `<li data-idx='${i}' tabindex='0'><span>${a.icon||''}</span><strong>${a.title}</strong><em>${a.desc||''}</em></li>`).join(''); }
    function filter(v){ const q=v.toLowerCase(); renderList(actions.filter(a=> a.keywords.some(k=>k.includes(q)) || a.title.toLowerCase().includes(q))); }
    input.addEventListener('input', ()=> filter(input.value));
    results.addEventListener('click', e=>{ const li=e.target.closest('li'); if(!li) return; const idx = parseInt(li.getAttribute('data-idx'),10); const act = actions[idx]; if(act){ act.run(); close(); }});
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !overlay.classList.contains('hidden')) close(); if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); open(); } });
  }
  function buildPaletteActions(){
    return [
      { title:'Go: Dashboard', desc:'Show overall progress', keywords:['dash','home'], run:()=> showSection('dashboard'), icon:'🏠' },
  { title:'Go: New Problems', desc:'Problem list', keywords:['rating','new','problems'], run:()=>{ showSection('next-month'); }, icon:'📊' },
  { title:'Go: Topics', desc:'Study topics', keywords:['topics','study'], run:()=> showSection('topics-4-weeks'), icon:'🗂️' },
      { title:'Go: Upsolve', desc:'Pending contest problems', keywords:['upsolve','contest'], run:()=> showSection('upsolve'), icon:'♻️' },
      { title:'Go: Calendar', desc:'Activity calendar', keywords:['calendar','schedule'], run:()=> showSection('calendar'), icon:'🗓️' },
      { title:'Go: All Problems', desc:'All problems aggregated', keywords:['all','aggregate','problems'], run:()=> showSection('all-problems'), icon:'🗃️' },
  { title:'Add: New Problem', desc:'Quick add form', keywords:['add','rating','problem'], run:()=> addOrEditProblemUnified(), icon:'➕' },
  { title:'Add: Topic Block', desc:'Plan study block', keywords:['add','topic','block'], run:()=> open4WeekTopicModal(), icon:'➕' },
      { title:'Add: Upsolve Entry', desc:'Add problem or contest', keywords:['add','upsolve'], run:()=> openUpsolveModal(), icon:'➕' },
      { title:'Open Analytics', desc:'View breakdown', keywords:['analytics','stats'], run:()=> openAnalytics(), icon:'📈' }
    ];
  }

  // Parallax card hover
  function initParallax(){
    const maxTilt = 10; const cards = document.querySelectorAll('.card');
    cards.forEach(card=>{
      card.addEventListener('pointermove', e=>{
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left)/r.width - .5) * 2; // -1..1
        const y = ((e.clientY - r.top)/r.height - .5) * 2;
        card.style.transform = `rotateX(${(-y*maxTilt).toFixed(2)}deg) rotateY(${(x*maxTilt).toFixed(2)}deg) translateY(-2px)`;
      });
      card.addEventListener('pointerleave', ()=>{ card.style.transform='translateY(0)'; });
    });
  }

  // Gradient heading utility
  function applyGradientHeadings(){
    document.querySelectorAll('h5.card-title, section > h5, section > h6').forEach(h=>{
      h.classList.add('grad-text');
    });
  }

  // Add supporting styles dynamically (palette overlay + command palette)
  function injectDynamicStyles(){
    if(document.getElementById('dynamicEnhanceStyles')) return;
    const css = `
    .grad-text { background:linear-gradient(90deg,var(--accent),#a07bff); -webkit-background-clip:text; color:transparent; }
    .cp-overlay { position:fixed; inset:0; backdrop-filter:blur(14px) brightness(.7); background:rgba(5,12,20,.75); display:flex; align-items:flex-start; justify-content:center; padding:120px 20px 40px; z-index:1100; }
    .cp-overlay.hidden { display:none; }
    .cp-dialog { width:100%; max-width:680px; background:linear-gradient(145deg,var(--bg-alt), var(--bg-soft)); border:1px solid var(--border); border-radius:20px; box-shadow:0 18px 60px -10px rgba(0,0,0,.6); padding:18px 18px 10px; }
    .cp-input { width:100%; background:var(--bg-soft); border:1px solid var(--border); padding:10px 14px; border-radius:12px; color:var(--text); font-size:15px; font-weight:500; outline:none; box-shadow:0 0 0 0 transparent; }
    .cp-input:focus { border-color:var(--accent); box-shadow:0 0 0 2px var(--accent-soft); }
    .cp-results { list-style:none; margin:14px 0 4px; padding:0; max-height:340px; overflow:auto; }
    .cp-results li { display:flex; gap:10px; align-items:center; padding:10px 12px; border-radius:12px; cursor:pointer; background:linear-gradient(145deg,rgba(255,255,255,.02),rgba(255,255,255,0)); border:1px solid rgba(255,255,255,.04); font-size:14px; }
    .cp-results li + li { margin-top:6px; }
    .cp-results li:hover, .cp-results li:focus { background:linear-gradient(145deg,var(--accent-soft),rgba(255,255,255,.04)); outline:none; }
    .cp-results strong { flex:1; font-weight:600; color:var(--text); }
    .cp-results em { font-style:normal; font-size:11px; letter-spacing:.5px; text-transform:uppercase; opacity:.6; }
    body.cp-open { overflow:hidden; }
    `;
    const styleEl = document.createElement('style'); styleEl.id='dynamicEnhanceStyles'; styleEl.textContent = css; document.head.appendChild(styleEl);
  }

  function renderAll(){ refreshStats(); renderRatingProblems(); render4WeekTopics(); renderUpsolve(); renderCalendar(); }

  /* All Problems Aggregation */
  function renderAllProblems(){
    const container = byId('allProblemsContainer'); if(!container) return;
    const filterSel = byId('allProblemsFilter');
    const modeRatingBtn = byId('allProblemsRatingBtn');
    const modeTopicBtn = byId('allProblemsTopicBtn');
    const mode = modeRatingBtn.classList.contains('active') ? 'rating' : 'topic';
    const filter = filterSel.value;
    if(mode==='rating'){
      container.innerHTML = buildAllProblemsRating(filter);
    } else {
      container.innerHTML = buildAllProblemsTopic(filter);
    }
  }
  function buildAllProblemsRating(filter){
    const ratingItems = state.nextMonthRating
      .filter(p=> filter==='all' || (filter==='solved'?p.solved:!p.solved))
      .map(p=> ({ type:'rating', id:p.id, name:p.name||'Untitled', link:p.link, rating:p.rating||'-', solved:p.solved }));
    if(!ratingItems.length) return '<div class="placeholder-empty p-3">No rating problems.</div>';
    const groups = {};
    ratingItems.forEach(p=>{
      let bucket = 'Unrated';
      const r = parseInt(p.rating,10);
      if(!isNaN(r)){
        const start = Math.floor(r/200)*200; bucket = start+'-'+(start+200);
      }
      (groups[bucket] = groups[bucket] || []).push(p);
    });
    const ordered = Object.entries(groups).sort((a,b)=> a[0].localeCompare(b[0]));
    if(!ordered.length) return '<div class="placeholder-empty p-3">No problems.</div>';
    return ordered.map(([label, arr],i)=>{
      const rows = arr.map(p=> `<div class='d-flex justify-content-between align-items-center py-1'>
          <div class='flex-grow-1'>
            <input type='checkbox' class='form-check-input me-2' data-action='toggle-ap-${p.type}' data-id='${p.id}'>
            ${p.type==='contest-problem'?'<span class="badge bg-secondary me-1">C</span>':''}
            <a href='${p.link}' target='_blank' rel='noopener' class='me-2'>${escapeHtml(p.name)}</a>
            <span class='badge ${p.solved?'badge-solved':'badge-unsolved'}'>${p.solved?'Solved':'Todo'}</span>
          </div>
          <div class='btn-group btn-group-sm'>
            ${p.type!=='contest-problem'?`<button class='btn btn-outline-danger' data-action='delete-ap-${p.type}' data-id='${p.id}'>Del</button>`:''}
          </div>
        </div>`).join('');
      return `<div class='accordion-item'>
        <h2 class='accordion-header'>
          <button class='accordion-button collapsed' type='button' data-bs-toggle='collapse' data-bs-target='#aprg${i}'>${escapeHtml(label)}</button>
        </h2>
        <div id='aprg${i}' class='accordion-collapse collapse'>
          <div class='accordion-body p-2'>${rows||'<em>Empty</em>'}</div>
        </div>
      </div>`;
    }).join('');
  }
  function buildAllProblemsTopic(filter){
    const groups = {};
    state.nextMonthTopic
      .filter(p=> filter==='all' || (filter==='solved'?p.solved:!p.solved))
      .forEach(p=> { const key=p.topic||'General'; (groups[key]=groups[key]||[]).push({ id:p.id, type:'topic', name:p.name||'Untitled', link:p.link, solved:p.solved }); });
    const ordered = Object.entries(groups).sort((a,b)=> a[0].localeCompare(b[0]));
    if(!ordered.length) return '<div class="placeholder-empty p-3">No topic problems.</div>';
    return ordered.map(([label, arr],i)=>{
      const rows = arr.map(p=> `<div class='d-flex justify-content-between align-items-center py-1'>
          <div class='flex-grow-1'>
            <input type='checkbox' class='form-check-input me-2' data-action='toggle-ap-${p.type}' data-id='${p.id}'>
            <a href='${p.link}' target='_blank' rel='noopener' class='me-2'>${escapeHtml(p.name)}</a>
            <span class='badge ${p.solved?'badge-solved':'badge-unsolved'}'>${p.solved?'Solved':'Todo'}</span>
          </div>
          <div class='btn-group btn-group-sm'>
            <button class='btn btn-outline-danger' data-action='delete-ap-${p.type}' data-id='${p.id}'>Del</button>
          </div>
        </div>`).join('');
      return `<div class='accordion-item'>
        <h2 class='accordion-header'>
          <button class='accordion-button collapsed' type='button' data-bs-toggle='collapse' data-bs-target='#aptt${i}'>${escapeHtml(label)}</button>
        </h2>
        <div id='aptt${i}' class='accordion-collapse collapse'>
          <div class='accordion-body p-2'>${rows||'<em>Empty</em>'}</div>
        </div>
      </div>`;
    }).join('');
  }

  // Initial enhancements after existing content loaded
  initTheme();
  loadAccent();
  injectDynamicStyles();

  const initial = (location.hash||'').replace('#','') || 'dashboard';
  showSection(initial, true);

  // Early All Problems mode listeners (in case user clicks before timeout init)
  (function(){
    const ratingBtn = document.getElementById('allProblemsRatingBtn');
    const topicBtn = document.getElementById('allProblemsTopicBtn');
    const filterSel = document.getElementById('allProblemsFilter');
    function switchMode(target){
      if(!ratingBtn || !topicBtn) return;
      if(target==='rating'){ ratingBtn.classList.add('active'); topicBtn.classList.remove('active'); }
      else { topicBtn.classList.add('active'); ratingBtn.classList.remove('active'); }
      renderAllProblems();
    }
    ratingBtn?.addEventListener('click', ()=> switchMode('rating'));
    topicBtn?.addEventListener('click', ()=> switchMode('topic'));
    filterSel?.addEventListener('change', ()=> renderAllProblems());
  })();

  setTimeout(()=>{
    document.querySelectorAll('.skeleton').forEach(s=> s.remove());
    renderAll();
    initReveal();
    initBgFx();
    initParallax();
    applyGradientHeadings();
    initCommandPalette();
    // All Problems events
    const ratingBtn = document.getElementById('allProblemsRatingBtn');
    const topicBtn = document.getElementById('allProblemsTopicBtn');
    const filterSel = document.getElementById('allProblemsFilter');
    function switchMode(target){
      if(!ratingBtn || !topicBtn) return;
      if(target==='rating'){ ratingBtn.classList.add('active'); topicBtn.classList.remove('active'); }
      else { topicBtn.classList.add('active'); ratingBtn.classList.remove('active'); }
      renderAllProblems();
    }
    ratingBtn?.addEventListener('click', ()=> switchMode('rating'));
    topicBtn?.addEventListener('click', ()=> switchMode('topic'));
    filterSel?.addEventListener('change', ()=> renderAllProblems());
    // New Problems mode toggle
    const ratingModeBtn = document.getElementById('modeRatingListBtn');
    const topicModeBtn = document.getElementById('modeTopicListBtn');
    function applyProblemMode(mode){
      const ratingWrap = document.getElementById('ratingProblemsContainer');
      const topicWrap = document.getElementById('topicProblemsContainer');
      if(mode==='rating'){ ratingModeBtn.classList.add('active'); topicModeBtn.classList.remove('active'); ratingWrap.classList.remove('d-none'); topicWrap.classList.add('d-none'); renderRatingProblems(); }
      else { topicModeBtn.classList.add('active'); ratingModeBtn.classList.remove('active'); topicWrap.classList.remove('d-none'); ratingWrap.classList.add('d-none'); renderTopicProblems(); }
    }
    ratingModeBtn?.addEventListener('click', ()=> applyProblemMode('rating'));
    topicModeBtn?.addEventListener('click', ()=> applyProblemMode('topic'));
    // Explicit side menu link listeners (in case global delegation misses)
    document.querySelectorAll('#sideMenu a.menu-link[data-section]').forEach(a=>{
      a.addEventListener('click', (e)=>{ e.preventDefault(); const sec=a.getAttribute('data-section'); if(sec) showSection(sec); closeSideMenu?.(); });
    });
  }, 150);
})();

/* Side menu logic */
(function(){
  const sideMenu = document.getElementById('sideMenu');
  const backdrop = document.getElementById('menuBackdrop');
  const openBtn = document.getElementById('openMenuBtn');
  const closeBtn = document.getElementById('closeMenuBtn');
  if(!sideMenu || !backdrop || !openBtn || !closeBtn) return;
  window.openSideMenu = function(){ sideMenu.classList.add('open'); sideMenu.classList.remove('hidden'); backdrop.classList.add('show'); backdrop.classList.remove('hidden'); sideMenu.setAttribute('aria-hidden','false'); };
  window.closeSideMenu = function(){ sideMenu.classList.remove('open'); backdrop.classList.remove('show'); sideMenu.setAttribute('aria-hidden','true'); setTimeout(()=>{ sideMenu.classList.add('hidden'); backdrop.classList.add('hidden'); }, 420); };
  openBtn.addEventListener('click', ()=> openSideMenu());
  closeBtn.addEventListener('click', ()=> closeSideMenu());
  backdrop.addEventListener('click', ()=> closeSideMenu());
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && sideMenu.classList.contains('open')) closeSideMenu(); });
  // Robust delegated handler for menu links
  sideMenu.addEventListener('click', (e)=>{
    const link = e.target.closest('a.menu-link[data-section]');
    if(link){
      e.preventDefault();
      const sec = link.getAttribute('data-section');
      if(sec) showSection(sec);
      closeSideMenu();
    }
  });
})();

/* Mini TOC behavior */
(function(){
  const toc = document.getElementById('miniToc');
  if(!toc) return;
  const links = [...toc.querySelectorAll('a[data-toc-target]')];
  const targets = links.map(l=> document.getElementById(l.getAttribute('data-toc-target'))).filter(Boolean);
  // Click -> smooth scroll
  toc.addEventListener('click', e=>{
    const a = e.target.closest('a[data-toc-target]');
    if(!a) return;
    e.preventDefault();
    const id = a.getAttribute('data-toc-target');
    const el = document.getElementById(id);
    if(el){ el.scrollIntoView({behavior:'smooth', block:'start'}); history.replaceState({},'', '#'+id); }
  });
  // Active highlight with IntersectionObserver
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        const id = en.target.id;
        links.forEach(l=> l.classList.toggle('active', l.getAttribute('data-toc-target')===id));
      }
    });
  }, { root:null, rootMargin:'-40% 0px -55% 0px', threshold:[0,0.25,0.5,1] });
  targets.forEach(t=> observer.observe(t));
})();
