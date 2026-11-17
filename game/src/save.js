// Checkpoint saves deliberately omit transient damage, pursuit and vehicle positions.
const KEY = 'verano-heat.story.v1';
export function loadSave() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data?.version !== 1 || !Number.isInteger(data.stage) || data.stage < 0 || data.stage > 5) return null;
    if (!Number.isFinite(data.money) || data.money < 0 || data.money > 10000000) return null;
    return { stage: data.stage, money: Math.round(data.money) };
  } catch { return null; }
}
export function saveProgress(stage, money) {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 1, stage, money })); return true; }
  catch { return false; }
}
