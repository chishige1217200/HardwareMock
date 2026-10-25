// ===== アプリ本体 =====
const MAX_STORAGE_SLOTS = 3;

// 構成状態: カテゴリ -> パーツID (storage は配列)
let build = { mb:null, cpu:null, ram:null, gpu:null, cooler:null, psu:null, case:null, storage:[null,null,null] };
let currentTab = 'mb';
let searchQuery = '';

const $tabs = document.getElementById('tabs');
const $partList = document.getElementById('partList');
const $caseView = document.getElementById('caseView');
const $buildList = document.getElementById('buildList');
const $totals = document.getElementById('totals');
const $checks = document.getElementById('checks');

// ---------- カタログ(タブ + パーツ一覧) ----------
function renderTabs() {
  $tabs.innerHTML = '';
  CATEGORIES.forEach(c => {
    const b = document.createElement('button');
    b.className = 'tab' + (c.id === currentTab ? ' active' : '');
    b.style.setProperty('--tab-color', c.color);
    b.textContent = c.name;
    b.onclick = () => { currentTab = c.id; renderTabs(); renderPartList(); };
    $tabs.appendChild(b);
  });
}

function isSelected(p) {
  if (p.cat === 'storage') return build.storage.includes(p.id);
  return build[p.cat] === p.id;
}

function renderPartList() {
  const cat = CAT_BY_ID[currentTab];
  const q = searchQuery.toLowerCase();
  const parts = PARTS.filter(p => p.cat === currentTab &&
    (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)));

  let html = `<div class="cat-head"><span class="cat-dot" style="background:${cat.color}"></span>${cat.name} <small>(${parts.length}件)</small></div>`;
  html += `<input id="search" type="search" placeholder="検索: 名前・ブランド…" value="${searchQuery.replace(/"/g,'&quot;')}">`;
  html += '<div class="cards">' + parts.map(cardHtml).join('') + '</div>';
  $partList.innerHTML = html;

  const $search = document.getElementById('search');
  $search.oninput = () => { searchQuery = $search.value; renderPartList(); document.getElementById('search').focus(); };

  $partList.querySelectorAll('.card').forEach(el => {
    const id = el.dataset.id;
    el.onclick = () => { addPart(id); };
    el.draggable = true;
    el.ondragstart = e => { e.dataTransfer.setData('text/plain', id); };
  });
}

function specLine(p) {
  switch (p.cat) {
    case 'mb': return `ソケット ${p.socket} ・ ${p.chipset} ・ ${p.form} ・ ${p.memType} ×${p.memSlots} ・ M.2 ×${p.m2}`;
    case 'cpu': return `ソケット ${p.socket} ・ ${p.cores}コア/${p.threads}スレッド ・ TDP ${p.tdp}W ・ 内蔵GPUあり`;
    case 'ram': return `${p.type} ${p.per}GB×${p.sticks} (${p.per*p.sticks}GB) ・ ${p.speed}`;
    case 'gpu': return p.none ? 'CPU内蔵グラフィックスで出力' : `全長 ${p.length}mm ・ TDP ${p.tdp}W ・ 推奨電源 ${p.psuRec}W`;
    case 'storage': return `${p.stype} ・ ${p.cap >= 1000 ? (p.cap/1000)+'TB' : p.cap+'GB'}`;
    case 'cooler': return `${p.ctype} ・ 高さ ${p.height}mm ・ 対応TDP ${p.tdpSupport}W ・ ${p.sockets.join('/')}`;
    case 'psu': return `${p.watt}W ・ ${p.eff}`;
    case 'case': return `対応: ${p.forms.join('/')} ・ GPU最大 ${p.gpuMax}mm ・ クーラー高さ最大 ${p.coolerMax}mm`;
  }
  return '';
}

function cardHtml(p) {
  const cat = CAT_BY_ID[p.cat];
  const sel = isSelected(p);
  return `<div class="card${sel ? ' selected' : ''}" data-id="${p.id}" style="--card-color:${cat.color}">
    <div class="card-brand">${p.brand}</div>
    <div class="card-name">${p.name}</div>
    <div class="card-spec">${specLine(p)}</div>
    <div class="card-price">${p.price === 0 ? '無料' : '¥' + p.price.toLocaleString()}</div>
    ${sel ? '<div class="card-badge">✓ 構成中</div>' : ''}
  </div>`;
}

// ---------- 構成への追加/削除 ----------
function addPart(id) {
  const p = PART_BY_ID[id];
  if (p.cat === 'storage') {
    if (build.storage.includes(id)) return;
    const idx = build.storage.indexOf(null);
    if (idx === -1) return; // スロット満杯
    build.storage[idx] = id;
  } else {
    build[p.cat] = (build[p.cat] === id) ? null : id;
  }
  renderAll();
}

function removeSlot(cat, idx) {
  if (cat === 'storage') build.storage[idx] = null;
  else build[cat] = null;
  renderAll();
}

// ---------- ビジュアル(ケース内の配置図) ----------
function renderCaseView() {
  const cs = build.case ? PART_BY_ID[build.case] : null;
  const mb = build.mb ? PART_BY_ID[build.mb] : null;
  const cpu = build.cpu ? PART_BY_ID[build.cpu] : null;
  const cooler = build.cooler ? PART_BY_ID[build.cooler] : null;
  const ram = build.ram ? PART_BY_ID[build.ram] : null;
  const gpu = build.gpu ? PART_BY_ID[build.gpu] : null;
  const psu = build.psu ? PART_BY_ID[build.psu] : null;

  const formClass = mb ? ' form-' + mb.form.replace(/[^A-Za-z]/g,'') : '';
  const gpuLenClass = gpu && !gpu.none ? ' gpu-len-' + (gpu.length > 300 ? 'xl' : gpu.length > 260 ? 'l' : 'm') : '';

  let html = `<div class="pc-case${cs ? '' : ' empty'}"${cs ? ` title="${cs.name}"` : ''}>
    <div class="case-label">PCケース ${cs ? '✔ ' + cs.name : '(未選択)'}</div>
    <div class="case-inner">`;

  // 電源 (下部)
  html += `<div class="slot psu-slot${psu ? ' filled' : ''}" data-cat="psu" data-idx="0"
      style="${psu ? 'background:repeating-linear-gradient(45deg,#d4a01722,#d4a01722 8px,transparent 8px,transparent 16px)' : ''}">
      ${psu ? `<span class="slot-txt">⚡ ${psu.watt}W ${psu.brand}</span>` : '<span class="slot-txt dim">電源ユニット</span>'}
    </div>`;

  // マザーボード領域
  html += `<div class="mb-area${formClass}${mb ? ' filled' : ''}">
      <div class="slot mb-slot${mb ? ' filled' : ''}" data-cat="mb" data-idx="0">
        ${mb ? `<span class="slot-txt">🧩 ${mb.brand} ${mb.chipset} (${mb.form})</span>` : '<span class="slot-txt dim">マザーボード</span>'}
      </div>`;

  if (mb) {
    // CPUソケット + クーラー
    const onTop = cooler && cooler.ctype !== '純正';
    html += `<div class="socket-box">
        <div class="slot cpu-slot${cpu ? ' filled' : ''}" data-cat="cpu" data-idx="0">
          ${cpu ? `<span class="slot-txt">🧠 ${cpu.brand}<br>${cpu.cores}C</span>` : '<span class="slot-txt dim">CPU</span>'}
        </div>
        <div class="slot cooler-slot${cooler ? ' filled' : ''}" data-cat="cooler" data-idx="0">
          ${cooler ? `<span class="slot-txt">${onTop ? '❄' : '▢'} ${cooler.ctype}</span>` : '<span class="slot-txt dim">クーラー</span>'}
        </div>
      </div>`;
    // メモリスロット
    const sticks = ram ? ram.sticks : 0;
    html += `<div class="ram-rack">`;
    for (let i = 0; i < mb.memSlots; i++) {
      const filled = ram && i < sticks;
      html += `<div class="slot ram-slot${filled ? ' filled' : ''}" data-cat="ram" data-idx="${i}">
          ${filled ? `<span class="slot-txt v">▮ ${ram.per}GB</span>` : '<span class="slot-txt dim v">DIMM</span>'}
        </div>`;
    }
    html += `</div>`;
    // M.2スロット
    html += `<div class="m2-rack">`;
    for (let i = 0; i < mb.m2; i++) {
      const sid = build.storage[i];
      const sp = sid ? PART_BY_ID[sid] : null;
      const isM2 = sp && sp.stype === 'M.2 NVMe';
      html += `<div class="slot m2-slot${isM2 ? ' filled' : ''}" data-cat="storage" data-idx="${i}">
          ${isM2 ? `<span class="slot-txt">▪ ${sp.brand} ${sp.cap >= 1000 ? sp.cap/1000+'TB' : sp.cap+'GB'} NVMe</span>` : `<span class="slot-txt dim">M.2 スロット ${i+1}</span>`}
        </div>`;
    }
    html += `</div>`;
  }
  html += `</div>`; // mb-area

  // GPU (マザボ横/下段に横長カード)
  if (gpu && !gpu.none) {
    html += `<div class="slot gpu-slot filled${gpuLenClass}" data-cat="gpu" data-idx="0">
        <span class="slot-txt">🎮 ${gpu.brand} ${gpu.name.replace(/^NVIDIA |^AMD |^Intel /,'')} <small>(${gpu.length}mm)</small></span>
      </div>`;
  } else {
    html += `<div class="slot gpu-slot${gpu && gpu.none ? ' filled igpu' : ''}" data-cat="gpu" data-idx="0">
        <span class="slot-txt ${gpu && gpu.none ? '' : 'dim'}">${gpu && gpu.none ? '🖥 内蔵GPUで出力' : 'グラフィックスカード'}</span>
      </div>`;
  }

  // ストレージベイ (SATA/HDD 用 + 余り)
  html += `<div class="bay-rack">`;
  for (let i = 0; i < MAX_STORAGE_SLOTS; i++) {
    const sid = build.storage[i];
    const sp = sid ? PART_BY_ID[sid] : null;
    const inBay = sp && sp.stype !== 'M.2 NVMe';
    html += `<div class="slot bay-slot${inBay ? ' filled' : ''}" data-cat="storage" data-idx="${i}">
        ${inBay ? `<span class="slot-txt">💾 ${sp.brand} ${sp.cap >= 1000 ? sp.cap/1000+'TB' : sp.cap+'GB'} ${sp.stype}</span>` : `<span class="slot-txt dim">ベイ ${i+1}</span>`}
      </div>`;
    if (sp && sp.stype === 'M.2 NVMe' && mb && i >= mb.m2) {
      // M.2がスロット超過 → 警告表示
      html += `<div class="slot bay-slot filled warn" data-cat="storage" data-idx="${i}"><span class="slot-txt">⚠ M.2 ${sp.brand} (スロット超過)</span></div>`;
    }
  }
  html += `</div>`;

  html += `</div></div>`; // case-inner, pc-case
  $caseView.innerHTML = html;

  $caseView.querySelectorAll('.slot').forEach(el => {
    el.onclick = () => {
      const cat = el.dataset.cat, idx = +el.dataset.idx;
      if (cat === 'storage') {
        if (build.storage[idx]) removeSlot(cat, idx);
      } else {
        if (build[cat]) removeSlot(cat, 0);
      }
    };
    el.ondragover = e => e.preventDefault();
    el.ondrop = e => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      const p = PART_BY_ID[id];
      if (!p) return;
      if (p.cat !== el.dataset.cat) return;
      if (p.cat === 'storage') {
        if (!build.storage.includes(id)) {
          const cur = build.storage[+el.dataset.idx];
          if (cur) build.storage[+el.dataset.idx] = id;
          else addPart(id);
        }
      } else {
        build[p.cat] = id;
      }
      renderAll();
    };
  });
}

// ---------- 整合性チェック ----------
function runChecks() {
  const g = k => build[k] ? PART_BY_ID[build[k]] : null;
  const mb = g('mb'), cpu = g('cpu'), ram = g('ram'), gpu = g('gpu'),
        cooler = g('cooler'), psu = g('psu'), cs = g('case');
  const storages = build.storage.filter(Boolean).map(id => PART_BY_ID[id]);
  const issues = [];
  const ok = [];

  if (mb && cpu && mb.socket !== cpu.socket)
    issues.push({lvl:'err', msg:`CPUソケット不一致: マザボ(${mb.socket}) と CPU(${cpu.socket})`});
  else if (mb && cpu) ok.push(`CPUソケット一致 (${mb.socket})`);

  if (mb && ram && mb.memType !== ram.type)
    issues.push({lvl:'err', msg:`メモリ不対応: マザボは ${mb.memType} 専用 / 選択メモリは ${ram.type}`});
  else if (mb && ram) ok.push(`メモリ種別一致 (${ram.type})`);

  if (mb && ram && ram.sticks > mb.memSlots)
    issues.push({lvl:'err', msg:`メモリ本数超過: ${ram.sticks}本 > マザボスロット ${mb.memSlots}本`});
  if (mb && ram && ram.per * ram.sticks > mb.memMax)
    issues.push({lvl:'err', msg:`メモリ容量超過: ${ram.per*ram.sticks}GB > マザボ最大 ${mb.memMax}GB`});

  if (cs && mb && !cs.forms.includes(mb.form))
    issues.push({lvl:'err', msg:`ケース非対応: ${cs.name} は ${mb.form} 非対応 (対応: ${cs.forms.join('/')})`});
  else if (cs && mb) ok.push(`フォームファクタ適合 (${mb.form})`);

  if (cs && gpu && !gpu.none && gpu.length > cs.gpuMax)
    issues.push({lvl:'err', msg:`GPU全長超過: ${gpu.length}mm > ケース上限 ${cs.gpuMax}mm`});
  else if (cs && gpu && !gpu.none) ok.push(`GPU搭載可能 (残り ${cs.gpuMax - gpu.length}mm)`);

  if (cs && cooler && cooler.height > cs.coolerMax)
    issues.push({lvl:'err', msg:`クーラー高さ超過: ${cooler.height}mm > ケース上限 ${cs.coolerMax}mm`});
  else if (cs && cooler) ok.push(`クーラー高さ適合 (残り ${cs.coolerMax - cooler.height}mm)`);

  if (cooler && cpu && !cooler.sockets.includes(cpu.socket))
    issues.push({lvl:'err', msg:`クーラー非対応ソケット: ${cooler.name} は ${cpu.socket} 非対応`});
  if (cooler && cpu && cooler.tdpSupport < cpu.tdp)
    issues.push({lvl:'warn', msg:`冷却能力不足の恐れ: CPU TDP ${cpu.tdp}W > クーラー対応 ${cooler.tdpSupport}W`});

  const m2count = storages.filter(s => s.stype === 'M.2 NVMe').length;
  if (mb && m2count > mb.m2)
    issues.push({lvl:'err', msg:`M.2スロット超過: M.2 SSD ${m2count}本 > マザボ M.2 ×${mb.m2}`});

  // 消費電力見積り
  let power = 60; // ベース(マザボ・ファン等)
  if (cpu) power += cpu.tdp;
  if (gpu && !gpu.none) power += gpu.tdp;
  power += storages.length * 8;
  if (ram) power += 15;

  if (psu && gpu && !gpu.none && psu.watt < gpu.psuRec)
    issues.push({lvl:'warn', msg:`電源容量が推奨未満: ${psu.watt}W < GPU推奨 ${gpu.psuRec}W`});
  if (psu && psu.watt < power * 1.4)
    issues.push({lvl:'warn', msg:`電源に余裕なし: 見積消費 ${power}W ×1.4 = ${Math.round(power*1.4)}W > ${psu.watt}W`});
  else if (psu) ok.push(`電源に余裕 (見積消費 ${power}W / ${psu.watt}W)`);

  const filled = ['mb','cpu','ram','psu','case'].filter(k => build[k]).length +
                 (build.gpu ? 1 : 0) + storages.length + (build.cooler ? 1 : 0);
  if (filled === 0) issues.push({lvl:'info', msg:'パーツをカタログから選んで構成を始めましょう'});
  else if (!mb || !cpu || !ram || !psu || !cs)
    issues.push({lvl:'info', msg:'必須パーツ: マザボ・CPU・メモリ・電源・ケース' +
      (mb?' ✓':'') + (cpu?' ✓':'') + (ram?' ✓':'') + (psu?' ✓':'') + (cs?' ✓':'')});

  return { issues, ok, power };
}

function renderChecks(power) {
  const { issues, ok } = runChecks();
  let html = '';
  issues.forEach(i => {
    const cls = i.lvl === 'err' ? 'err' : i.lvl === 'warn' ? 'warn' : 'info';
    const icon = i.lvl === 'err' ? '✖' : i.lvl === 'warn' ? '△' : 'ℹ';
    html += `<div class="check ${cls}">${icon} ${i.msg}</div>`;
  });
  ok.forEach(m => { html += `<div class="check ok">✔ ${m}</div>`; });
  const errCount = issues.filter(i => i.lvl === 'err').length;
  const verdict = errCount ? `<div class="verdict bad">構成NG: 非互換が ${errCount} 件あります</div>`
    : `<div class="verdict good">構成は整合しています ✨</div>`;
  $checks.innerHTML = verdict + html;
}

// ---------- 構成一覧 & 合計 ----------
function renderSummary(power) {
  const rows = [];
  CATEGORIES.forEach(c => {
    if (c.id === 'storage') {
      build.storage.forEach((id, i) => {
        if (id) rows.push({ c, p: PART_BY_ID[id], idx: i });
      });
    } else if (build[c.id]) {
      rows.push({ c, p: PART_BY_ID[build[c.id]], idx: 0 });
    }
  });

  if (!rows.length) {
    $buildList.innerHTML = '<div class="empty-note">まだパーツがありません</div>';
  } else {
    $buildList.innerHTML = rows.map(r =>
      `<div class="brow" style="--card-color:${r.c.color}">
        <span class="bcat">${r.c.name}</span>
        <span class="bname">${r.p.name}</span>
        <span class="bprice">${r.p.price === 0 ? '—' : '¥' + r.p.price.toLocaleString()}</span>
        <button class="bx" title="削除" data-cat="${r.c.id}" data-idx="${r.idx}">✕</button>
      </div>`).join('');
    $buildList.querySelectorAll('.bx').forEach(b =>
      b.onclick = () => removeSlot(b.dataset.cat, +b.dataset.idx));
  }

  const total = rows.reduce((s, r) => s + r.p.price, 0);
  $totals.innerHTML = `
    <div class="total-row"><span>合計金額</span><strong>¥${total.toLocaleString()}</strong></div>
    <div class="total-row sub"><span>想定消費電力</span><span>≈ ${power}W</span></div>
    <div class="total-row sub"><span>パーツ点数</span><span>${rows.length} 点</span></div>`;
}

// ---------- ツールバー ----------
document.getElementById('btnReset').onclick = () => {
  build = { mb:null, cpu:null, ram:null, gpu:null, cooler:null, psu:null, case:null, storage:[null,null,null] };
  renderAll();
};

document.getElementById('btnSave').onclick = () => {
  localStorage.setItem('hardwareMockBuild', JSON.stringify(build));
  flash('btnSave', '✓ 保存');
};

document.getElementById('btnLoad').onclick = () => {
  const raw = localStorage.getItem('hardwareMockBuild');
  if (!raw) { flash('btnLoad', '保存なし'); return; }
  try {
    const b = JSON.parse(raw);
    build = { ...build, ...b };
    if (!Array.isArray(build.storage) || build.storage.length !== 3)
      build.storage = [null,null,null];
    renderAll();
    flash('btnLoad', '✓ 読込');
  } catch { flash('btnLoad', '読込失敗'); }
};

document.getElementById('btnRandom').onclick = () => {
  // 整合性の取れた構成をランダム生成
  build = { mb:null, cpu:null, ram:null, gpu:null, cooler:null, psu:null, case:null, storage:[null,null,null] };
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const mb = pick(PARTS.filter(p => p.cat === 'mb'));
  build.mb = mb.id;
  const cpu = pick(PARTS.filter(p => p.cat === 'cpu' && p.socket === mb.socket));
  build.cpu = cpu.id;
  const ram = pick(PARTS.filter(p => p.cat === 'ram' && p.type === mb.memType && p.sticks <= mb.memSlots && p.per*p.sticks <= mb.memMax));
  build.ram = ram.id;
  const cs = pick(PARTS.filter(p => p.cat === 'case' && p.forms.includes(mb.form)));
  build.case = cs.id;
  const gpu = pick(PARTS.filter(p => p.cat === 'gpu' && (p.none || p.length <= cs.gpuMax)));
  build.gpu = gpu.id;
  const cooler = pick(PARTS.filter(p => p.cat === 'cooler' && p.sockets.includes(cpu.socket) && p.height <= cs.coolerMax && p.tdpSupport >= cpu.tdp));
  build.cooler = cooler.id;
  const psu = pick(PARTS.filter(p => p.cat === 'psu' && p.watt >= (gpu.psuRec || 0) && p.watt >= 550));
  build.psu = psu.id;
  const st = pick(PARTS.filter(p => p.cat === 'storage' && p.stype === 'M.2 NVMe'));
  build.storage[0] = st.id;
  if (mb.m2 >= 2 && Math.random() < 0.5) {
    const st2 = pick(PARTS.filter(p => p.cat === 'storage' && p.id !== st.id));
    build.storage[1] = st2.id;
  }
  renderAll();
};

function flash(id, txt) {
  const b = document.getElementById(id);
  const old = b.textContent;
  b.textContent = txt;
  setTimeout(() => b.textContent = old, 900);
}

// ---------- 全体再描画 ----------
function renderAll() {
  renderTabs();
  renderPartList();
  renderCaseView();
  const { power } = runChecks();
  renderSummary(power);
  renderChecks(power);
}

renderAll();
