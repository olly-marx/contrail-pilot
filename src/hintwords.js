// THE WORDS OF THE THREE HINT LINES for the hangar's upgrade bar (the sim chat's tables, research/GAP-HINT-LEVELS-PLAN.md section 9; at most 28 characters a line): hintWords(lineId, level) -> { now, next } for the line's level
// 0..12 (level 12 'next' = 'Fully upgraded'). Pure data. NOT wired into the hangar here: src/upgradetext.js levelCard (branch rel-bar) is the one that writes a level's words; it should call hintWords for kind 'system' ids
// forecast / atc / ops (their levels carry no effect text for the hint, which is derived from the level number: src/hintlines.js). tests/hintlines.cjs holds the length rule and the 13 levels per line.
export const HINT_WORDS = {
  forecast: [['No forecast yet', 'An arrow to the gap'], ['Arrow to the gap', 'Better icy-air view'], ['Better icy-air view', 'Gate comes at level 5'], ['Gate comes at level 5', 'Gate comes at level 5'],
    ['Gate comes at level 5', 'A faint GATE appears'], ['Faint gate at the edge', 'The gate fills in'], ['Gate filled in', 'Best height, gate stays'], ['Best height, gate 1 s', 'A brighter gate'], ['Bright gate', 'A brighter gate'],
    ['Brighter gate', 'A brighter gate'], ['Very bright gate', 'A brighter gate'], ['Brightest gate soon', 'The brightest gate'], ['The brightest gate', 'Fully upgraded']],   // (2026-11-18: gate from 5, fill 6, best height and linger 7)
  atc: [['No warning yet', 'Arrow, 0.3 s early'], ['Warning 0.3 s early', 'Warning 0.4 s early'], ['Warning 0.4 s early', 'Warning 0.5 s early'], ['Warning 0.5 s early', 'Warning 0.6 s early'], ['Warning 0.6 s early', 'Warning 0.7 s early'],
    ['Warning 0.7 s early', 'Warning 0.8 s early'], ['Warning 0.8 s early', 'Warning 0.9 s early'], ['Warning 0.9 s early', 'Warning 1.0 s early'], ['Warning 1.0 s early', 'Warning 1.1 s early'], ['Warning 1.1 s early', '2nd gate and a boost'],
    ['2nd gate, climb boost x1', 'Climb boost x2'], ['Climb boost x2', 'Climb boost x3'], ['Climb boost x3', 'Fully upgraded']],   // (2026-11-18: 0.3 s + 0.1 s a level)
  ops: [['No cues yet', 'Arrow to the gap'], ['Arrow to the gap', 'Red when urgent'], ['Arrow turns red if urgent', 'Blinks for big moves'], ['Arrow blinks, big moves', 'A bigger arrow'], ['A bigger arrow', 'Forecast-on icon'],
    ['Forecast-on icon', 'Icon lights for gaps'], ['Icon lights for gaps', 'A tick sound'], ['Tick sound for gaps', 'Arrow shows distance'], ['Arrow shows distance', 'Stronger cues'], ['Stronger cues', 'Icon shows gap size'],
    ['Icon shows gap size', 'Stronger cues'], ['Stronger cues', 'All cues together'], ['All cues together', 'Fully upgraded']],
};
export const hintWords = (lineId, level) => { const t = HINT_WORDS[lineId], r = t && t[Math.max(0, Math.min(12, Math.floor(level) || 0))]; return r ? { now: r[0], next: r[1] } : null; };
