function calculateSM2(quality, previousEF = 2.5, previousInterval = 0, previousRepetitions = 0) {
  let ef = previousEF;
  let interval = previousInterval;
  let repetitions = previousRepetitions;

  // 1. Calculate Interval & Repetitions based on quality grade (0-5)
  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ef);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  // 2. Calculate new Easiness Factor (EF)
  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Enforce the 1.3 minimum floor constraint
  if (ef < 1.3) {
    ef = 1.3;
  }

  // 3. Compute the exact timestamp for the next review
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easinessFactor: parseFloat(ef.toFixed(2)),
    interval,
    repetitions,
    nextReview
  };
}

module.exports = { calculateSM2 };