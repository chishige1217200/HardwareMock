// ===== アプリ本体(詳細スペック対応版) =====
const S = 1.15; // mm→px スケール
const mm = v => (v * S).toFixed(1) + 'px';

let build = { mb:null, cpu:null, ram:null, gpu:null, cooler:null, psu:null, case:null, storage:[] };
let currentTab = 'mb';
let searchQuery = '';

const $tabs = document.getElementById('tabs');
const $partList = document.getElementById('partList');
const $caseView = document.getElementById('caseView');
const $buildList = document.getElementById('buildList');
const $totals = document.getElementById('totals');
const $checks = document.getElementById('checks');

const g = k => build[k] ? PART_BY_ID[build[k]] : null;
const storages = () => build.storage.filter(Boolean).map(id => PART_BY_ID[id]);

// ---------- ストレージのスロット自動マッピング ----------
// NVMe → M.2スロット(表)→ 裏面M.2 の順。SATA → SATAポート/ベイ
function mapStorage() {
  const mb = g('mb');
  const map = { front:[], rear:[], sata:[], overflowNvme:[], overflowSata:[] };
  if (!mb) { storages().forEach(s => (s.stype === 'M.2 NVMe' ? map.overflowNvme : map.overflowSata).push(s)); return map; }
  const front = mb.m2.map(() => null);
  const rear = new Array(mb.rearM2).fill(null);
  storages().forEach(s => {
    if (s.stype === 'M.2 NVMe') {
      const i = front.findIndex(x => x === null);
      if (i !== -1) front[i] = s; else {
        const j = rear.findIndex(x => x === null);
        if (j !== -1) rear[j] = s; else map.overflowNvme.push(s);
      }
    } else {
      if (map.sata.length < mb.sata) map.sata.push(s); else map.overflowSata.push(s);
    }
  });
  map.front = front;
  map.rear = rear;
  return map;
}

// ---------- カタログ ----------
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

function specLine(p) {
  switch (p.cat) {
    case 'mb': {
      const pcie = p.pcie.map(s => `x${s.phys}(x${s.elec}・${s.src === 'cpu' ? 'CPU直結' : 'CSH'}・Gen${s.gen})`).join(' ');
      const m2 = p.m2.map(m => `${m.label} x${m.lanes} Gen${m.gen}`).join(' / ') + (p.rearM2 ? ` / 裏面M.2×${p.rearM2}` : '');
      return `PCIe: ${pcie}<br>M.2: ${m2}<br>SATA×${p.sata} ・ CPU電源 ${p.cpuPower}×8pin ・ CSHレーン ${p.chipsetLanes}本`;
    }
    case 'cpu': return `ソケット ${p.socket} ・ ${p.cores}C/${p.threads}T ・ TDP ${p.tdp}W(最大${p.maxPower}W)<br>PCIe: GPU x${p.lanesGpu} + M.2 x${p.lanesNvme}(CPU直結) ・ ${p.stockCooler ? '純正クーラー同梱' : 'クーラー同梱なし'}`;
    case 'ram': return `${p.type} ${p.per}GB×${p.sticks} (${p.per*p.sticks}GB) ・ ${p.speed} ・ モジュール高さ ${p.height}mm`;
    case 'gpu': return p.none ? 'CPU内蔵グラフィックスで出力' :
      `全長 ${p.length}mm ・ 厚み ${p.thickness}スロット ・ 接続 x${p.iface} ・ TDP ${p.tdp}W<br>補助電源: ${connName(p.conn)} ・ 推奨電源 ${p.psuRec}W`;
    case 'storage': return p.stype === 'M.2 NVMe'
      ? `M.2 2280 NVMe ・ ${capName(p.cap)} ・ Gen${p.gen} x4`
      : `${p.stype} ・ ${capName(p.cap)} ・ SATA接続`;
    case 'cooler': return `${p.ctype}${p.size ? ` (ラジエータ ${p.size}mm)` : ''} ・ 高さ ${p.height}mm ・ 対応TDP ${p.tdpSupport}W<br>DIMM上クリアランス ${p.ramClearance}mm ・ ${p.sockets.join('/')}`;
    case 'psu': return `${p.watt}W ・ ${p.eff} ・ ${p.modular}<br>ケーブル: 24pin×${p.cables.atx24} ・ CPU 8pin×${p.cables.eps8} ・ PCIe 8pin×${p.cables.pcie8} ・ 12VHPWR×${p.cables.hpwr} ・ SATA×${p.cables.sata}`;
    case 'case': return `対応: ${p.forms.join('/')} ・ GPU最大 ${p.gpuMax}mm ・ クーラー高さ最大 ${p.coolerMax}mm<br>水冷ラジエータ: ${p.radiators.join('/') || '不可'}mm ・ 3.5"ベイ×${p.bays35} ・ 2.5"ベイ×${p.bays25}`;
  }
  return '';
}
function connName(c) {
  if (c.t === 'none') return '不要';
  if (c.t === 'hpwr') return `12VHPWR ×${c.n}`;
  return `PCIe 8pin(6+2) ×${c.n}`;
}
function capName(cap) { return cap >= 1000 ? (cap/1000)+'TB' : cap+'GB'; }

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
    el.onclick = () => addPart(el.dataset.id);
    el.draggable = true;
    el.ondragstart = e => e.dataTransfer.setData('text/plain', el.dataset.id);
  });
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

// ---------- 追加/削除 ----------
function addPart(id) {
  const p = PART_BY_ID[id];
  if (p.cat === 'storage') {
    if (build.storage.includes(id)) return;
    if (build.storage.length >= 6) return;
    build.storage.push(id);
  } else {
    build[p.cat] = (build[p.cat] === id) ? null : id;
  }
  renderAll();
}
function removeStorage(id) {
  build.storage = build.storage.filter(x => x !== id);
  renderAll();
}
function removeSlot(cat) {
  if (cat === 'storage') return;
  build[cat] = null;
  renderAll();
}

// ---------- マザーボードのレイアウト描画 (実寸mm基準) ----------
function mbLayout(mb) {
  const [W, H] = FORM_SIZE[mb.form];
  const els = [];
  const pos = (x, y, w, h, cls, inner, title) =>
    els.push(`<div class="${cls}" style="left:${mm(x)};top:${mm(y)};width:${mm(w)};height:${mm(h)}"${title ? ` title="${title}"` : ''}>${inner}</div>`);

  // レイアウト基準点(基板に対するmm座標)
  const ioW = 40, ioH = Math.min(130, H * 0.45);
  const vrm = { x: ioW, y: 0, w: 110, h: 18 };
  const sock = { x: 88, y: 62, s: 44 };
  const ramX0 = W - 14 - (mb.memSlots - 1) * 10, ramY = 42, ramLen = Math.min(135, H - 120);
  const pcieX = 52;
  const m2W = 80, m2H = 22;
  const csH = { x: W - 95, y: H * 0.62, w: 62, h: 52 };
  const atx24 = { x: W - 12, y: ramY + ramLen + 8, w: 12, h: 55 };
  const cpuPwr = { x: ioW + 14, y: 0, w: 26, h: 10 };
  const sataX = W - 12, sataY = H - 78;

  // 基板地紋
  pos(0, 0, W, H, 'mb-plate', '');
  // レアI/O
  pos(0, 0, ioW, ioH, 'mb-io', '<span class="lbl">I/O</span>');
  // VRM
  pos(vrm.x, vrm.y, vrm.w, vrm.h, 'mb-vrm', '<span class="lbl">VRM</span>');
  // CPUソケット
  const cpu = g('cpu');
  pos(sock.x, sock.y, sock.s, sock.s, 'mb-socket' + (cpu ? ' filled' : ''),
      cpu ? `<span class="lbl">${cpu.brand === 'Intel' ? '▦' : '▩'}<br>${mb.socket}</span>` : `<span class="lbl dim">${mb.socket}</span>`,
      'CPUソケット');
  // メモリスロット
  for (let i = 0; i < mb.memSlots; i++) {
    const filled = cpu && g('ram') && i < g('ram').sticks;
    pos(ramX0 + i * 10, ramY, 7, ramLen, 'mb-dimm' + (filled ? ' filled' : ''),
        filled ? `<span class="lbl v">${g('ram').per}G</span>` : '');
  }
  // PCIeスロット
  const gpu = g('gpu');
  mb.pcie.forEach((s, i) => {
    const used = i === 0 && gpu && !gpu.none;
    const len = s.phys === 1 ? 25 : s.phys === 4 ? 51 : 89;
    const cls = 'mb-pcie' + (s.phys === 16 ? ' p16' : s.phys === 4 ? ' p4' : ' p1') + (used ? ' used' : '');
    pos(pcieX, s.y, len, 12, cls,
        `<span class="lbl">x${s.elec} <small>Gen${s.gen} ${s.src === 'cpu' ? 'CPU' : 'CSH'}</small></span>`,
        `PCIeスロット ${i+1}: 物理x${s.phys} / 電気x${s.elec} (Gen${s.gen}, ${s.src === 'cpu' ? 'CPU直結' : 'チップセット'})`);
  });
  // M.2スロット(表)
  const smap = mapStorage();
  mb.m2.forEach((m, i) => {
    const dev = smap.front[i];
    pos(m.x, m.y, m2W, m2H, 'mb-m2' + (dev ? ' filled' : '') + (m.src === 'cpu' ? ' cpu-src' : ''),
        dev ? `<span class="lbl">${dev.brand} ${capName(dev.cap)} <small>Gen${Math.min(m.gen, dev.gen)} x${m.lanes}</small></span>`
            : `<span class="lbl dim">${m.label} <small>x${m.lanes} Gen${m.gen}</small></span>`,
        `${m.label}: x${m.lanes}レーン Gen${m.gen}${m.shares != null ? ` (PCIeスロット${m.shares+1}とレーン共有)` : ''}`);
  });
  // チップセット
  pos(csH.x, csH.y, csH.w, csH.h, 'mb-cs', `<span class="lbl">${mb.chipset}<br><small>CSHレーン ${mb.chipsetLanes}</small></span>`);
  // 24pin
  pos(atx24.x, atx24.y, atx24.w, atx24.h, 'mb-atx', '<span class="lbl v">24pin</span>', 'ATX 24pin電源');
  // CPU電源コネクタ
  pos(cpuPwr.x, cpuPwr.y, cpuPwr.w, cpuPwr.h, 'mb-cpupwr' + (mb.cpuPower === 2 ? ' dual' : ''),
      `<span class="lbl">${mb.cpuPower}×8pin</span>`, `CPU電源: ${mb.cpuPower}×8pin必要`);
  // SATAポート
  pos(sataX, sataY, 12, 70, 'mb-sata', `<span class="lbl v">SATA×${mb.sata}</span>`, `SATAポート ×${mb.sata}`);

  return { W, H, els, sock, ramX0, ramY, ramLen, pcieX, m2W, m2H, smap };
}

// ---------- PCケース ビジュアル ----------
function renderCaseView() {
  const cs = g('case'), mb = g('mb'), cpu = g('cpu'), gpu = g('gpu'),
        cooler = g('cooler'), psu = g('psu'), ram = g('ram');
  const smap = mapStorage();

  const [BW, BH] = mb ? FORM_SIZE[mb.form] : FORM_SIZE['ATX'];
  const pad = 14;
  // GPUが基板幅を超えて前方(右方向)へ伸びるため、ケース幅は実寸で拡張
  const gpuSpan = (mb && gpu && !gpu.none) ? 52 - 6 + gpu.length : 0;
  const caseW = Math.max(BW + pad * 2 + 10, pad + 10 + gpuSpan + pad);
  const psuH = 86, bayH = 40;
  const caseH = BH + pad * 2 + psuH + bayH + 18;

  let html = `<div class="pc-case${cs ? '' : ' empty'}" style="width:${mm(caseW)};height:${mm(caseH)}">
    <div class="case-label">PCケース ${cs ? '✔ ' + cs.name : '(未選択) — ATX配置のガイド表示'}</div>
    <div class="case-grid">
      <div class="case-fan top"></div>`;

  // ---- マザーボード ----
  if (mb) {
    const L = mbLayout(mb);
    html += `<div class="mb-board" style="left:${mm(pad+10)};top:${mm(pad)};width:${mm(BW)};height:${mm(BH)}">` + L.els.join('');

    // クーラーのフットプリント(干渉可視化)
    if (cooler) {
      const foot = cooler.ctype === '水冷' ? 110 : cooler.ctype === '純正' ? 125 : 130;
      const cx = L.sock.x + L.sock.s / 2, cy = L.sock.y + L.sock.s / 2;
      const interference = ram && ram.height > cooler.ramClearance;
      html += `<div class="mb-cooler${interference ? ' clash' : ''}" style="left:${mm(cx - foot/2)};top:${mm(cy - foot/2)};width:${mm(foot)};height:${mm(foot)}"
        title="${cooler.name}: DIMM上クリアランス ${cooler.ramClearance}mm">
        <span class="lbl">${cooler.ctype === '水冷' ? '💧' : '❄'} ${cooler.ctype}<br><small>${cooler.height}mm</small></span></div>`;
    }
    // GPUカード(PCIeスロット1から伸びる実寸長方形)
    if (gpu && !gpu.none) {
      const gy = mb.pcie[0].y - 4, glen = gpu.length, gh = Math.max(38, gpu.thickness * 24);
      const over = cs && gpu.length > cs.gpuMax;
      html += `<div class="mb-gpu${over ? ' over' : ''}" style="left:${mm(L.pcieX - 6)};top:${mm(gy)};width:${mm(glen)};height:${mm(gh)}"
        title="${gpu.name}: 全長${gpu.length}mm・厚み${gpu.thickness}スロット・接続x${gpu.iface}">
        <span class="lbl">🎮 ${gpu.brand} ${gpu.name.replace(/^NVIDIA |^AMD |^Intel /,'')} <small>x${gpu.iface}・${gpu.length}mm</small></span>
        <span class="gpu-fan"></span></div>`;
    }
    html += `</div>`; // mb-board

    // 裏面M.2表示
    if (mb.rearM2) {
      const rearDev = smap.rear[0];
      html += `<div class="rear-m2${rearDev ? ' filled' : ''}" style="left:${mm(pad+10)};top:${mm(pad + BH - 20)}" title="基板裏面M.2スロット">
        ${rearDev ? `▪ 裏面M.2: ${rearDev.brand} ${capName(rearDev.cap)}` : '◻ 基板裏面M.2スロット'}</div>`;
    }
  } else {
    html += `<div class="mb-ghost" style="left:${mm(pad+10)};top:${mm(pad)};width:${mm(BW)};height:${mm(BH)}">
      <span>マザーボード未選択<br><small>ATX (244×305mm) ガイド</small></span></div>`;
  }

  // ---- 電源ユニット ----
  const need = psuNeeds();
  html += `<div class="psu-box${psu ? ' filled' : ''}" style="left:${mm(pad)};top:${mm(pad + BH + 10)};width:${mm(caseW - pad*2)};height:${mm(psuH)}">
    <span class="lbl">${psu ? `⚡ ${psu.brand} ${psu.watt}W (${psu.modular})` : '電源ユニット (ATX, 86mm高)'}</span>
    ${psu ? `<span class="psu-cables">24pin×${psu.cables.atx24} CPU8pin×${psu.cables.eps8} PCIe8pin×${psu.cables.pcie8} HPWR×${psu.cables.hpwr} SATA×${psu.cables.sata}</span>` : ''}
    ${psu && need.short.length ? `<span class="psu-warn">⚠ ケーブル不足: ${need.short.join(' / ')}</span>` : ''}
  </div>`;

  // ---- ドライブベイ ----
  const sataDevs = smap.sata || [];
  html += `<div class="bay-box" style="left:${mm(pad)};top:${mm(pad + BH + psuH + 14)};width:${mm(caseW - pad*2)};height:${mm(bayH)}">`;
  if (cs) {
    for (let i = 0; i < Math.max(cs.bays35, 1); i++) {
      const dev = sataDevs.filter(s => s.stype === 'HDD')[i];
      html += `<div class="bay${dev ? ' filled' : ''}" title="3.5インチベイ ${i+1}">${dev ? `💾 ${dev.brand} ${capName(dev.cap)} HDD` : `3.5" ベイ ${i+1}`}</div>`;
    }
    for (let i = 0; i < Math.max(cs.bays25, 1); i++) {
      const dev = sataDevs.filter(s => s.stype === 'SATA SSD')[i];
      html += `<div class="bay small${dev ? ' filled' : ''}" title="2.5インチベイ ${i+1}">${dev ? `💾 ${dev.brand} ${capName(dev.cap)} SSD` : `2.5"×${i+1}`}</div>`;
    }
  } else {
    html += `<span class="dim">ケース未選択 — SATAデバイス ${sataDevs.length}台</span>`;
  }
  html += `</div>`;

  // ---- 水冷ラジエータ表示 ----
  if (cooler && cooler.ctype === '水冷' && cs) {
    const fits = cs.radiators.includes(cooler.size);
    html += `<div class="radiator${fits ? '' : ' nofit'}" title="ラジエータ ${cooler.size}mm">${cooler.size}mm ラジ${fits ? '✔ 搭載位置あり' : '✖ 非対応 (' + (cs.radiators.join('/') || '水冷不可') + 'mm)'} · 💧水冷</div>`;
  }

  html += `</div></div>`; // case-grid, pc-case
  $caseView.innerHTML = html;
}

// 電源ケーブル必要数
function psuNeeds() {
  const mb = g('mb'), gpu = g('gpu'), psu = g('psu');
  const smap = mapStorage();
  const need = { atx24:1, eps8: mb ? mb.cpuPower : 1, pcie8:0, hpwr:0, sata:0 };
  if (gpu && !gpu.none) {
    if (gpu.conn.t === 'pcie8') need.pcie8 = gpu.conn.n;
    if (gpu.conn.t === 'hpwr') need.hpwr = gpu.conn.n;
  }
  need.sata = (smap.sata || []).length;
  const short = [];
  if (psu) {
    if (psu.cables.eps8 < need.eps8) short.push(`CPU 8pin ×${need.eps8 - psu.cables.eps8}`);
    if (psu.cables.pcie8 < need.pcie8) short.push(`PCIe 8pin ×${need.pcie8 - psu.cables.pcie8}`);
    if (psu.cables.hpwr < need.hpwr) short.push(`12VHPWR ×${need.hpwr - psu.cables.hpwr}`);
    if (psu.cables.sata < need.sata) short.push(`SATA電源 ×${need.sata - psu.cables.sata}`);
  }
  return { need, short };
}

// ---------- 整合性チェック ----------
function runChecks() {
  const mb = g('mb'), cpu = g('cpu'), ram = g('ram'), gpu = g('gpu'),
        cooler = g('cooler'), psu = g('psu'), cs = g('case');
  const smap = mapStorage();
  const issues = [], ok = [];

  if (mb && cpu && mb.socket !== cpu.socket)
    issues.push({lvl:'err', msg:`CPUソケット不一致: マザボ(${mb.socket}) と CPU(${cpu.socket})`});
  else if (mb && cpu) ok.push(`CPUソケット一致 (${mb.socket})`);

  if (mb && ram && mb.memType !== ram.type)
    issues.push({lvl:'err', msg:`メモリ非対応: マザボは ${mb.memType} 専用 / 選択は ${ram.type}`});
  if (mb && ram && ram.sticks > mb.memSlots)
    issues.push({lvl:'err', msg:`メモリ本数超過: ${ram.sticks}本 > DIMMスロット ${mb.memSlots}本`});
  if (mb && ram && ram.per * ram.sticks > mb.memMax)
    issues.push({lvl:'err', msg:`メモリ容量超過: ${ram.per*ram.sticks}GB > 最大 ${mb.memMax}GB`});

  // クーラー干渉
  if (cooler && ram && ram.height > cooler.ramClearance)
    issues.push({lvl:'warn', msg:`クーラーとメモリ干渉の恐れ: DIMM高さ ${ram.height}mm > クーラー下クリアランス ${cooler.ramClearance}mm`});
  if (cooler && cpu && !cooler.sockets.includes(cpu.socket))
    issues.push({lvl:'err', msg:`クーラー非対応ソケット: ${cooler.name} は ${cpu.socket} 非対応`});
  if (cooler && cpu && cooler.tdpSupport < (cpu.maxPower || cpu.tdp))
    issues.push({lvl:'warn', msg:`冷却能力不足の恐れ: CPU最大消費 ${cpu.maxPower || cpu.tdp}W > クーラー対応 ${cooler.tdpSupport}W`});
  if (cs && cooler && cooler.height > cs.coolerMax)
    issues.push({lvl:'err', msg:`クーラー高さ超過: ${cooler.height}mm > ケース上限 ${cs.coolerMax}mm`});
  if (cooler && cooler.ctype === '水冷' && cs && !cs.radiators.includes(cooler.size))
    issues.push({lvl:'err', msg:`水冷ラジエータ非搭載: ${cooler.size}mm > ケース対応 ${cs.radiators.join('/') || 'なし'}mm`});
  if (cooler && cooler.ctype === '水冷' && !cs)
    issues.push({lvl:'info', msg:'水冷クーラーにはケースのラジエータ搭載位置の確認が必要です'});
  if (cpu && !cooler) {
    if (cpu.stockCooler) issues.push({lvl:'info', msg:`${cpu.name} は純正クーラー同梱 — 追加クーラーは任意`});
    else issues.push({lvl:'err', msg:`${cpu.name} にはCPUクーラーが必要です(同梱なし)`});
  }

  // PCIe / GPU
  if (gpu && !gpu.none && mb) {
    const slot = mb.pcie[0];
    if (gpu.iface > slot.elec)
      issues.push({lvl:'warn', msg:`GPU接続帯域不足: GPUは x${gpu.iface} 必要だがスロットは電気的 x${slot.elec} (Gen${slot.gen})`});
    else if (gpu.iface < slot.elec)
      issues.push({lvl:'info', msg:`GPUは x${gpu.iface} 接続 — スロット x${slot.elec} に対し帯域は十分`});
    else ok.push(`GPU接続 x${gpu.iface} Gen${Math.min(gpu.gen || slot.gen, slot.gen)} 対応`);
    // 厚みで下のスロットを塞ぐ(スロット1段あたり約20mmピッチ)
    mb.pcie.forEach((s, i) => {
      if (i > 0 && s.y > slot.y && (s.y - slot.y) < gpu.thickness * 20)
        issues.push({lvl:'info', msg:`GPU厚み ${gpu.thickness}スロット: PCIeスロット${i+1} (x${s.elec}) は物理的に使用不可`});
    });
  }
  if (gpu && !gpu.none && cs && gpu.length > cs.gpuMax)
    issues.push({lvl:'err', msg:`GPU全長超過: ${gpu.length}mm > ケース上限 ${cs.gpuMax}mm`});
  else if (gpu && !gpu.none && cs) ok.push(`GPU搭載可能 (全長 ${gpu.length}mm / 上限 ${cs.gpuMax}mm)`);

  // M.2 / レーン共有 / CSHレーン予算
  if (mb) {
    mb.m2.forEach((m, i) => {
      const dev = smap.front[i];
      if (dev && m.shares != null) {
        const conflict = gpu && !gpu.none && m.shares === 0;
        if (conflict) issues.push({lvl:'err', msg:`レーン共有衝突: ${m.label} と PCIeスロット${m.shares+1} は同じレーンを共有`});
        else issues.push({lvl:'info', msg:`${m.label} 使用済み — PCIeスロット${m.shares+1} は自動的に無効化されます`});
      }
      if (dev && dev.gen && dev.gen < m.gen)
        issues.push({lvl:'info', msg:`${m.label} (Gen${m.gen}) に Gen${dev.gen} SSD → Gen${dev.gen} で動作`});
    });
    if (smap.overflowNvme.length)
      issues.push({lvl:'err', msg:`M.2スロット不足: NVMe ${smap.front.filter(Boolean).length + smap.rear.filter(Boolean).length + smap.overflowNvme.length}台 > 表${mb.m2.length}基 + 裏面${mb.rearM2}基`});
    if (smap.overflowSata.length)
      issues.push({lvl:'err', msg:`SATAポート不足: SATAデバイス ${smap.sata.length + smap.overflowSata.length}台 > ポート ${mb.sata}基`});
    // CSHレーン予算
    let cshUse = 0;
    mb.m2.forEach((m, i) => { if (smap.front[i] && m.src === 'chipset') cshUse += m.lanes; });
    mb.pcie.forEach((s, i) => { if (s.src === 'chipset' && !(i === 0 && gpu && !gpu.none)) cshUse += s.elec; });
    smap.rear.forEach(() => { cshUse += 4; });
    if (cshUse > mb.chipsetLanes)
      issues.push({lvl:'warn', msg:`チップセットレーン超過気味: 割当 ${cshUse}本 > ${mb.chipsetLanes}本 (下りレーン共有)`});
    else if (mb.m2.some((m,i) => smap.front[i])) ok.push(`CSHレーン割当 ${cshUse}/${mb.chipsetLanes}本`);
  }

  // SATAベイ / SATA電源
  const sataDevs = smap.sata || [];
  if (cs) {
    const hdd = sataDevs.filter(s => s.stype === 'HDD').length;
    const ssd = sataDevs.filter(s => s.stype === 'SATA SSD').length;
    if (hdd > cs.bays35) issues.push({lvl:'err', msg:`3.5"ベイ不足: HDD ${hdd}台 > ケースベイ ${cs.bays35}基`});
    if (ssd > cs.bays25) issues.push({lvl:'err', msg:`2.5"ベイ不足: SATA SSD ${ssd}台 > ケースベイ ${cs.bays25}基`});
  }

  // 電源ケーブル & 容量
  const { need, short } = psuNeeds();
  if (psu && short.length)
    issues.push({lvl:'err', msg:`電源ケーブル不足: ${short.join(' / ')} (必要: CPU8pin×${need.eps8}, PCIe8pin×${need.pcie8}, HPWR×${need.hpwr}, SATA×${need.sata})`});
  else if (psu && (need.pcie8 || need.hpwr || need.sata)) ok.push(`電源ケーブル充足 (CPU8pin×${need.eps8} 他)`);
  if (psu && gpu && !gpu.none && psu.watt < gpu.psuRec)
    issues.push({lvl:'warn', msg:`電源容量が推奨未満: ${psu.watt}W < GPU推奨 ${gpu.psuRec}W`});

  let power = 60;
  if (cpu) power += cpu.maxPower || cpu.tdp;
  if (gpu && !gpu.none) power += gpu.tdp;
  power += (smap.front.filter(Boolean).length + smap.rear.filter(Boolean).length + sataDevs.length) * 8;
  if (ram) power += 15;
  if (psu && psu.watt < power * 1.4)
    issues.push({lvl:'warn', msg:`電源に余裕なし: 見積 ${power}W×1.4=${Math.round(power*1.4)}W > ${psu.watt}W`});
  else if (psu) ok.push(`電源に余裕 (見積 ${power}W / ${psu.watt}W)`);

  if (cs && mb && !cs.forms.includes(mb.form))
    issues.push({lvl:'err', msg:`ケース非対応: ${cs.name} は ${mb.form} 非対応`});
  else if (cs && mb) ok.push(`フォームファクタ適合 (${mb.form} ${FORM_SIZE[mb.form].join('×')}mm)`);

  const any = build.mb||build.cpu||build.ram||build.gpu||build.cooler||build.psu||build.case||build.storage.length;
  if (!any) issues.push({lvl:'info', msg:'パーツをカタログから選んで構成を始めましょう'});
  else {
    const miss = [['mb','マザボ'],['cpu','CPU'],['ram','メモリ'],['psu','電源'],['case','ケース']].filter(([k]) => !build[k]).map(([,n]) => n);
    if (miss.length) issues.push({lvl:'info', msg:'未選択の必須パーツ: ' + miss.join('・')});
  }
  return { issues, ok, power, any, errCount: issues.filter(i => i.lvl === 'err').length };
}

function renderChecks() {
  const { issues, ok, any, errCount } = runChecks();
  let html = '';
  issues.forEach(i => {
    const cls = i.lvl === 'err' ? 'err' : i.lvl === 'warn' ? 'warn' : 'info';
    const icon = i.lvl === 'err' ? '✖' : i.lvl === 'warn' ? '△' : 'ℹ';
    html += `<div class="check ${cls}">${icon} ${i.msg}</div>`;
  });
  ok.forEach(m => { html += `<div class="check ok">✔ ${m}</div>`; });
  let verdict;
  if (!any) verdict = '<div class="verdict neutral">構成を開始しましょう</div>';
  else if (errCount) verdict = `<div class="verdict bad">構成NG: 非互換が ${errCount} 件あります</div>`;
  else verdict = '<div class="verdict good">構成は整合しています ✨</div>';
  $checks.innerHTML = verdict + html;
}

// ---------- 構成一覧 & 合計 ----------
function renderSummary(power) {
  const rows = [];
  CATEGORIES.forEach(c => {
    if (c.id === 'storage') {
      build.storage.forEach(id => rows.push({ c, p: PART_BY_ID[id] }));
    } else if (build[c.id]) rows.push({ c, p: PART_BY_ID[build[c.id]] });
  });

  if (!rows.length) $buildList.innerHTML = '<div class="empty-note">まだパーツがありません</div>';
  else {
    $buildList.innerHTML = rows.map(r =>
      `<div class="brow" style="--card-color:${r.c.color}">
        <span class="bcat">${r.c.name}</span>
        <span class="bname">${r.p.name}</span>
        <span class="bprice">${r.p.price === 0 ? '—' : '¥' + r.p.price.toLocaleString()}</span>
        <button class="bx" title="削除" data-cat="${r.c.id}" data-id="${r.p.id}">✕</button>
      </div>`).join('');
    $buildList.querySelectorAll('.bx').forEach(b =>
      b.onclick = () => b.dataset.cat === 'storage' ? removeStorage(b.dataset.id) : removeSlot(b.dataset.cat));
  }

  const total = rows.reduce((s, r) => s + r.p.price, 0);
  $totals.innerHTML = `
    <div class="total-row"><span>合計金額</span><strong>¥${total.toLocaleString()}</strong></div>
    <div class="total-row sub"><span>想定ピーク消費</span><span>≈ ${power}W</span></div>
    <div class="total-row sub"><span>パーツ点数</span><span>${rows.length} 点</span></div>`;
}

// ---------- ツールバー ----------
document.getElementById('btnReset').onclick = () => {
  build = { mb:null, cpu:null, ram:null, gpu:null, cooler:null, psu:null, case:null, storage:[] };
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
    if (!Array.isArray(build.storage)) build.storage = [];
    renderAll(); flash('btnLoad', '✓ 読込');
  } catch { flash('btnLoad', '読込失敗'); }
};
document.getElementById('btnRandom').onclick = () => {
  build = { mb:null, cpu:null, ram:null, gpu:null, cooler:null, psu:null, case:null, storage:[] };
  // 条件を満たす品が無ければ条件を緩めて拾う(生成失敗を防ぐ)
  const pick = (cat, ok1, ok2) => {
    ok1 = ok1 || (() => true);
    let arr = PARTS.filter(p => p.cat === cat && ok1(p));
    if (!arr.length && ok2) arr = PARTS.filter(p => p.cat === cat && ok2(p));
    if (!arr.length) arr = PARTS.filter(p => p.cat === cat);
    return arr[Math.floor(Math.random() * arr.length)];
  };
  const mb = pick('mb');
  build.mb = mb.id;
  const cpu = pick('cpu', p => p.socket === mb.socket);
  build.cpu = cpu.id;
  const ram = pick('ram', p => p.type === mb.memType && p.sticks <= mb.memSlots && p.per*p.sticks <= mb.memMax,
                          p => p.type === mb.memType);
  build.ram = ram.id;
  const cs = pick('case', p => p.forms.includes(mb.form));
  build.case = cs.id;
  const gpu = pick('gpu', p => p.none || (p.length <= cs.gpuMax && p.iface <= mb.pcie[0].elec));
  build.gpu = gpu.id;
  const cooler = pick('cooler',
    p => p.sockets.includes(cpu.socket) && p.height <= cs.coolerMax &&
      p.tdpSupport >= (cpu.maxPower || cpu.tdp) && p.ramClearance >= ram.height &&
      (p.ctype !== '水冷' || cs.radiators.includes(p.size)),
    p => p.sockets.includes(cpu.socket) && p.height <= cs.coolerMax);
  build.cooler = cooler.id;
  const psu = pick('psu',
    p => p.watt >= (gpu.psuRec || 0) && p.cables.eps8 >= mb.cpuPower &&
      p.cables.pcie8 >= (gpu.conn.t === 'pcie8' ? gpu.conn.n : 0) &&
      p.cables.hpwr >= (gpu.conn.t === 'hpwr' ? gpu.conn.n : 0));
  build.psu = psu.id;
  const nvmes = PARTS.filter(p => p.cat === 'storage' && p.stype === 'M.2 NVMe');
  build.storage.push(nvmes[Math.floor(Math.random() * nvmes.length)].id);
  const m2Total = mb.m2.length + mb.rearM2;
  if (m2Total >= 2 && Math.random() < 0.5) {
    const pool = PARTS.filter(p => p.cat === 'storage' && p.id !== build.storage[0] &&
      (p.stype !== 'M.2 NVMe' || m2Total >= 2));
    build.storage.push(pool[Math.floor(Math.random() * pool.length)].id);
  }
  renderAll();
};
function flash(id, txt) {
  const b = document.getElementById(id), old = b.textContent;
  b.textContent = txt; setTimeout(() => b.textContent = old, 900);
}

// ---------- ドラッグ&ドロップ ----------
$caseView.addEventListener('dragover', e => e.preventDefault());
$caseView.addEventListener('drop', e => {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  if (PART_BY_ID[id]) addPart(id);
});

// ---------- 再描画 ----------
function renderAll() {
  renderTabs(); renderPartList(); renderCaseView();
  const { power } = runChecks();
  renderSummary(power); renderChecks();
}
renderAll();
