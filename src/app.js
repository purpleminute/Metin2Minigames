import {
  COLORS, OKEY_DECK, adviseOkey, formatCards,
  adviseKing, KING_COUNTS, formatPercent,
  adviseYut, YUT_POSITIONS, labelYutPosition,
  initialSeerBelief, adviseSeer, updateSeerBelief,
  FISH_SHAPES, adviseFish, applyFishMove, countFilled, fishMaskAt
} from "./engines.js";

const GAME_META = {
  okey: { title: "Okey Card Game", source: "https://de-wiki.metin2.gameforge.com/index.php/Okey-Karten-Spiel" },
  king: { title: "Catch the King", source: "https://de-wiki.metin2.gameforge.com/index.php/Schnapp_den_K%C3%B6nig" },
  yut: { title: "Yutnori", source: "https://de-wiki.metin2.gameforge.com/index.php/Yutnori" },
  seer: { title: "Duel of the Seers", source: "https://de-wiki.metin2.gameforge.com/index.php/Seherwettstreit" },
  fish: { title: "Fish Puzzle", source: "https://de-wiki.metin2.gameforge.com/index.php/Fischpuzzlespiel" }
};

const DEFAULT_STATE = {
  active: "okey",
  okey: { statuses: {}, score: 0, target: 400 },
  king: { cells: Array.from({ length: 25 }, () => ({})), currentCard: "1", selected: 0 },
  yut: { player: ["start", "start"], cpu: ["start", "start"], roll: 1, movesLeft: 20 },
  seer: { ownMask: 0x1ff, belief: initialSeerBelief(), color: "black", objective: "wins", history: [], selected: null },
  fish: { board: 0, attempts: 0, shapeId: null, history: [] }
};

function cloneDefault() { return structuredClone(DEFAULT_STATE); }
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("m2-oracle-state"));
    if (!saved) return cloneDefault();
    return {
      ...cloneDefault(), ...saved,
      okey: { ...DEFAULT_STATE.okey, ...saved.okey },
      king: { ...DEFAULT_STATE.king, ...saved.king, cells: saved.king?.cells?.length === 25 ? saved.king.cells : cloneDefault().king.cells },
      yut: { ...DEFAULT_STATE.yut, ...saved.yut },
      seer: { ...DEFAULT_STATE.seer, ...saved.seer },
      fish: { ...DEFAULT_STATE.fish, ...saved.fish }
    };
  } catch { return cloneDefault(); }
}

let state = loadState();
const root = document.querySelector("#game-root");
const toast = document.querySelector("#toast");
const rulesDialog = document.querySelector("#rules-dialog");

function save() { localStorage.setItem("m2-oracle-state", JSON.stringify(state)); }
function commit(render = true) { save(); if (render) renderActive(); }
function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function bind(selector, event, handler) {
  root.querySelectorAll(selector).forEach(element => element.addEventListener(event, handler));
}

function metric(label, value) { return `<div class="metric"><b>${value}</b><small>${label}</small></div>`; }
function bar(value) { return `<div class="prob-bar"><i style="width:${Math.max(0, Math.min(100, value * 100))}%"></i></div>`; }

function renderActive() {
  const meta = GAME_META[state.active];
  document.querySelector("#page-title").textContent = meta.title;
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.game === state.active));
  ({ okey: renderOkey, king: renderKing, yut: renderYut, seer: renderSeer, fish: renderFish })[state.active]();
}

function renderAdvice(advice, metrics = "", ranks = "") {
  const label = advice.kind === "error" ? "State check" : advice.kind === "done" ? "Complete" : "Best next move";
  return `<aside class="panel advice-panel">
    <div class="recommendation">
      <span class="tag">${label}</span>
      <h2>${advice.title}</h2>
      <p>${advice.detail || ""}</p>
      ${metrics ? `<div class="metric-grid">${metrics}</div>` : ""}
      ${ranks ? `<div class="rank-list">${ranks}</div>` : ""}
    </div>
  </aside>`;
}

function renderOkey() {
  const s = state.okey;
  const hand = OKEY_DECK.filter(card => s.statuses[card.id] === 1);
  const usedIds = OKEY_DECK.filter(card => s.statuses[card.id] === 2).map(card => card.id);
  const advice = adviseOkey({ hand, usedIds, score: Number(s.score), target: Number(s.target) });
  const groups = COLORS.map(color => {
    const cards = OKEY_DECK.filter(card => card.color === color).map(card => {
      const status = s.statuses[card.id] || 0;
      const label = status === 1 ? "hand" : status === 2 ? "used" : "unseen";
      return `<button class="okey-card ${color} ${status === 1 ? "in-hand" : status === 2 ? "used" : ""}" data-card="${card.id}" data-status="${label}" aria-label="${color} ${card.value}, ${label}">${card.value}</button>`;
    }).join("");
    return `<div class="palette-group"><div class="palette-name"><i class="color-dot" style="background:var(--${color})"></i>${color}</div><div class="card-palette">${cards}</div></div>`;
  }).join("");
  const ranks = advice.alternatives?.map((item, i) => `<div class="rank-row"><span class="rank">${i + 2}</span><span>${item.kind === "play" ? "Play" : "Discard"} ${formatCards(item.cards)}</span><small>${item.kind === "play" ? `+${item.immediate}` : "hold"}</small></div>`).join("") || "";
  const metrics = advice.kind === "empty" ? "" : metric("Immediate points", `+${advice.immediate || 0}`) + metric("Unseen cards", advice.remaining ?? 24);
  root.innerHTML = `<div class="game-layout">
    <section class="panel">
      <div class="panel-head"><div><h2>Track the 24-card deck</h2><p>Click: unseen → in hand → used</p></div><span>${hand.length}/5 in hand</span></div>
      <div class="panel-body">
        <div class="control-row">
          <div class="field"><label for="okey-score">Current score</label><input id="okey-score" type="number" min="0" step="10" value="${s.score}"></div>
          <div class="field"><label for="okey-target">Target</label><select id="okey-target"><option value="300" ${s.target == 300 ? "selected" : ""}>Silver · 300</option><option value="400" ${s.target == 400 ? "selected" : ""}>Gold · 400</option></select></div>
        </div>
        <div class="divider"></div>
        <p class="section-label">All cards <span>R/B/Y × values 1–8</span></p>
        ${groups}
        <div class="divider"></div>
        <div class="notice"><strong>Scoring:</strong> triples score 20–90; mixed runs score 10–60; same-color runs score 50–100. The recommendation enumerates every legal set and every next draw when tractable.</div>
      </div>
    </section>
    ${renderAdvice(advice, metrics, ranks)}
  </div>`;
  bind("[data-card]", "click", event => {
    const id = event.currentTarget.dataset.card;
    const current = s.statuses[id] || 0;
    if (current === 0 && hand.length >= 5) { notify("A hand can contain at most five cards."); return; }
    s.statuses[id] = (current + 1) % 3;
    commit();
  });
  root.querySelector("#okey-score").addEventListener("change", e => { s.score = Math.max(0, Number(e.target.value) || 0); commit(); });
  root.querySelector("#okey-target").addEventListener("change", e => { s.target = Number(e.target.value); commit(); });
}

function kingCellLabel(cell) {
  if (cell.value) return cell.value;
  if (cell.min) return `>${cell.min}`;
  return "?";
}

function renderKing() {
  const s = state.king;
  const advice = adviseKing({ cells: s.cells, currentCard: s.currentCard });
  const board = s.cells.map((cell, index) => {
    const coord = `${String.fromCharCode(65 + index % 5)}${Math.floor(index / 5) + 1}`;
    return `<button class="king-cell ${cell.value ? "revealed" : ""} ${s.selected === index ? "selected" : ""} ${advice.index === index ? "recommended" : ""}" data-index="${index}" aria-label="${coord}, ${kingCellLabel(cell)}"><span class="coord">${coord}</span>${kingCellLabel(cell)}${cell.glow === true ? `<span class="clue">✦</span>` : cell.glow === false ? `<span class="clue">○</span>` : ""}</button>`;
  }).join("");
  const selected = s.cells[s.selected] || {};
  const values = ["", "1", "2", "3", "4", "5", "K"].map(value => `<button data-value="${value}" class="${(selected.value || "") === value ? "active" : ""}">${value || "Unknown"}</button>`).join("");
  const misses = ["", "1", "2", "3", "4", "5"].map(value => `<button data-min="${value}" class="${String(selected.min || "") === value ? "active" : ""}">${value ? `Miss >${value}` : "No miss"}</button>`).join("");
  const glows = [["", "Unknown"], ["yes", "Glow ✦"], ["no", "No glow ○"]].map(([value, label]) => `<button data-glow="${value}" class="${(selected.glow === true ? "yes" : selected.glow === false ? "no" : "") === value ? "active" : ""}">${label}</button>`).join("");
  const ranks = advice.stats?.slice(0, 4).map((item, i) => {
    const coord = `${String.fromCharCode(65 + item.index % 5)}${Math.floor(item.index / 5) + 1}`;
    return `<div class="rank-row"><span class="rank">${i + 1}</span><span>${coord}${bar(item.successP)}</span><small>${formatPercent(item.successP)} safe</small></div>`;
  }).join("") || "";
  const metrics = advice.kind === "move" ? metric("Success chance", formatPercent(advice.successP)) + metric("Expected points", advice.expected.toFixed(1)) + metric("Keep card", formatPercent(advice.keepP)) + metric("Boards sampled", advice.samples) : metric("Boards sampled", advice.samples || 0);
  root.innerHTML = `<div class="game-layout">
    <section class="panel">
      <div class="panel-head"><div><h2>5 × 5 evidence board</h2><p>Mark reveals, misses, and the 5-card glow clue</p></div><span>Field: 7/4/5/5/3/1</span></div>
      <div class="panel-body">
        <div class="control-row">
          <div class="field"><label for="king-card">Current card</label><select id="king-card">${["1","2","3","4","5","K"].map(v => `<option ${s.currentCard === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>
          <div class="notice grow"><strong>Glow clue:</strong> mark Glow when the neighbors flashed after opening this cell; mark No glow only when you clearly observed none.</div>
        </div>
        <div class="divider"></div>
        <div class="king-board">${board}</div>
        <div class="cell-editor">
          <p class="section-label">Edit ${String.fromCharCode(65 + s.selected % 5)}${Math.floor(s.selected / 5) + 1}</p>
          <div class="segmented">${values}</div>
          <div style="height:9px"></div><div class="segmented">${misses}</div>
          <div style="height:9px"></div><div class="segmented">${glows}</div>
        </div>
      </div>
    </section>
    ${renderAdvice(advice, metrics, ranks)}
  </div>`;
  bind("[data-index]", "click", e => { s.selected = Number(e.currentTarget.dataset.index); commit(); });
  bind("[data-value]", "click", e => { const cell = s.cells[s.selected]; cell.value = e.currentTarget.dataset.value || undefined; if (cell.value) cell.min = undefined; commit(); });
  bind("[data-min]", "click", e => { const cell = s.cells[s.selected]; cell.min = Number(e.currentTarget.dataset.min) || undefined; if (cell.min) cell.value = undefined; commit(); });
  bind("[data-glow]", "click", e => { const value = e.currentTarget.dataset.glow; s.cells[s.selected].glow = value === "yes" ? true : value === "no" ? false : undefined; commit(); });
  root.querySelector("#king-card").addEventListener("change", e => { s.currentCard = e.target.value; commit(); });
}

function yutOptions(selected) {
  return YUT_POSITIONS.map(pos => `<option value="${pos}" ${pos === selected ? "selected" : ""}>${labelYutPosition(pos)}</option>`).join("");
}

function yutNodePositions() {
  const nodes = [];
  for (let i = 1; i <= 5; i++) nodes.push({ id:`o${i}`, x:90-i*16, y:90 });
  for (let i = 6; i <= 10; i++) nodes.push({ id:`o${i}`, x:10, y:90-(i-5)*16 });
  for (let i = 11; i <= 15; i++) nodes.push({ id:`o${i}`, x:10+(i-10)*16, y:10 });
  for (let i = 16; i <= 19; i++) nodes.push({ id:`o${i}`, x:90, y:10+(i-15)*16 });
  nodes.push(
    {id:"a1",x:26,y:74},{id:"a2",x:38,y:62},{id:"ca",x:50,y:50},{id:"a3",x:62,y:38},{id:"a4",x:74,y:26},
    {id:"b1",x:26,y:26},{id:"b2",x:38,y:38},{id:"cb",x:50,y:50},{id:"b3",x:62,y:62},{id:"b4",x:74,y:74},
    {id:"start",x:90,y:90},{id:"home",x:90,y:90}
  );
  return nodes;
}

function renderYut() {
  const s = state.yut;
  const advice = adviseYut(s);
  const nodes = yutNodePositions().map(node => {
    const players = s.player.map((pos, i) => pos === node.id ? `<i class="token" title="Your piece ${i+1}"></i>` : "").join("");
    const cpus = s.cpu.map((pos, i) => pos === node.id ? `<i class="token cpu" title="CPU piece ${i+1}"></i>` : "").join("");
    return `<div class="yut-node ${["o5","o10","o15","start","home","ca","cb"].includes(node.id) ? "corner" : ""}" style="left:${node.x}%;top:${node.y}%"><span class="tokens">${players}${cpus}</span></div>`;
  }).join("");
  const ranks = [advice, ...(advice.alternatives || [])].filter(Boolean).map((item, i) => `<div class="rank-row"><span class="rank">${i + 1}</span><span>Piece ${item.piece + 1} → ${labelYutPosition(item.destination)}</span><small>${item.captureCount ? "capture" : item.finish ? "finish" : `+${item.progress}`}</small></div>`).join("");
  const metrics = advice.kind === "move" ? metric("Progress", `+${advice.progress}`) + metric("Moves left", s.movesLeft) + metric("Capture", advice.captureCount ? "Yes" : "No") + metric("Extra throw", Number(s.roll) >= 4 ? "Yes" : "No") : metric("Moves left", s.movesLeft);
  root.innerHTML = `<div class="game-layout">
    <section class="panel">
      <div class="panel-head"><div><h2>Board state</h2><p>Set all four pieces, then enter your throw</p></div><div class="yut-legend"><span><i class="token"></i>You</span><span><i class="token cpu"></i>CPU</span></div></div>
      <div class="panel-body">
        <div class="yut-board" aria-hidden="true">${nodes}</div>
        <div class="control-row">
          ${s.player.map((pos,i)=>`<div class="field grow"><label for="yp${i}">Your piece ${i+1}</label><select id="yp${i}">${yutOptions(pos)}</select></div>`).join("")}
          ${s.cpu.map((pos,i)=>`<div class="field grow"><label for="yc${i}">CPU piece ${i+1}</label><select id="yc${i}">${yutOptions(pos)}</select></div>`).join("")}
        </div>
        <div class="divider"></div>
        <p class="section-label">Your throw</p>
        <div class="segmented">${[[-1,"Back-do"],[1,"Do · 1"],[2,"Gae · 2"],[3,"Geol · 3"],[4,"Yut · 4"],[5,"Mo · 5"]].map(([v,l])=>`<button class="throw-button ${Number(s.roll)===v?"active":""}" data-roll="${v}">${l}</button>`).join("")}</div>
        <div style="height:14px"></div><div class="field" style="max-width:180px"><label for="moves-left">Moves left</label><input id="moves-left" type="number" min="0" max="20" value="${s.movesLeft}"></div>
      </div>
    </section>
    ${renderAdvice(advice, metrics, ranks)}
  </div>`;
  [0,1].forEach(i => {
    root.querySelector(`#yp${i}`).addEventListener("change", e => { s.player[i] = e.target.value; commit(); });
    root.querySelector(`#yc${i}`).addEventListener("change", e => { s.cpu[i] = e.target.value; commit(); });
  });
  bind("[data-roll]", "click", e => { s.roll = Number(e.currentTarget.dataset.roll); commit(); });
  root.querySelector("#moves-left").addEventListener("change", e => { s.movesLeft = Math.max(0, Math.min(20, Number(e.target.value) || 0)); commit(); });
}

function renderSeer() {
  const s = state.seer;
  const advice = adviseSeer(s);
  const cards = Array.from({ length: 9 }, (_, card) => {
    const available = Boolean(s.ownMask & (1 << card));
    return `<button class="seer-card ${card % 2 ? "white" : "black"} ${available ? "" : "used"} ${advice.card === card ? "recommended" : ""}" data-seer-card="${card}" ${available ? "" : "disabled"}>${card}</button>`;
  }).join("");
  const ranks = [advice, ...(advice.alternatives || [])].filter(item => item.card !== undefined).map((item, i) => `<div class="rank-row"><span class="rank">${i+1}</span><span>Play ${item.card}${bar(item.win)}</span><small>${formatPercent(item.win)} win</small></div>`).join("");
  const metrics = advice.kind === "move" ? metric("Win chance", formatPercent(advice.win)) + metric("Expected coins", advice.coins.toFixed(2)) + metric("Tie chance", formatPercent(advice.tie)) + metric("Possible states", s.belief.length) : "";
  const history = s.history.length ? [...s.history].reverse().map((item, i) => `<div class="history-item"><span>Round ${s.history.length-i} · played ${item.card} vs ${item.color}</span><b>${item.result}</b></div>`).join("") : `<div class="empty-advice">No rounds recorded yet.</div>`;
  root.innerHTML = `<div class="game-layout">
    <section class="panel">
      <div class="panel-head"><div><h2>Bayesian card tracker</h2><p>Black = even · White = odd</p></div><span>${s.history.length}/9 rounds</span></div>
      <div class="panel-body">
        <div class="control-row">
          <div class="field"><label for="seer-color">Opponent shows</label><select id="seer-color"><option value="black" ${s.color==="black"?"selected":""}>Black · even</option><option value="white" ${s.color==="white"?"selected":""}>White · odd</option></select></div>
          <div class="field"><label for="seer-objective">Optimize</label><select id="seer-objective"><option value="wins" ${s.objective==="wins"?"selected":""}>Round wins</option><option value="coins" ${s.objective==="coins"?"selected":""}>Seer coins</option></select></div>
        </div>
        <div class="divider"></div>
        <p class="section-label">Your remaining cards <span>Click a card to record this round</span></p>
        <div class="seer-cards">${cards}</div>
        ${s.selected !== null ? `<div class="cell-editor"><p class="section-label">You played ${s.selected}. What happened?</p><div class="segmented"><button data-seer-result="win">I won</button><button data-seer-result="tie">Equal</button><button data-seer-result="lose">I lost</button><button data-seer-cancel>Cancel</button></div></div>` : ""}
        <div class="divider"></div>
        <p class="section-label">Round history</p><div class="history-list">${history}</div>
      </div>
    </section>
    ${renderAdvice(advice, metrics, ranks)}
  </div>`;
  root.querySelector("#seer-color").addEventListener("change", e => { s.color = e.target.value; s.selected = null; commit(); });
  root.querySelector("#seer-objective").addEventListener("change", e => { s.objective = e.target.value; commit(); });
  bind("[data-seer-card]", "click", e => { s.selected = Number(e.currentTarget.dataset.seerCard); commit(); });
  bind("[data-seer-cancel]", "click", () => { s.selected = null; commit(); });
  bind("[data-seer-result]", "click", e => {
    const result = e.currentTarget.dataset.seerResult;
    const next = updateSeerBelief(s.belief, s.color, s.selected, result);
    if (!next.length) { notify("That result conflicts with the recorded history."); return; }
    s.history.push({ card: s.selected, color: s.color, result });
    s.ownMask &= ~(1 << s.selected);
    s.belief = next;
    s.selected = null;
    commit();
  });
}

function shapeHtml(shape) {
  const maxX = Math.max(...shape.cells.map(c => c[0])), maxY = Math.max(...shape.cells.map(c => c[1]));
  let cells = "";
  for (let y = 0; y <= maxY; y++) for (let x = 0; x <= maxX; x++) cells += `<i class="${shape.cells.some(c => c[0]===x&&c[1]===y) ? "" : "empty"}"></i>`;
  return `<span class="shape" style="grid-template-columns:repeat(${maxX+1},11px)">${cells}</span>`;
}

function renderFish() {
  const s = state.fish;
  const advice = adviseFish(s);
  const previewMask = advice.kind === "place" ? advice.mask : 0;
  const board = Array.from({ length: 24 }, (_, index) => `<button class="fish-cell ${s.board & (1<<index) ? "filled" : ""} ${previewMask & (1<<index) ? "preview" : ""}" data-fish-cell="${index}" aria-label="${String.fromCharCode(65+index%6)}${Math.floor(index/6)+1}${s.board&(1<<index)?", filled":""}"></button>`).join("");
  const tray = FISH_SHAPES.map(shape => `<button class="piece-button ${shape.deluxe?"deluxe":""} ${s.shapeId===shape.id?"active":""}" data-shape="${shape.id}" title="${shape.name}">${shapeHtml(shape)}<small>${shape.id}</small></button>`).join("");
  const remaining = 24 - countFilled(s.board);
  const tier = s.attempts <= 10 ? "Large" : s.attempts <= 24 ? "Medium" : "Small";
  const metrics = metric("Attempts", s.attempts) + metric("Cells left", remaining) + metric("Current tier", tier) + metric("Minimum avg size", remaining ? (remaining / Math.max(1, 10-s.attempts)).toFixed(1) : "—");
  const ranks = advice.alternatives?.slice(0,3).map((item,i)=> item.anchor !== undefined ? `<div class="rank-row"><span class="rank">${i+2}</span><span>${String.fromCharCode(65+item.anchor%6)}${Math.floor(item.anchor/6)+1}</span><small>score ${item.score.toFixed(1)}</small></div>` : "").join("") || "";
  root.innerHTML = `<div class="game-layout">
    <section class="panel">
      <div class="panel-head"><div><h2>6 × 4 placement board</h2><p>Pieces do not rotate</p></div><span>${countFilled(s.board)}/24 filled</span></div>
      <div class="panel-body">
        <p class="section-label">Piece from the box <span>Deluxe is 2 × 3</span></p>
        <div class="piece-tray">${tray}</div>
        <div class="divider"></div>
        <div class="fish-board">${board}</div>
        <div class="board-actions">
          <button id="fish-apply" class="primary-button" ${advice.kind==="place"?"":"disabled"}>Apply recommendation</button>
          <button id="fish-discard" class="secondary-button" ${s.shapeId?"":"disabled"}>Discard · +1</button>
          <button id="fish-undo" class="secondary-button" ${s.history.length?"":"disabled"}>Undo</button>
        </div>
        <div class="divider"></div>
        <div class="notice ${s.attempts>=8&&s.attempts<=10?"warn":""}"><strong>Reward clock:</strong> Large ≤10 attempts, Medium 11–24, Small ≥25. Placing and discarding both cost one attempt.</div>
      </div>
    </section>
    ${renderAdvice(advice, metrics, ranks)}
  </div>`;
  bind("[data-shape]", "click", e => { s.shapeId = e.currentTarget.dataset.shape; commit(); });
  root.querySelector("#fish-apply").addEventListener("click", () => {
    if (advice.kind !== "place") return;
    s.history.push({ board: s.board, attempts: s.attempts, shapeId: s.shapeId });
    s.board = applyFishMove(s.board, s.shapeId, advice.anchor);
    s.attempts++;
    s.shapeId = null;
    commit();
    if (countFilled(s.board) === 24) notify(`Puzzle complete in ${s.attempts} attempts.`);
  });
  root.querySelector("#fish-discard").addEventListener("click", () => {
    if (!s.shapeId) return;
    s.history.push({ board: s.board, attempts: s.attempts, shapeId: s.shapeId });
    s.attempts++; s.shapeId = null; commit();
  });
  root.querySelector("#fish-undo").addEventListener("click", () => { const prev = s.history.pop(); if (!prev) return; Object.assign(s, prev); commit(); });
  bind("[data-fish-cell]", "click", e => {
    if (!s.shapeId) return;
    const anchor = Number(e.currentTarget.dataset.fishCell);
    const next = applyFishMove(s.board, s.shapeId, anchor);
    if (next === null) { notify("That piece does not fit there."); return; }
    s.history.push({ board: s.board, attempts: s.attempts, shapeId: s.shapeId });
    s.board = next; s.attempts++; s.shapeId = null; commit();
  });
}

const RULE_TEXT = {
  okey: `<p>Mark the five visible cards and every card already played or discarded. A valid play is either three equal values in all three colors, or three consecutive values. Same-color runs receive a 40-point bonus.</p><h3>Method</h3><p>The engine enumerates all legal plays and discards. It evaluates every possible next card—and every possible three-card refill when the combination count remains practical—then scores immediate points, future set structure, and your selected chest threshold.</p>`,
  king: `<p>The hidden field contains 7 ones, 4 twos, 5 threes, 5 fours, 3 fives, and 1 King. Your fixed hand is 5×1, 2×2, 2×3, 1×4, 1×5, 1×K.</p><h3>Method</h3><p>The engine samples only complete 25-card boards compatible with every reveal, failed comparison, and glow/no-glow clue. It ranks cells by expected points, card retention, the special 5 trap, and King probability.</p>`,
  yut: `<p>Do/Gae/Geol move 1/2/3. Yut and Mo move 4/5 and grant another throw. Back-do moves one step back. Exact landings capture CPU pieces or stack your own. Exact corner landings take the shortcut.</p><h3>Method</h3><p>Every legal piece move is scored for progress, shortcut entry, captures, stacking, exposure to a return capture, finishing, and urgency under the 20-move limit.</p>`,
  seer: `<p>Both sides start with 0–8 exactly once. Even cards are black and odd cards are white. Before choosing, record the opponent's visible color. After the round, record whether your value was higher, equal, or lower.</p><h3>Method</h3><p>The tracker maintains a weighted Bayesian set of all opponent hands consistent with the complete history. The next-card distribution and displayed win/coin expectations are exact under a uniformly random opponent choice among its remaining cards.</p>`,
  fish: `<p>The board is 6×4. Standard boxes yield one of six fixed-orientation pieces; Deluxe yields a 2×3 block. A placement or discard both count as one attempt.</p><h3>Method</h3><p>The engine exhausts every legal anchor for the drawn piece and minimizes a continuation model that penalizes fragmented regions, forced single-cell draws, narrow cavities, and poor remaining area. It recommends discarding when all placements create a more expensive trap.</p>`
};

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => { state.active = button.dataset.game; commit(); }));
document.querySelector("#reset-button").addEventListener("click", () => {
  state[state.active] = cloneDefault()[state.active];
  commit(); notify(`${GAME_META[state.active].title} reset.`);
});
document.querySelector("#rules-button").addEventListener("click", () => {
  const meta = GAME_META[state.active];
  document.querySelector("#dialog-title").textContent = `${meta.title} · rules & method`;
  document.querySelector("#dialog-content").innerHTML = `${RULE_TEXT[state.active]}<h3>Primary source</h3><p><a href="${meta.source}" target="_blank" rel="noreferrer">Open the official German Metin2 Wiki page</a></p>`;
  rulesDialog.showModal();
});
document.querySelector("#dialog-close").addEventListener("click", () => rulesDialog.close());
rulesDialog.addEventListener("click", event => { if (event.target === rulesDialog) rulesDialog.close(); });

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
renderActive();
