import test from "node:test";
import assert from "node:assert/strict";
import {
  scoreOkeyCombo, validOkeyCombos, adviseOkey,
  sampleKingBoards, KING_COUNTS, kingNeighbors, kingCompletionBonus,
  adviseYut, applyYutMove, moveYutPosition, updateSeerBelief, initialSeerBelief, seerDistribution, adviseSeer,
  FISH_SHAPES, fishMaskAt, legalFishPlacements, applyFishMove, countFilled, adviseFish
} from "../src/engines.js";

const card = (color, value) => ({ id: `${color[0]}${value}`, color, value });

test("Okey scores every official combination class", () => {
  assert.equal(scoreOkeyCombo([card("red", 8), card("blue", 8), card("yellow", 8)]), 90);
  assert.equal(scoreOkeyCombo([card("red", 6), card("red", 7), card("red", 8)]), 100);
  assert.equal(scoreOkeyCombo([card("red", 1), card("blue", 2), card("yellow", 3)]), 10);
  assert.equal(scoreOkeyCombo([card("red", 1), card("red", 3), card("red", 4)]), 0);
});

test("Okey advisor evaluates the complete hand through the remaining deck", () => {
  const hand = [card("red", 6), card("red", 7), card("red", 8), card("blue", 1), card("yellow", 4)];
  const advice = adviseOkey({ hand, usedIds: [], score: 0, target: 400 });
  assert.ok(["play", "discard"].includes(advice.kind));
  assert.ok(advice.expectedGain >= 100);
  assert.equal(advice.simulations, 240);
  assert.equal(adviseOkey({ hand: hand.slice(0, 4), usedIds: [] }).kind, "empty");
});

test("Catch the King deck samples preserve exact field composition", () => {
  const cells = Array.from({ length: 25 }, () => ({}));
  const result = sampleKingBoards(cells, 25);
  assert.equal(result.samples.length, 25);
  for (const board of result.samples) {
    for (const [value, count] of Object.entries(KING_COUNTS)) {
      assert.equal(board.filter(card => card === String(value)).length, count);
    }
  }
  assert.equal(kingNeighbors(12).length, 8);
  assert.equal(kingNeighbors(0).length, 3);
});

test("Catch the King rejects impossible evidence", () => {
  const cells = Array.from({ length: 25 }, () => ({}));
  for (let i = 0; i < 8; i++) cells[i].value = "1";
  assert.match(sampleKingBoards(cells, 10).error, /Too many 1/);
});

test("Catch the King counts completed rows and columns independently", () => {
  const cells = Array.from({ length: 25 }, () => ({}));
  for (const index of [10, 11, 13, 14, 2, 7, 17, 22]) cells[index].value = "1";
  assert.equal(kingCompletionBonus(12, cells), 20);
  cells[22] = {};
  assert.equal(kingCompletionBonus(12, cells), 10);
});

test("Yutnori prioritizes an exact capture", () => {
  const advice = adviseYut({ player: ["o3", "start"], cpu: ["o5", "start"], roll: 2, movesLeft: 18 });
  assert.equal(advice.piece, 0);
  assert.equal(advice.destination, "o5");
  assert.equal(advice.captureCount, 1);
});

test("Yutnori follows shortcuts and moves stacks together", () => {
  assert.equal(moveYutPosition("o5", 1), "a1");
  assert.equal(moveYutPosition("o10", 3), "cb");
  assert.equal(moveYutPosition("a1", -1), "o5");
  const state = { player: ["o3", "o3"], cpu: ["o5", "start"], roll: 2, movesLeft: 12 };
  const advice = adviseYut(state);
  assert.deepEqual(advice.pieces, [0, 1]);
  const applied = applyYutMove(state, advice);
  assert.deepEqual(applied.player, ["o5", "o5"]);
  assert.deepEqual(applied.cpu, ["start", "start"]);
});

test("Seer posterior removes only values consistent with color and outcome", () => {
  const next = updateSeerBelief(initialSeerBelief(), "black", 3, "win");
  const masks = new Set(next.map(state => state.mask));
  assert.equal(masks.size, 2); // opponent could only have used 0 or 2
  const distribution = seerDistribution(next, "white");
  assert.ok(distribution[1] > 0);
  assert.equal(distribution[0], 0);
});

test("Seer advice always selects an available card with lookahead", () => {
  const ownMask = (1 << 2) | (1 << 7);
  const advice = adviseSeer({ ownMask, belief: initialSeerBelief(), objective: "wins" });
  assert.ok([2, 7].includes(advice.card));
  assert.ok(Number.isFinite(advice.future));
  assert.equal(advice.distribution.filter(value => value > 0).length, 9);
});

test("Fish pieces remain in fixed orientation and never overlap", () => {
  const bar = FISH_SHAPES.find(shape => shape.id === "4");
  const square = FISH_SHAPES.find(shape => shape.id === "1");
  assert.deepEqual(bar.cells, [[0, 0], [0, 1], [0, 2]]);
  assert.equal(fishMaskAt(bar, 0), (1 << 0) | (1 << 6) | (1 << 12));
  assert.equal(square.cells.length, 4);
  const mask = fishMaskAt(square, 0);
  assert.equal(countFilled(mask), 4);
  assert.equal(applyFishMove(mask, "1", 0), null);
  assert.ok(legalFishPlacements(mask, square).length > 0);
  assert.deepEqual(FISH_SHAPES.map(shape => [shape.id, shape.cells]), [
    ["6", [[0,0]]],
    ["4", [[0,0],[0,1],[0,2]]],
    ["5", [[0,0],[0,1],[1,1]]],
    ["2", [[0,0],[1,0],[1,1]]],
    ["1", [[0,0],[1,0],[0,1],[1,1]]],
    ["3", [[0,0],[1,0],[1,1],[2,1]]],
    ["L", [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]]
  ]);
});

test("Four deluxe pieces tile the 6 by 4 board", () => {
  let board = 0;
  for (const anchor of [0, 3, 12, 15]) {
    const next = applyFishMove(board, "L", anchor);
    if (next !== null) board = next;
  }
  assert.equal(countFilled(board), 24);
});

test("Fish advisor only returns legal placements", () => {
  const advice = adviseFish({ board: 0, shapeId: "4" });
  assert.equal(advice.kind, "place");
  assert.notEqual(applyFishMove(0, "4", advice.anchor), null);
});
