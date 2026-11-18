import test from "node:test";
import assert from "node:assert/strict";
import {
  scoreOkeyCombo, validOkeyCombos, adviseOkey,
  sampleKingBoards, KING_COUNTS, kingNeighbors,
  adviseYut, updateSeerBelief, initialSeerBelief, seerDistribution,
  FISH_SHAPES, fishMaskAt, legalFishPlacements, applyFishMove, countFilled
} from "../src/engines.js";

const card = (color, value) => ({ id: `${color[0]}${value}`, color, value });

test("Okey scores every official combination class", () => {
  assert.equal(scoreOkeyCombo([card("red", 8), card("blue", 8), card("yellow", 8)]), 90);
  assert.equal(scoreOkeyCombo([card("red", 6), card("red", 7), card("red", 8)]), 100);
  assert.equal(scoreOkeyCombo([card("red", 1), card("blue", 2), card("yellow", 3)]), 10);
  assert.equal(scoreOkeyCombo([card("red", 1), card("red", 3), card("red", 4)]), 0);
});

test("Okey advisor selects a 100-point run", () => {
  const hand = [card("red", 6), card("red", 7), card("red", 8), card("blue", 1), card("yellow", 4)];
  const advice = adviseOkey({ hand, usedIds: [], score: 0, target: 400 });
  assert.equal(advice.kind, "play");
  assert.equal(advice.immediate, 100);
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

test("Yutnori prioritizes an exact capture", () => {
  const advice = adviseYut({ player: ["o3", "start"], cpu: ["o5", "start"], roll: 2, movesLeft: 18 });
  assert.equal(advice.piece, 0);
  assert.equal(advice.destination, "o5");
  assert.equal(advice.captureCount, 1);
});

test("Seer posterior removes only values consistent with color and outcome", () => {
  const next = updateSeerBelief(initialSeerBelief(), "black", 3, "win");
  const masks = new Set(next.map(state => state.mask));
  assert.equal(masks.size, 2); // opponent could only have used 0 or 2
  const distribution = seerDistribution(next, "white");
  assert.ok(distribution[1] > 0);
  assert.equal(distribution[0], 0);
});

test("Fish pieces remain in fixed orientation and never overlap", () => {
  const square = FISH_SHAPES.find(shape => shape.id === "1");
  assert.equal(square.cells.length, 4);
  const mask = fishMaskAt(square, 0);
  assert.equal(countFilled(mask), 4);
  assert.equal(applyFishMove(mask, "1", 0), null);
  assert.ok(legalFishPlacements(mask, square).length > 0);
});

test("Four deluxe pieces tile the 6 by 4 board", () => {
  let board = 0;
  for (const anchor of [0, 3, 12, 15]) {
    const next = applyFishMove(board, "L", anchor);
    if (next !== null) board = next;
  }
  assert.equal(countFilled(board), 24);
});
