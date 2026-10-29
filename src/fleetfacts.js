// Info cards for the plane side (eras 1-3, 2026-10-23). Every fact comes from the fact-check
// research/plane-verification-eras.md (row numbers in brackets) or plane-verification.md, with its
// verdict:
//   'real'  CONFIRMED by a primary source          -> card says REAL, with the source
//   'hist'  confirmed by secondary/history sources -> card says REAL (history sources)
//   'guess' UNCONFIRMED                            -> card says GAME GUESS: not checked yet
// Level names must match src/fleet.js exactly (tests/fleetfacts.cjs checks every level has a card).
// A level without its own fact ("Bigger horseshoe") shows its line's card and says it is a better
// version of the level before.

export const LINE_INFO = {
  engines: { what: 'The engines push the plane along. Better engines burn less fuel for the same trip.', why: 'Less fuel burned means less CO2, and less warming.' },
  body: { what: 'The wings and body: their shape and what they are made of.', why: 'A lighter, smoother plane needs less push, so it burns less fuel.' },
  cabin: { what: 'Where the passengers sit. A comfier cabin fills more seats and earns more in fares.', why: 'A fuller plane makes less CO2 for each passenger.' },
  forecast: { what: 'Weather forecasts show where the icy air is before you reach it.', why: 'Forecasts are not perfect: some icy air they show is not there, and some they miss. Real forecasts of icy air are often wrong (ERA5 skill 0.2 to 0.4, CONFIRMED).' },
  atc: { what: 'Air traffic controllers keep planes apart and guide them round trouble.', why: 'Good control makes the sky a little kinder: more room in gaps, fewer bumps and birds.' },
  ops: { what: 'How the airline runs the flight: fuel, speed, weight.', why: 'Small savings on every flight add up to a lot less CO2.' },
  magnet: { what: 'A pretend gadget that pulls floating seeds towards your plane.', why: 'More seeds on board means more seeds when you land safely.' },
  hold: { what: 'The hold under the floor carries bags and cargo.', why: 'Fly past airports and your landing bonus grows. A bigger hold makes it grow faster. Crash, and you lose it all!' },
  gear: { what: 'Help with landing: radio beams and computers that line you up with the runway.', why: 'A wider landing window means more safe landings.' },
  sensors: { what: 'Instruments on the plane that measure the air around it.', why: 'Knowing the air helps you dodge warming contrails at night, for more ice crystals.' },
  autopilot: { what: 'The autopilot can fly the plane for a while. Grab its pick-up in the sky!', why: 'A better autopilot lasts longer and turns up more often.' },
};

const F = (fact, status, src) => ({ fact, status, src });
export const LEVEL_FACTS = {
  // 787 Dreamliner, truss-braced wing, hydrogen (eras 4-6): CHECKED 2026-10-29 against manufacturer / NASA / trade sources.
  'GEnx turbofans': F('Airlines buying a 787 choose its engines: the GE GEnx-1B or the Rolls-Royce Trent 1000.', 'real', 'GE Aerospace / Rolls-Royce; airwaysmag.com 787 GEnx vs Trent 1000; ainonline.com 2012-07-11 engine options'),
  'One-piece carbon-fibre barrel': F('About half of a 787, by weight, is carbon-fibre composite. Its body is made in whole tube-shaped sections, not riveted metal panels.', 'real', 'SAMPE (nasampe.org Boeing787): ~50% composite by weight, one-piece barrels; Kawasaki Heavy Industries R&D'),
  'Dimmable windows': F('A 787 has no window blinds: you press a button and the glass slowly darkens, through five levels.', 'real', 'Boeing media room 2005-12-15 (PPG electrochromic windows); Gizmodo, how the 787 windows work'),
  'Open-fan engines: no casing round the fan': F('An open-fan engine has huge fan blades with no casing round them. Its makers aim for about 20% less fuel than today\'s engines; it is still being tested.', 'real', 'GE Aerospace / CFM RISE programme (a target, not a result; entry into service aimed at the mid-2030s)'),
  'Folding wingtips (fit at the gate)': F('NASA and Boeing studied this kind of wing for the X-66 test plane, paused in 2025. Its long wings may need tips that fold at the gate.', 'real', 'NASA news release 2023 (X-66A); NASA NTRS 20250002858 airport study; X-66 flight demonstrator paused May 2025 (militaryaerospace.com); Boeing 777X folding wingtips'),
  'Wide cabin in the wing': F('In a blended wing like JetZero\'s planned Z4, the cabin is short and very wide, with fewer middle seats.', 'real', 'JetZero / United Airlines announcement, April 2025 (Z4: ~250 seats, service aimed at the early 2030s). Its fuel-saving claims are disputed (Hamburg University of Applied Sciences, 2026), so the game does not quote them.'),
  'Fuel-cell pods along the wing': F('A fuel cell turns hydrogen and oxygen from the air into electricity. Its only exhaust is water. Hydrogen airliners are still many years away.', 'real', 'US DOE Hydrogen and Fuel Cell Technologies Office (fuel cell basics); Airbus ZEROe fuel-cell concept, 2022'),
  'Insulated liquid-hydrogen tanks': F('Liquid hydrogen must stay at -253 C, so it needs big, well-insulated tanks: about four times the space of kerosene.', 'real', 'Airbus ZEROe; Sustainability Magazine 2025 on the ZEROe delay (cryogenic tanks ~4x the volume of kerosene tanks)'),
  // Was 'cabin can have wide windows at the front' (unsupported: blended wings have FEW windows); softened to a labelled idea.
  'Panorama seats': F('Blended wings have few windows, since most seats are far from the sides. One idea is screens that show the view outside.', 'guess', 'design idea, not a flying feature; no manufacturer source. Airbus delayed its hydrogen airliner (ZEROe) by 5-10 years in Feb 2025 (Bloomberg, 2025-02-07).'),
  // Comet 4
  'Rolls-Royce Avon turbojets, tuned': F('The Comet 4 had four Rolls-Royce Avon jet engines buried inside its wings.', 'real', 'enginehistory.org, de Havilland Comet [1]'),
  'Thrust reversers': F('Comet 4 engines could push air forwards to help the plane slow down after landing.', 'hist', 'enginehistory.org, Avon 525 reverser [2]'),
  'Pinion fuel tanks': F("Fuel pods on the front of the Comet 4's wings let it fly further without stopping.", 'real', 'Plane & Pilot, Comet 4 [3]'),
  'Oval windows and thicker skin': F('After two Comets broke up in 1954, tests found tiny cracks at the corners of cut-outs, so later Comets got oval windows and thicker skin.', 'hist', 'Comet accident inquiry, 1954 [4]'),
  'Tourist class': F("In 1952 airlines started cheaper 'tourist class' tickets so more people could fly.", 'hist', 'IATA history [5]'),
  'Jet-age galley': F('Jets flew so high and smoothly that airlines could serve hot meals above the weather.', 'guess', 'not checked yet'),
  // 747
  'JT9D high-bypass turbofans': F('The first jumbo jet used giant JT9D fan engines that push lots of air gently. They entered service on 22 January 1970.', 'real', 'Pratt & Whitney JT9D heritage [6]'),
  'Hush-kit nacelles': F('Engine covers lined with sound-soaking material made jets quieter for people near airports.', 'guess', 'not checked yet'),
  'Next-gen engines (747-400 era)': F('The 747-400 of 1989 had newer engines that burned less fuel than the first jumbos.', 'hist', 'Boeing 747-400 history [8]'),
  'Stretched upper deck (747-300)': F('The 747-300 (1983) had a longer hump on top, so more people could sit upstairs.', 'hist', 'Boeing history [7]'),
  'Winglets (747-400)': F("The 747-400's upturned wingtips make the plane slip through the air with less fuel.", 'real', 'Boeing 747 history [8]'),
  'Glass cockpit': F('The 747-400 swapped hundreds of dials for six TV-like screens.', 'hist', 'Boeing 747-400 history [9]'),
  'Upper-deck lounge': F('The first jumbos had a lounge upstairs, up a spiral staircase.', 'hist', 'Pan Am / Boeing history [10]'),
  'Wide-body economy, nine or ten across': F('Jumbo jets were so wide that rows held nine or ten seats.', 'hist', 'Boeing 747 cabin history [11]'),
  'Business class': F("Around 1979 airlines like Qantas made a new 'business class' between first and economy. (Who was first is still argued about!)", 'hist', 'Executive Traveller [12]'),
  // 1990s twin
  'FADEC: engines run by computer': F('From the 1980s, computers began running jet engines, using just the right amount of fuel.', 'hist', 'Pratt & Whitney PW2000 history [13]'),
  'Giant-fan engines': F("The GE90 (1995) had a fan about 3.1 m across: so big you could almost fit a small plane's body inside it.", 'hist', 'GE Aerospace, GE90 [14]'),
  'Low-emission combustor': F('Cleaner engines make about 1,000 times less soot, but the contrail ice barely changes: the water still freezes on tiny bits in the air.', 'real', 'Voigt et al. 2026 [plane-verification.md]'),
  'Wide-chord fan blades': F('Wide, curved fan blades let engines push more air with less noise and fuel.', 'hist', 'Rolls-Royce RB211-535E4, 1984 [15]'),
  'Composite tail': F('Tails made of carbon fibre are lighter than metal, so the plane needs less fuel.', 'real', 'Airbus / Boeing history [16]'),
  'Winglets (A330/A340, 1993)': F('The A330 and A340 (1993) had upturned winglets that cut drag at the wingtips.', 'hist', 'Airbus history [17]'),
  'Fly-by-wire': F("In fly-by-wire planes, computers move the wings' flaps when the pilot moves the stick. The A320 (1988) was the first digital one.", 'real', 'Airbus history [18]'),
  "Riblet film, 'sharkskin'": F("Tiny grooves like a shark's skin help air slide over the plane. Airbus tested them on an A320 in the late 1980s; airlines only started using them in 2022.", 'real', 'Airbus test; Lufthansa Technik AeroSHARK [19]'),
  'Seat-back screens': F('In the 1990s, screens in the seat backs let every passenger choose a film.', 'guess', 'not checked yet'),
  'XL overhead bins': F('Bigger lockers above the seats mean bags fit on board, so more people fly happily.', 'guess', 'not checked yet'),
  'Premium economy (1992)': F("In 1992 airlines invented 'premium economy': a bit more room for a bit more money.", 'real', 'Runway Girl Network [20]'),
  'Flat beds in first class (1995)': F('In the mid-1990s first-class seats turned into flat beds for sleeping on long flights.', 'hist', 'British Airways history [21]'),
  // Systems
  'Pilot reports and weather balloons': F("Pilots radio what weather they see, so the planes behind them know what's coming. Balloon sensors could read the air up to 2.4 times too dry!", 'hist', 'FAA AIM 7-1-18 [22]; plane-verification.md'),
  'First computer weather forecasts': F('The first computer weather forecasts were made in Sweden in 1954 and the USA in 1955.', 'hist', 'NOAA history [23]'),
  'Global forecast model (ECMWF, 1979)': F('In 1979 the European forecast centre started forecasting the whole world\'s weather days ahead.', 'hist', 'ECMWF history [23]'),
  'Humidity sensors on airliners (MOZAIC, 1994)': F('From 1994, airliners carried sensors that measured how damp the air was on real flights.', 'real', 'MOZAIC programme [plane-verification.md]'),
  'Sharing airliner data': F('Planes share what they measure, so forecasts for everyone get better.', 'guess', 'not checked yet'),
  'Fixed airways and radio': F('Planes followed fixed routes in the sky, talking to controllers by radio.', 'guess', 'not checked yet'),
  'Computer radar with altitude readout': F("In the 1970s computers put each plane's name and height right on the radar screen.", 'hist', 'FAA history [24]'),
  'RVSM: more flight levels (North Atlantic, 1997)': F('From 1997 planes over the North Atlantic could fly 1,000 feet apart instead of 2,000, so there were more heights to choose from.', 'real', 'RVSM, March 1997 [plane-verification.md]'),
  'Bird-strike advisories': F('Airports track birds and warn pilots so planes and flocks stay apart.', 'guess', 'FAA wildlife strike database from 1990 [25]: date not checked'),
  'Standard kerosene jet fuel (Jet A, 1959)': F('By the end of the 1950s jet fuel became a standard kerosene recipe used at airports everywhere.', 'hist', 'ASTM D1655, 1959 [26]'),
  'Best cruise speed': F('Flying a little slower than top speed can save a lot of fuel.', 'guess', 'true in general; no dated source [27]'),
  'Oil-crisis savings: lighter loads (1973)': F('When oil got expensive in 1973, airlines found clever ways to burn less fuel.', 'hist', 'NASA ACEE programme [28]'),
  'Taxi on fewer engines': F('Planes can taxi with some engines switched off to save fuel.', 'guess', 'no dated source [29]'),
  'Cost-index flight planning': F('Computers pick a speed that balances fuel cost against time.', 'hist', 'Boeing AERO, Cost Index [30]'),
  'Weight-saving programme': F('Every kilo matters: lighter seats, trolleys and less spare water all save fuel.', 'guess', 'not checked yet'),
  // Gadgets
  'Horseshoe magnet': F('A pretend gadget! Real planes do not collect seeds with magnets.', 'guess', 'fiction'),
  'Electromagnet': F('Electromagnets are made by sending electricity through a coil of wire.', 'guess', 'fiction (a real science idea)'),
  'Neodymium magnet': F('Neodymium magnets, invented in 1982, are the strongest permanent magnets.', 'real', 'Sagawa et al. 1984 [31]'),
  'Mail sacks': F('Early airliners earned money carrying the post as well as passengers.', 'guess', 'not checked yet'),
  'Cargo containers': F('Jumbo jets carried luggage in metal boxes shaped to fit the curved hold.', 'hist', 'IATA ULD history [32]'),
  'Roller floor': F('Rollers in the hold floor let heavy containers slide in and out quickly.', 'guess', 'not checked yet'),
  'ILS beams': F('Radio beams guided pilots down to the runway even in fog.', 'hist', 'ICAO / FAA history [33]'),
  'Autoland (Trident, 1965)': F('In 1965 a Trident jet landed itself with passengers aboard: a world first.', 'real', 'Aircraft Engineering 1965 [34]'),
  'GPS approaches': F('In the 1990s satellites began guiding planes in to land.', 'hist', 'FAA history [35]'),
  'Thermometer': F('A thermometer on the nose tells the crew how cold the air is. Contrails form when the air is cold and damp.', 'guess', 'not checked yet'),
  'Weather radar': F("Radar in the plane's nose spots storms ahead.", 'hist', 'mid-1950s [37]'),
  'Humidity sensor (WVSS-I)': F('From 1997, some UPS cargo jets measured how damp the air was, to help forecasts.', 'real', 'NOAA AMDAR / NASA Spinoff [36]'),
  'Height hold': F('Early autopilots could hold the plane level at one height.', 'guess', 'not checked yet'),
  'Autothrottle': F('An autothrottle sets the engine power by itself. They were in service by the 1960s.', 'hist', '[38]'),
  'Flight management computer': F('A flight computer plans the whole trip and flies the best path. The first came on the 767 in 1982.', 'hist', '[38]'),
};

export const STATUS_LABEL = { real: 'REAL', hist: 'REAL (history sources)', guess: 'GAME GUESS: not checked yet' };

// The card for one level of one line: its own fact, or the line's with "a better version".
export function levelCard(lineKey, levelName, prevName) {
  const own = LEVEL_FACTS[levelName];
  return { ...LINE_INFO[lineKey], fact: own ? own.fact : `A better version of ${prevName}.`, status: own ? own.status : 'guess', src: own ? own.src : 'game upgrade' };
}
