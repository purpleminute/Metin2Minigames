export const COLORS = ["red", "blue", "yellow"];

export function cardId(color, value) {
  return `${color[0]}${value}`;
}

export function parseCard(id) {
  const color = COLORS.find(name => name[0] === id[0]);
  return { id, color, value: Number(id.slice(1)) };
}

export const OKEY_DECK = COLORS.flatMap(color =>
  Array.from({ length: 8 }, (_, i) => ({ id: cardId(color, i + 1), color, value: i + 1 }))
);

export function scoreOkeyCombo(cards) {
  if (!Array.isArray(cards) || cards.length !== 3) return 0;
  const sorted = [...cards].sort((a, b) => a.value - b.value);
  const sameValue = sorted.every(card => card.value === sorted[0].value) && new Set(sorted.map(card => card.color)).size === 3;
  if (sameValue) return (sorted[0].value + 1) * 10;
  const run = sorted[1].value === sorted[0].value + 1 && sorted[2].value === sorted[1].value + 1;
  if (!run) return 0;
  const sameColor = sorted.every(card => card.color === sorted[0].color);
  return sorted[0].value * 10 + (sameColor ? 40 : 0);
}

function combinations(items, count) {
  const out = [];
  const walk = (start, picked) => {
    if (picked.length === count) { out.push([...picked]); return; }
    for (let i = start; i <= items.length - (count - picked.length); i++) {
      picked.push(items[i]);
      walk(i + 1, picked);
      picked.pop();
    }
  };
  if (count === 0) return [[]];
  walk(0, []);
  return out;
}

export function validOkeyCombos(hand) {
  return combinations(hand, 3)
    .map(cards => ({ cards, score: scoreOkeyCombo(cards) }))
    .filter(combo => combo.score > 0)
    .sort((a, b) => b.score - a.score);
}

function handPotential(hand) {
  const best = validOkeyCombos(hand)[0]?.score || 0;
  let links = 0;
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      const a = hand[i], b = hand[j];
      if (a.value === b.value && a.color !== b.color) links += 15 + a.value * 2;
      const gap = Math.abs(a.value - b.value);
      if (gap <= 2 && gap > 0) links += (a.color === b.color ? 15 : 6) + Math.max(a.value, b.value);
    }
  }
  return best + links * .22;
}

function okeyActions(hand, canDraw = true) {
  const actions = validOkeyCombos(hand).map(combo => ({ kind: "play", cards: combo.cards, immediate: combo.score }));
  if (canDraw) actions.push(...hand.map(card => ({ kind: "discard", cards: [card], immediate: 0 })));
  return actions;
}

function applyOkeyAction(hand, deck, action) {
  const removed = new Set(action.cards.map(card => card.id));
  const kept = hand.filter(card => !removed.has(card.id));
  const drawCount = action.kind === "play" ? Math.min(3, deck.length) : Math.min(1, deck.length);
  return { hand: [...kept, ...deck.slice(0, drawCount)], deck: deck.slice(drawCount), score: action.immediate };
}

function chooseOkeyContinuation(hand, deck, runningScore, target) {
  const actions = okeyActions(hand, deck.length > 0);
  if (!actions.length) return null;
  return actions.map(action => {
    const next = applyOkeyAction(hand, deck, action);
    const nextBest = validOkeyCombos(next.hand)[0]?.score || 0;
    const reaches = runningScore + action.immediate >= target ? 24 : 0;
    const utility = action.immediate + handPotential(next.hand) * .52 + nextBest * .2 + reaches;
    return { action, utility };
  }).sort((a, b) => b.utility - a.utility)[0].action;
}

function simulateOkeyAction(hand, remaining, action, score, target, seed) {
  const deck = shuffle([...remaining], mulberry32(seed));
  let state = applyOkeyAction(hand, deck, action);
  let gained = state.score;
  let guard = 0;
  while (guard++ < 30) {
    const next = chooseOkeyContinuation(state.hand, state.deck, score + gained, target);
    if (!next) break;
    state = applyOkeyAction(state.hand, state.deck, next);
    gained += state.score;
  }
  return gained;
}

function sampleCombinations(items, count, max = 1200) {
  const total = choose(items.length, count);
  if (total <= max) return combinations(items, count);
  const result = [];
  const seen = new Set();
  let seed = (items.length * 997 + count * 7919) >>> 0;
  const rand = mulberry32(seed);
  while (result.length < max) {
    const indexes = [];
    while (indexes.length < count) {
      const index = Math.floor(rand() * items.length);
      if (!indexes.includes(index)) indexes.push(index);
    }
    indexes.sort((a, b) => a - b);
    const key = indexes.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      result.push(indexes.map(index => items[index]));
    }
  }
  return result;
}

function choose(n, k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) result = result * (n - i + 1) / i;
  return Math.round(result);
}

export function adviseOkey({ hand, usedIds = [], score = 0, target = 400 }) {
  if (hand.length !== 5) return { kind: "empty", title: "Enter all five cards", detail: `${hand.length}/5 cards entered. The solver waits for the complete hand so it does not recommend from an impossible state.` };
  const blocked = new Set([...hand.map(c => c.id), ...usedIds]);
  const remaining = OKEY_DECK.filter(card => !blocked.has(card.id));
  const actions = okeyActions(hand, remaining.length > 0);
  const simulations = remaining.length > 12 ? 240 : 360;
  const baseSeed = hand.reduce((sum, card) => sum + card.value * 97 + card.id.charCodeAt(0), usedIds.length * 7919 + score * 13 + target);
  for (const action of actions) {
    let total = 0, hits = 0;
    for (let i = 0; i < simulations; i++) {
      const gained = simulateOkeyAction(hand, remaining, action, score, target, baseSeed + i * 2654435761);
      total += gained;
      if (score + gained >= target) hits++;
    }
    action.expectedGain = total / simulations;
    action.targetChance = hits / simulations;
    action.future = action.expectedGain - action.immediate;
    action.utility = action.targetChance * 1000 + action.expectedGain;
  }

  actions.sort((a, b) => b.utility - a.utility);
  const best = actions[0];
  return {
    ...best,
    title: best.kind === "play" ? `Play ${formatCards(best.cards)}` : `Discard ${formatCards(best.cards)}`,
    detail: best.kind === "play"
      ? `Bank ${best.immediate} points now. Full-deck playouts give this the best ${target}-point finish rate.`
      : `Discard this card. Full-deck playouts show that keeping the other four gives the best ${target}-point finish rate.`,
    alternatives: actions.slice(1, 4),
    remaining: remaining.length,
    simulations
  };
}

export function formatCards(cards) {
  return cards.map(card => `${card.color[0].toUpperCase()}${card.value}`).join(" · ");
}

export const KING_COUNTS = { 1: 7, 2: 4, 3: 5, 4: 5, 5: 3, K: 1 };
export const KING_POINTS = { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50, K: 100 };

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function kingNeighbors(index) {
  const row = Math.floor(index / 5), col = index % 5, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < 5 && c >= 0 && c < 5) out.push(r * 5 + c);
  }
  return out;
}

export function kingCompletionBonus(index, cells) {
  const row = Math.floor(index / 5), col = index % 5;
  const rowComplete = Array.from({ length: 5 }, (_, c) => row * 5 + c).every(i => i === index || cells[i]?.value);
  const columnComplete = Array.from({ length: 5 }, (_, r) => r * 5 + col).every(i => i === index || cells[i]?.value);
  return (rowComplete ? 10 : 0) + (columnComplete ? 10 : 0);
}

function shuffle(array, rand) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function boardMatchesKingClues(values, cells) {
  for (let i = 0; i < 25; i++) {
    const cell = cells[i] || {};
    if (cell.min && values[i] !== "K" && Number(values[i]) <= Number(cell.min)) return false;
    if (cell.glow === undefined || cell.glow === null) continue;
    const hasFive = kingNeighbors(i).some(n => values[n] === "5");
    if (Boolean(cell.glow) !== hasFive) return false;
  }
  return true;
}

export function sampleKingBoards(cells, wanted = 1800) {
  const knownCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, K: 0 };
  const unknownIndexes = [];
  const base = Array(25).fill(null);
  for (let i = 0; i < 25; i++) {
    const value = cells[i]?.value;
    if (value) { base[i] = String(value); knownCounts[value]++; }
    else unknownIndexes.push(i);
  }
  for (const [value, count] of Object.entries(knownCounts)) {
    if (count > KING_COUNTS[value]) return { samples: [], error: `Too many ${value} cards are marked.` };
  }
  const bag = [];
  for (const [value, total] of Object.entries(KING_COUNTS)) {
    for (let i = knownCounts[value]; i < total; i++) bag.push(String(value));
  }
  if (bag.length !== unknownIndexes.length) return { samples: [], error: "The board marks do not match the 25-card field." };
  const seed = cells.reduce((sum, cell, i) => sum + (cell?.value ? String(cell.value).charCodeAt(0) * (i + 3) : 0) + (cell?.min || 0) * 31 + (cell?.glow === true ? 71 : cell?.glow === false ? 43 : 0), 1337);
  const rand = mulberry32(seed);
  const samples = [];
  const maxAttempts = Math.max(12000, wanted * 55);
  for (let attempt = 0; attempt < maxAttempts && samples.length < wanted; attempt++) {
    const values = [...base];
    const rolled = shuffle([...bag], rand);
    unknownIndexes.forEach((index, j) => { values[index] = rolled[j]; });
    if (boardMatchesKingClues(values, cells)) samples.push(values);
  }
  return { samples, error: samples.length ? null : "No board matches these clues. Check the revealed values, misses, and glow markers." };
}

export function adviseKing({ cells, currentCard = "1" }) {
  const { samples, error } = sampleKingBoards(cells);
  if (error) return { kind: "error", title: "Clues conflict", detail: error, samples: 0 };
  const unknown = cells.map((cell, index) => cell?.value ? null : index).filter(index => index !== null);
  if (!unknown.length) return { kind: "done", title: "Board complete", detail: "All 25 field cards are known.", samples: samples.length };
  const stats = unknown.map(index => {
    let success = 0, points = 0, keep = 0, fiveTrap = 0, king = 0, rowBonus = 0;
    for (const board of samples) {
      const value = board[index];
      const cardNum = currentCard === "K" ? 6 : Number(currentCard);
      const valueNum = value === "K" ? 6 : Number(value);
      const trapped = currentCard === "5" && kingNeighbors(index).some(n => board[n] === "5" && n !== index);
      const won = currentCard === "K" ? value === "K" : valueNum <= cardNum && !trapped;
      if (won) {
        success++;
        points += KING_POINTS[value];
        if (valueNum < cardNum) keep++;
        rowBonus += kingCompletionBonus(index, cells);
      }
      if (trapped) fiveTrap++;
      if (value === "K") king++;
    }
    const n = samples.length;
    const expected = (points + rowBonus) / n;
    const successP = success / n;
    const utility = currentCard === "K" ? king / n * 100 : expected + keep / n * 7 - fiveTrap / n * 22;
    return { index, successP, expected, keepP: keep / n, fiveTrapP: fiveTrap / n, kingP: king / n, utility };
  }).sort((a, b) => b.utility - a.utility);
  const best = stats[0];
  const coord = `${String.fromCharCode(65 + (best.index % 5))}${Math.floor(best.index / 5) + 1}`;
  return {
    kind: "move", index: best.index, title: `Open ${coord}`,
    detail: currentCard === "K"
      ? `This cell has the highest posterior King probability (${formatPercent(best.kingP)}).`
      : `Best balance of scoring chance, expected points, and keeping the current card.`,
    samples: samples.length, stats: stats.slice(0, 5), ...best
  };
}

export function formatPercent(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

const OUTER = Array.from({ length: 20 }, (_, i) => `o${i + 1}`);
export const YUT_POSITIONS = ["start", ...OUTER.slice(0, 19), "a1", "a2", "ca", "a3", "a4", "b1", "b2", "cb", "b3", "b4", "home"];

export function moveYutPosition(position, steps) {
  if (position === "home") return "home";
  if (steps === -1) return yutBackward(position);
  if (position === "start") return steps >= 20 ? "home" : `o${steps}`;
  const routeA = ["o5", "a1", "a2", "ca", "a3", "a4", "o15", "o16", "o17", "o18", "o19", "home"];
  const routeB = ["o10", "b1", "b2", "cb", "b3", "b4", "home"];
  if (routeA.includes(position)) return routeA[Math.min(routeA.indexOf(position) + steps, routeA.length - 1)];
  if (routeB.includes(position)) return routeB[Math.min(routeB.indexOf(position) + steps, routeB.length - 1)];
  const n = Number(position.slice(1));
  const target = n + steps;
  return target >= 20 ? "home" : `o${target}`;
}

function yutBackward(position) {
  if (position === "start" || position === "home") return position;
  const routes = [
    ["o5", "a1", "a2", "ca", "a3", "a4", "o15"],
    ["o10", "b1", "b2", "cb", "b3", "b4", "home"]
  ];
  for (const route of routes) {
    const at = route.indexOf(position);
    if (at > 0) return route[at - 1];
  }
  if (position[0] === "o") {
    const n = Number(position.slice(1));
    return n <= 1 ? "start" : `o${n - 1}`;
  }
  return "start";
}

export function yutDistance(position) {
  if (position === "home") return 0;
  if (position === "start") return 20;
  const a = ["o5", "a1", "a2", "ca", "a3", "a4", "o15", "o16", "o17", "o18", "o19", "home"];
  const b = ["o10", "b1", "b2", "cb", "b3", "b4", "home"];
  if (a.includes(position)) return a.length - 1 - a.indexOf(position);
  if (b.includes(position)) return b.length - 1 - b.indexOf(position);
  return Math.max(0, 20 - Number(position.slice(1)));
}

export function adviseYut({ player, cpu, roll, movesLeft = 20 }) {
  const steps = Number(roll);
  const candidates = [];
  const handled = new Set();
  player.forEach((position, piece) => {
    if (position === "home") return;
    if (steps === -1 && position === "start") return;
    const pieces = !["start", "home"].includes(position)
      ? player.map((pos, index) => pos === position ? index : -1).filter(index => index >= 0)
      : [piece];
    const groupKey = pieces.join(",");
    if (handled.has(groupKey)) return;
    handled.add(groupKey);
    const destination = moveYutPosition(position, steps);
    const captureCount = cpu.filter(pos => pos === destination && !["start", "home"].includes(pos)).length;
    const joinedPieces = player.map((pos, index) => pos === destination && !pieces.includes(index) && !["start", "home"].includes(pos) ? index : -1).filter(index => index >= 0);
    const progress = (yutDistance(position) - yutDistance(destination)) * pieces.length;
    const finishCount = destination === "home" ? pieces.length : 0;
    const shortcut = ["o5", "o10"].includes(destination) ? 1 : 0;
    const rollWeights = [[-1, 1], [1, 3], [2, 6], [3, 4], [4, 1], [5, 1]];
    const exposed = cpu.reduce((risk, pos) => {
      if (["start", "home"].includes(pos) || ["start", "home"].includes(destination)) return risk;
      const captureWeight = rollWeights.reduce((sum, [cpuRoll, weight]) => sum + (moveYutPosition(pos, cpuRoll) === destination ? weight : 0), 0);
      return risk + captureWeight / 16;
    }, 0);
    const urgency = movesLeft <= 6 ? finishCount * 20 + progress * .8 : 0;
    const utility = progress * 3 + captureCount * 25 + finishCount * 36 + shortcut * 5 + joinedPieces.length * 5 - exposed * 20 + urgency;
    candidates.push({ piece: pieces[0], pieces, from: position, destination, captureCount, stack: joinedPieces.length > 0, joinedPieces, progress, finish: finishCount > 0, finishCount, exposed, utility });
  });
  candidates.sort((a, b) => b.utility - a.utility);
  if (!candidates.length) return { kind: "pass", title: "Pass this turn", detail: "Back-do cannot move a piece while both are off the board." };
  const best = candidates[0];
  return {
    kind: "move", title: `Move ${best.pieces.length > 1 ? "stack" : `piece ${best.piece + 1}`}`, detail: `${labelYutPosition(best.from)} → ${labelYutPosition(best.destination)}${best.captureCount ? ` · capture ${best.captureCount}` : ""}${best.stack ? " · join your other piece" : ""}`,
    ...best, alternatives: candidates.slice(1)
  };
}

export function applyYutMove({ player, cpu }, move) {
  const nextPlayer = [...player], nextCpu = [...cpu];
  for (const piece of move.pieces || [move.piece]) nextPlayer[piece] = move.destination;
  if (move.captureCount) {
    nextCpu.forEach((position, index) => { if (position === move.destination) nextCpu[index] = "start"; });
  }
  return { player: nextPlayer, cpu: nextCpu };
}

export function labelYutPosition(position) {
  const labels = {
    start: "Start", home: "Finished",
    o5: "Bottom-left shortcut", o10: "Top-left shortcut", o15: "Top-right corner",
    a1: "Lower diagonal · 1", a2: "Lower diagonal · 2", ca: "Center toward top-right", a3: "Upper diagonal · 1", a4: "Upper diagonal · 2",
    b1: "Upper-left diagonal · 1", b2: "Upper-left diagonal · 2", cb: "Center toward home", b3: "Lower-right diagonal · 1", b4: "Lower-right diagonal · 2"
  };
  if (labels[position]) return labels[position];
  const n = Number(position.slice(1));
  if (n <= 4) return `Bottom lane · ${n}`;
  if (n <= 9) return `Left lane · ${n - 5}`;
  if (n <= 14) return `Top lane · ${n - 10}`;
  return `Right lane · ${n - 15}${n === 19 ? " (one step home)" : ""}`;
}

export function initialSeerBelief() {
  return [{ mask: 0x1ff, weight: 1 }];
}

function bits(mask) {
  const values = [];
  for (let i = 0; i <= 8; i++) if (mask & (1 << i)) values.push(i);
  return values;
}

export function seerDistribution(belief, color = null) {
  const parity = color === "black" ? 0 : color === "white" ? 1 : null;
  const probabilities = Array(9).fill(0);
  let total = 0;
  for (const state of belief) {
    const all = bits(state.mask);
    for (const value of all) {
      if (parity === null || value % 2 === parity) {
        const mass = state.weight / Math.max(1, all.length);
        probabilities[value] += mass;
        total += mass;
      }
    }
  }
  if (total) for (let i = 0; i < 9; i++) probabilities[i] /= total;
  return probabilities;
}

function seerImmediateActions(ownMask, belief, objective) {
  const distribution = seerDistribution(belief);
  return bits(ownMask).map(card => {
    let win = 0, tie = 0, coins = 0;
    distribution.forEach((p, opponent) => {
      if (card > opponent) { win += p; coins += p * (card - opponent); }
      else if (card === opponent) tie += p;
    });
    const preservation = (8 - card) * .006;
    const immediateUtility = objective === "coins" ? coins + win * .3 + preservation : win + coins * .025 + preservation;
    return { card, win, tie, lose: 1 - win - tie, coins, immediateUtility, utility: immediateUtility };
  });
}

export function adviseSeer({ ownMask = 0x1ff, belief = initialSeerBelief(), objective = "wins" }) {
  const distribution = seerDistribution(belief);
  const actions = seerImmediateActions(ownMask, belief, objective);
  for (const action of actions) {
    const observations = new Map();
    distribution.forEach((probability, opponent) => {
      if (!probability) return;
      const color = opponent % 2 === 0 ? "black" : "white";
      const result = action.card > opponent ? "win" : action.card === opponent ? "tie" : "lose";
      const key = `${color}:${result}`;
      observations.set(key, (observations.get(key) || 0) + probability);
    });
    let future = 0;
    for (const [observation, probability] of observations) {
      const [color, result] = observation.split(":");
      const nextBelief = updateSeerBelief(belief, color, action.card, result);
      const nextOwnMask = ownMask & ~(1 << action.card);
      const bestNext = seerImmediateActions(nextOwnMask, nextBelief, objective).sort((a, b) => b.immediateUtility - a.immediateUtility)[0];
      if (bestNext) future += probability * bestNext.immediateUtility;
    }
    action.future = future;
    action.utility = action.immediateUtility + future * .72;
  }
  actions.sort((a, b) => b.utility - a.utility || a.card - b.card);
  if (!actions.length || !distribution.some(Boolean)) return { kind: "empty", title: "No legal prediction", detail: "Check the remaining cards and round history." };
  return { kind: "move", title: `Play ${actions[0].card}`, detail: objective === "coins" ? "Best expected coin return with a two-round Bayesian lookahead." : "Best expected round-win value with a two-round Bayesian lookahead.", ...actions[0], alternatives: actions.slice(1, 4), distribution };
}

export function updateSeerBelief(belief, color, ownCard, result) {
  const parity = color === "black" ? 0 : 1;
  const next = new Map();
  let total = 0;
  for (const state of belief) {
    const all = bits(state.mask);
    for (const opponent of all) {
      const relation = ownCard > opponent ? "win" : ownCard === opponent ? "tie" : "lose";
      if (opponent % 2 !== parity || relation !== result) continue;
      const mass = state.weight / Math.max(1, all.length);
      const mask = state.mask & ~(1 << opponent);
      next.set(mask, (next.get(mask) || 0) + mass);
      total += mass;
    }
  }
  if (!total) return [];
  return [...next].map(([mask, weight]) => ({ mask, weight: weight / total }));
}

export const FISH_SHAPES = [
  { id: "6", name: "Single", cells: [[0, 0]] },
  { id: "4", name: "Bar", cells: [[0, 0], [0, 1], [0, 2]] },
  { id: "5", name: "L-left", cells: [[0, 0], [0, 1], [1, 1]] },
  { id: "2", name: "L-right", cells: [[0, 0], [1, 0], [1, 1]] },
  { id: "1", name: "Square", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { id: "3", name: "Z", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { id: "L", name: "Deluxe", deluxe: true, cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]] }
];

export function fishMaskAt(shape, anchor) {
  const x = anchor % 6, y = Math.floor(anchor / 6);
  let mask = 0;
  for (const [dx, dy] of shape.cells) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= 6 || ny < 0 || ny >= 4) return null;
    mask |= 1 << (ny * 6 + nx);
  }
  return mask;
}

export function legalFishPlacements(board, shape) {
  const out = [];
  for (let anchor = 0; anchor < 24; anchor++) {
    const mask = fishMaskAt(shape, anchor);
    if (mask !== null && (board & mask) === 0) out.push({ anchor, mask, board: board | mask });
  }
  return out;
}

function popcount(value) {
  let count = 0;
  while (value) { value &= value - 1; count++; }
  return count;
}

function emptyComponents(board) {
  const seen = new Set();
  const sizes = [];
  for (let start = 0; start < 24; start++) {
    if ((board & (1 << start)) || seen.has(start)) continue;
    const queue = [start]; seen.add(start); let size = 0;
    while (queue.length) {
      const cell = queue.pop(); size++;
      const x = cell % 6, y = Math.floor(cell / 6);
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy, next = ny * 6 + nx;
        if (nx >= 0 && nx < 6 && ny >= 0 && ny < 4 && !(board & (1 << next)) && !seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    sizes.push(size);
  }
  return sizes;
}

function fishHeuristic(board) {
  const empty = 24 - popcount(board);
  if (!empty) return 0;
  const components = emptyComponents(board);
  const singles = components.filter(size => size === 1).length;
  const awkward = components.filter(size => size === 2 || size === 5).length;
  let jagged = 0;
  for (let i = 0; i < 24; i++) {
    if (board & (1 << i)) continue;
    const x = i % 6, y = Math.floor(i / 6);
    const open = [[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy]) => {
      const nx=x+dx, ny=y+dy; return nx>=0&&nx<6&&ny>=0&&ny<4&&!(board&(1<<(ny*6+nx)));
    }).length;
    if (open <= 1) jagged++;
  }
  return empty / 3.15 + components.length * .5 + singles * 3.8 + awkward * .65 + jagged * .32;
}

function fishExpectedCost(board, depth, memo) {
  if (popcount(board) === 24) return 0;
  if (depth <= 0) return fishHeuristic(board);
  const key = `${board}:${depth}`;
  if (memo.has(key)) return memo.get(key);
  const normalShapes = FISH_SHAPES.filter(shape => !shape.deluxe);
  const pieceCosts = normalShapes.map(shape => {
    const placements = legalFishPlacements(board, shape);
    if (!placements.length) return Infinity;
    return Math.min(...placements.map(move => fishExpectedCost(move.board, depth - 1, memo)));
  }).filter(Number.isFinite).sort((a, b) => a - b);
  let best = Infinity, sum = 0;
  for (let accepted = 1; accepted <= pieceCosts.length; accepted++) {
    sum += pieceCosts[accepted - 1];
    best = Math.min(best, (normalShapes.length + sum) / accepted);
  }
  const result = Number.isFinite(best) ? best : fishHeuristic(board) + normalShapes.length;
  memo.set(key, result);
  return result;
}

export function adviseFish({ board = 0, shapeId }) {
  const shape = FISH_SHAPES.find(item => item.id === shapeId);
  if (!shape) return { kind: "empty", title: "Select the drawn piece", detail: "Choose the exact fixed orientation shown in Metin2." };
  const memo = new Map();
  const placements = legalFishPlacements(board, shape).map(move => {
    const components = emptyComponents(move.board);
    const score = 1 + fishExpectedCost(move.board, 2, memo);
    return { ...move, score, components };
  }).sort((a, b) => a.score - b.score || b.anchor - a.anchor);
  const discardCost = 1 + fishExpectedCost(board, 2, memo);
  if (!placements.length) return { kind: "discard", title: "Discard this piece", detail: "It has no legal placement on the current board.", expectedRemaining: discardCost };
  const best = placements[0];
  if (!shape.deluxe && discardCost + .05 < best.score) return { kind: "discard", title: "Discard this piece", detail: "Depth-2 expected-draw search finds that waiting costs fewer attempts than every legal placement.", alternatives: placements.slice(0, 3), expectedRemaining: discardCost };
  const col = String.fromCharCode(65 + best.anchor % 6), row = Math.floor(best.anchor / 6) + 1;
  return { kind: "place", title: `Place at ${col}${row}`, detail: "Best expected remaining-attempt cost under a depth-2 random-piece search.", ...best, alternatives: placements.slice(1, 4), empty: 24 - popcount(best.board), expectedRemaining: best.score };
}

export function applyFishMove(board, shapeId, anchor) {
  const shape = FISH_SHAPES.find(item => item.id === shapeId);
  if (!shape) return null;
  const mask = fishMaskAt(shape, anchor);
  if (mask === null || board & mask) return null;
  return board | mask;
}

export function countFilled(board) { return popcount(board); }
