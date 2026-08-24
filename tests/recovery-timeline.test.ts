import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRecoveryTimeline,
  calculateRecoveryDays,
  RECOVERY_MODEL_DESCRIPTION,
} from '../src/scenarios/scenario-engine';

const assertTimeline = (
  timeline: ReturnType<typeof buildRecoveryTimeline>,
  expectedFinalDay: number,
  expectedInitialCapacity: number,
): void => {
  assert.equal(timeline.length, expectedFinalDay + 1);
  assert.equal(timeline[0]?.day, 0);
  assert.equal(
    timeline[0]?.remainingCapacityPercent,
    expectedInitialCapacity,
  );
  assert.equal(timeline[timeline.length - 1]?.day, expectedFinalDay);
  assert.equal(
    timeline[timeline.length - 1]?.remainingCapacityPercent,
    100,
  );

  for (let index = 1; index < timeline.length; index += 1) {
    const previous = timeline[index - 1];
    const current = timeline[index];

    assert.ok(
      current.remainingCapacityPercent >= previous.remainingCapacityPercent,
      `capacity must be monotonic at day ${current.day}`,
    );
    assert.ok(current.recoveryPercent >= 0);
    assert.ok(current.recoveryPercent <= 100);
  }
};

test('recovery timeline documents its mathematical assumption', () => {
  assert.match(RECOVERY_MODEL_DESCRIPTION, /No source-backed recovery rate/);
  assert.equal(calculateRecoveryDays(14, 'HIGH'), 28);
});

test('gradually recovers after the disruption period', () => {
  const recoveryDays = calculateRecoveryDays(14, 'HIGH');
  const timeline = buildRecoveryTimeline(14, recoveryDays, 86);

  assertTimeline(timeline, recoveryDays, 14);
  assert.ok(
    timeline.slice(0, 15).every((point) => point.remainingCapacityPercent === 14),
  );
  assert.ok(
    timeline.some(
      (point) =>
        point.day > 14 &&
        point.day < recoveryDays &&
        point.remainingCapacityPercent > 14 &&
        point.remainingCapacityPercent < 100,
    ),
  );
  assert.equal(timeline[timeline.length - 1]?.status, 'RECOVERED');
});

test('zero reduction preserves full capacity', () => {
  const timeline = buildRecoveryTimeline(2, 8, 0);

  assertTimeline(timeline, 8, 100);
  assert.ok(
    timeline.every((point) => point.remainingCapacityPercent === 100),
  );
});

test('full reduction starts at zero and reaches full capacity', () => {
  const timeline = buildRecoveryTimeline(2, 8, 100);

  assertTimeline(timeline, 8, 0);
  assert.equal(timeline[0]?.remainingCapacityPercent, 0);
  assert.ok(
    timeline.some(
      (point) => point.day > 2 && point.remainingCapacityPercent > 0,
    ),
  );
});

test('one-day recovery window transitions on the final recovery day', () => {
  const timeline = buildRecoveryTimeline(3, 4, 50);

  assertTimeline(timeline, 4, 50);
  assert.deepEqual(
    timeline.map((point) => point.remainingCapacityPercent),
    [50, 50, 50, 50, 100],
  );
});

test('longer recovery remains monotonic and consistent with recoveryDays', () => {
  const timeline = buildRecoveryTimeline(2, 8, 50);

  assertTimeline(timeline, 8, 50);
  assert.ok(
    timeline.some(
      (point) =>
        point.day > 2 &&
        point.day < 8 &&
        point.remainingCapacityPercent > 50 &&
        point.remainingCapacityPercent < 100,
    ),
  );
});
