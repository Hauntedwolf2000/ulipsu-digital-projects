/* Guide narration (DP-516). Two kinds of spoken lines, each fact stated once:
   NARRATION: the guide's own line (a situation, why it matters, what you learn). Shown in the guide's bubble and read aloud.
   INSTR:     the one-line instruction that is already on the screen (DP-510). It is only READ ALOUD, never re-shown by the guide.
   Clips: assets/audio/<id>.mp3 for NARRATION, assets/audio/i_<screen>.mp3 for INSTR. Screens whose instruction contains learner data are not read aloud (v3).
   v3: facts follow India's four seasons as taught in NCERT Geography: Winter Dec-Feb, Summer Mar-May, Monsoon Jun-Sep, Post-monsoon Oct-Nov. Each line states one fact. */
window.NARRATION = {
  intro1: "Hi, I'm Sunny, your weather guide.",
  intro2: "Weather changes our plans every day. In this project, you will use weather facts to make good decisions.",
  introA: "Picnic Day: find the best December day for your class picnic.",
  introB: "Out Today: plan when to go out today, what to wear and what to do.",
  introC: "Sports Day: help the coach choose the best November day for the races.",
  intro3: "You will learn to read thermometers and the sky, make a chart, and decide using clues.",
  mA: "Your class picnic is in December. In North India, December days can be cold, and some are rainy.",
  a1: "A picnic day must be warm enough: 20°C or more.",
  a2: "A picnic day must also be dry. Grey clouds can bring rain.",
  a3: "A chart makes the warm days easy to spot.",
  a4: "Count the days that are warm enough.",
  a5: "Now use both clues to sort the days.",
  a6: "Tell the class which day you chose.",
  mB: "You want to go out today. Plan when to go, what to wear and what to do.",
  b1: "First, find the season. It tells you what weather to expect.",
  b2: "Temperatures help you choose the time and the clothes.",
  b3: "The sky helps you choose clothes and an activity.",
  b4: "Now use the season to choose the best time.",
  b5: "Choose clothes for the weather at that time.",
  b6: "Choose an activity for that weather.",
  mC: "Sports Day is in November. Help the coach pick the best day for the races.",
  c1: "First, start the coach's forecast log.",
  c2: "A chart shows which days are hotter.",
  c3: "Rain can stop the races. Grey clouds can bring rain.",
  c4: "Running is harder on a hot day.",
  c5: "Ordering the days shows which are less hot.",
  c6: "Now use all your clues to pick the day.",
  // v3: no narration once the six tasks are done (solution, Make it yours, Review, certificate)
};
// The on-screen instruction for each screen (one short line per bubble). Screens b1, b4, b5, b6, c1 add learner data on screen and are not read aloud.
window.INSTR = {
  pick: ['Pick a situation to solve.'],
  a1: ['Clue 1: How warm is each day?', 'Read each thermometer. Enter the °C.'],
  a2: ['Clue 2: Is each day dry?', 'Drag the right word onto each picture.'],
  a3: ['Which days reach 20°C?', 'Drag each dot to its temperature.'],
  a4: ['How many days are 20°C or more?'],
  a5: ['Picnic day: 20°C or more, and Sunny or Partly cloudy.', 'Sort each day.'],
  a6: ['Tell the class.', 'Fill in the picnic notice.'],
  aS: ['What your clues decided'],
  b2: ['How warm is it at each time?', 'Read each thermometer. Enter the °C.'],
  b3: ['What is the sky like at each time?', 'Drag the right word onto each picture.'],
  bS: ['What your clues decided'],
  c2: ['Which days are hotter?', 'Drag each dot to its temperature.'],
  c3: ['How many days are Rainy or Cloudy?'],
  c4: ['Which day is the hottest?'],
  c5: ['Put the days in order of temperature.', 'Lowest first, highest last.'],
  c6: ['Race day: Sunny or Partly cloudy, with the lower temperature.', 'Pick the day.'],
  cS: ['What your clues decided'],
  personalise: ['Edit your report if you like, then choose a look below.'],
  review: ['Check everything before you send it.']
};
