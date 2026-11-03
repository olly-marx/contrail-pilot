// DECLARED, not inferred (research/UX-MASTER-PLAN.md C0, D3 rule 14): every menu screen, its one primary action, its scroll policy
// and its text budget. The UX gates (tests/fitscreen.cjs, overlap.cjs, taptargets.cjs) read this table; a screen that is not here is
// not gated, and tests/uxscreens.cjs fails if a screen section of index.html is missing from it.
//   root      selector of the screen's overlay (the thing that scrolls)
//   primary   selector of the ONE primary action ('' = none: a trophy room)
//   first     selector of the first card/row that must be on the first screen ('' = none)
//   scroll    'fits'  = the whole screen fits the viewport above the tab bar (scrollHeight <= clientHeight, no scrolling at all)
//             'first' = the screen may scroll, but `first` and `primary` must be visible above the bar without scrolling
//   enforce   per check, whether the gate FAILS on a violation today. false = PENDING: the screen is red on live and the release named
//             in `from` turns it on. A pending check that now PASSES also fails the gate ("flip it to true"): the table cannot go stale
//             and the gate is shown to see today's defect every run. Each release flips ITS screens' flags (UX-MASTER-PLAN F4).
//   budget    visible text lines before any tap (C0); read by the Node text gate (textbudget2), not by these browser gates
export const SCREENS = {
  results:  { root: '#results',  primary: '#againBtn',               first: '#rBank',           scroll: 'fits',  budget: 10, enforce: { fit: true,  overlap: true,  taps: false }, from: 'R1' },
  home:     { root: '#title',    primary: '#goBtn',                  first: '#hubNext',         scroll: 'fits',  budget: 25, enforce: { fit: false, overlap: false, taps: false }, from: 'R3' },
  missions: { root: '#missions', primary: '.mrow',                   first: '.mrow',            scroll: 'first', budget: 2,  enforce: { fit: true,  overlap: true,  taps: false }, from: 'R4' },
  hangar:   { root: '#hangar',   primary: '#hFleet .rowc-price',     first: '#hFleet .rowc',    scroll: 'first', budget: 1,  enforce: { fit: false, overlap: true,  taps: false }, from: 'R5' },
  nature:   { root: '#nature',   primary: '#wProjects .rowc-price',  first: '#wProjects .rowc', scroll: 'first', budget: 1,  enforce: { fit: false, overlap: true,  taps: false }, from: 'R6' },
  boards:   { root: '#boards',   primary: '',                        first: '',                 scroll: 'fits',  budget: 1,  enforce: { fit: true,  overlap: true,  taps: false }, from: 'R9' },
};
// The result variants the `fitscreen` gate renders for RESULTS (a single "a flight" is not a gate). Built in tools/uxlib.cjs.
export const RESULT_VARIANTS = ['rich', 'seven', 'animalbadge', 'plain', 'crash', 'first', 'school'];
export const MIN_VARIANTS = 6;
// Sizes the gates run at (decision 9: 320x568 is a gated size).
export const VIEWPORTS = [[390, 667], [320, 568]];
