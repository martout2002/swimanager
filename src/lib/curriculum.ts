/**
 * The syllabus. Static because it is identical for every student and the Curriculum
 * screen is read-only.
 * ponytail: curriculum lives in code; move it to the DB when the owner can edit it.
 */

export type SubSkill = { id: string; text: string; weight: number; checked: boolean };

export type Criterion = {
  id: string;
  text: string;
  checked: boolean;
  subSkills: SubSkill[];
  needsVerify?: boolean;
  timed?: boolean;
  thresholdSec?: number;
  thresholdLabel?: string;
  recordedValue?: string;
};

export type Sequence = { name: string; criteria: Criterion[] };
export type StageTree = { name: string; sequences: Sequence[] };

export const STAGE_ORDER = [
  'Foundation 1',
  'Foundation 2',
  'Foundation 3',
  'Foundation 4',
  'Foundation 5',
  'Stage 1',
  'Stage 2',
  'Stage 3',
  'Bronze',
  'Silver',
  'Gold',
] as const;

/**
 * Blurbs are the Key Milestones text from the operator's own stage checklist. Foundation
 * is the operator's pre-SwimSafer progression, split into five gated levels — students
 * only attempt SwimSafer Stage 1 after Foundation 5.
 */
export const STAGE_ROADMAP: { name: string; official: boolean; blurb: string }[] = [
  { name: 'Foundation 1', official: false, blurb: 'Confidence building — blowing bubbles, full face submersion, kicking with a float and with the face submerged, and confidence games. Differs a lot for students with fear of the water.' },
  { name: 'Foundation 2', official: false, blurb: 'Independence without a float — rocket kicks (min. 2m), front float (min. 10s), back float (min. 10s), and jumping into the water.' },
  { name: 'Foundation 3', official: false, blurb: 'Survival skills — rocket kicks with breathing (min. 5m), treading water (min. 10s), turning from a front float onto a back float, and a full jump-tread-kick-back sequence.' },
  { name: 'Foundation 4', official: false, blurb: 'Freestyle — swim front crawl for at least 5m.' },
  { name: 'Foundation 5', official: false, blurb: 'Backstroke — swim backstroke for at least 5m. After this, students are ready to attempt SwimSafer Stage 1.' },
  { name: 'Stage 1', official: true, blurb: 'A 5-second front and back float with recovery to standing; 10m movement on the front; 5m on the back.' },
  { name: 'Stage 2', official: true, blurb: '25m of continuous movement on the front; scull, float or tread for 30 seconds; a 25m swim wearing a PFD after a clothed jump.' },
  { name: 'Stage 3', official: true, blurb: '25m each of front crawl, backstroke, breaststroke and survival backstroke; scull, float or tread for 50 seconds; 50m with a PFD, clothed.' },
  { name: 'Bronze', official: true, blurb: '25m each of four strokes, 100m continuous; scull, float or tread for 2 minutes; a 3-minute clothed survival swim.' },
  { name: 'Silver', official: true, blurb: 'Timed swims — 50m front crawl under 1:30, breaststroke under 1:50, backstroke under 1:40 — plus survival back, sidestroke, dolphin kick and 30 seconds of H.E.L.P.' },
  { name: 'Gold', official: true, blurb: 'Timed 100m swims across all strokes, a roughly 400m mixed survival sequence, 1 minute of H.E.L.P., and building a self-made float from clothing.' },
];

/** Confirmed once per venue. */
export const POOL_PROFILES: Record<
  string,
  { lengthM: number; widthM: number; depth: string; lanes: number; teachingZone: string; equipment: string[] }
> = {
  "D'Leedon": {
    lengthM: 25,
    widthM: 12,
    depth: '1.0m (shallow end) to 2.0m (deep end)',
    lanes: 6,
    teachingZone: 'Shallow end, roughly 8m × 6m, ropes at 1.2m',
    equipment: ['Kickboards', 'Pool noodles', 'Pull buoys', 'Child-size PFDs', 'Sinking rings'],
  },
  'Amber Residences': {
    lengthM: 15,
    widthM: 6,
    depth: '1.0m constant depth (condo pool)',
    lanes: 0,
    teachingZone: 'Full pool — no lane ropes, shared with residents outside the booked slot',
    equipment: ['Kickboards', 'Pool noodles'],
  },
};

const FOUNDATION_1: StageTree = {
  name: 'Foundation 1 — Confidence Building',
  sequences: [
    { name: 'Brave the fear', criteria: [
      { id: 'f1-1', text: 'Comfortable blowing bubbles in the water', checked: false, subSkills: [] },
      { id: 'f1-2', text: 'Full face submersion', checked: false, subSkills: [] },
      { id: 'f1-3', text: 'Kicking with a float', checked: false, subSkills: [] },
      { id: 'f1-4', text: 'Kicking with face submersion', checked: false, subSkills: [] },
      { id: 'f1-5', text: 'Takes part in games that build water confidence (KIDS)', checked: false, subSkills: [] },
    ]},
  ],
};

const FOUNDATION_2: StageTree = {
  name: 'Foundation 2 — Independence (without float)',
  sequences: [
    { name: 'Independence', criteria: [
      { id: 'f2-1', text: 'Rocket kicks, minimum 2m', checked: false, subSkills: [] },
      { id: 'f2-2', text: 'Front float, minimum 10s', checked: false, subSkills: [] },
      { id: 'f2-3', text: 'Back float, minimum 10s', checked: false, subSkills: [] },
      { id: 'f2-4', text: 'Jumping into the water (KIDS)', checked: false, subSkills: [] },
    ]},
  ],
};

const FOUNDATION_3: StageTree = {
  name: 'Foundation 3 — Survival Skills',
  sequences: [
    { name: 'Survival basics', criteria: [
      { id: 'f3-1', text: 'Rocket kicks with breathing, minimum 5m', checked: false, subSkills: [] },
      { id: 'f3-2', text: 'Tread water, minimum 10s', checked: false, subSkills: [] },
      { id: 'f3-3', text: 'Front float, turning onto a back float', checked: false, subSkills: [] },
      { id: 'f3-4', text: 'Jump into water → tread water → rocket kick back to the wall (KIDS)', checked: false, subSkills: [] },
    ]},
  ],
};

const FOUNDATION_4: StageTree = {
  name: 'Foundation 4 — Freestyle',
  sequences: [
    { name: 'Freestyle', criteria: [
      { id: 'f4-1', text: 'Swim freestyle (front crawl), minimum 5m', checked: false, subSkills: [] },
    ]},
  ],
};

const FOUNDATION_5: StageTree = {
  name: 'Foundation 5 — Backstroke',
  sequences: [
    { name: 'Backstroke', criteria: [
      { id: 'f5-1', text: 'Swim backstroke, minimum 5m', checked: false, subSkills: [] },
    ]},
  ],
};

/**
 * Official criteria are locked; the coaching sub-skills underneath each are editable.
 * The `checked` defaults here double as Kai Hsu's seed — every other student gets a
 * blanked copy, see `scripts/seed.ts`.
 */
const STAGE_1: StageTree = {
  name: 'Stage 1',
  sequences: [
    { name: 'Sequence 1A — without goggles', criteria: [
      { id: 'a1', text: 'Enter the water with a slide-in entry', checked: true, subSkills: [] },
      { id: 'a2', text: 'Swim on the back 5m', checked: true, subSkills: [] },
      { id: 'a3', text: 'Submerge head, open eyes, blow bubbles, and identify an object on the pool floor', checked: false, subSkills: [] },
      { id: 'a4', text: 'Perform a front float for 5s and recover to standing', checked: false, subSkills: [
        { id: 'a4-1', text: 'Face in the water, relaxed', weight: 1, checked: true },
        { id: 'a4-2', text: 'Arms extended forward', weight: 1, checked: true },
        { id: 'a4-3', text: 'Hips rise to the surface', weight: 1, checked: false },
        { id: 'a4-4', text: 'Controlled recovery to standing', weight: 1, checked: true },
      ]},
      { id: 'a5', text: 'Perform a back float for 5s and recover to standing', checked: true, subSkills: [] },
      { id: 'a6', text: 'Swim 10m (front crawl or breaststroke)', checked: false, subSkills: [] },
      { id: 'a7', text: 'Signal distress and call for help', checked: true, subSkills: [] },
      { id: 'a8', text: 'Grasp the float and float for 10s', checked: true, subSkills: [] },
      { id: 'a9', text: 'Move with the float to the pool edge', checked: true, subSkills: [] },
      { id: 'a10', text: 'Exit safely from the water', checked: true, subSkills: [] },
    ]},
    { name: 'Sequence 1B — shorts & t-shirt', criteria: [
      { id: 'b1', text: 'Correctly fit a PFD and jump into the water', checked: false, subSkills: [] },
      { id: 'b2', text: 'Float for 30s and exit', checked: false, subSkills: [] },
    ]},
    { name: 'Swim', criteria: [
      { id: 's1', text: 'Swim 25m (front crawl or breaststroke)', checked: false, subSkills: [
        { id: 's1-1', text: 'Body position — horizontal, streamlined', weight: 1, checked: true },
        { id: 's1-2', text: 'Flutter kick from the hips', weight: 1, checked: true },
        { id: 's1-3', text: 'High-elbow arm recovery', weight: 1, checked: false },
        { id: 's1-4', text: 'Rhythmic side breathing', weight: 2, checked: false },
        { id: 's1-5', text: 'Consistent stroke timing', weight: 1, checked: true },
      ]},
      { id: 's2', text: 'Swim 15m (backstroke or survival backstroke)', checked: true, subSkills: [] },
    ]},
    { name: 'Theory and water safety knowledge', criteria: [
      { id: 't1', text: 'Water safety theory quiz', checked: false, subSkills: [], needsVerify: true },
    ]},
  ],
};

const STAGE_2: StageTree = {
  name: 'Stage 2',
  sequences: [
    { name: 'Sequence 2A — without goggles', criteria: [
      { id: 'c1', text: 'Enter the water with a step-in entry', checked: false, subSkills: [] },
      { id: 'c2', text: 'Front float 10s, swim 5m on front, roll over and back float 10s', checked: false, subSkills: [] },
      { id: 'c3', text: 'Scull, float or tread water for 30s', checked: false, subSkills: [] },
      { id: 'c4', text: 'In chest-deep water, perform a feet-first surface dive and recover an object', checked: false, subSkills: [
        { id: 'c4-1', text: 'Feet-first entry, vertical body', weight: 1, checked: false },
        { id: 'c4-2', text: 'Equalise or clear ears if needed', weight: 1, checked: false },
        { id: 'c4-3', text: 'Locate and grasp the object', weight: 1, checked: false },
      ]},
      { id: 'c5', text: 'Resurface and exit safely from the water', checked: false, subSkills: [] },
    ]},
    { name: 'Sequence 2B — shorts & t-shirt', criteria: [
      { id: 'd1', text: 'Swim 15m using any survival stroke', checked: false, subSkills: [] },
      { id: 'd2', text: 'Swim to the pool edge and climb out', checked: false, subSkills: [] },
      { id: 'd3', text: 'Correctly fit a PFD and jump into water at least 1.4m deep, swim 25m with PFD, climb out', checked: false, subSkills: [] },
    ]},
    { name: 'Swim', criteria: [
      { id: 'e1', text: 'Swim 50m continuously: 25m front crawl, 25m backstroke', checked: false, subSkills: [] },
    ]},
    { name: 'Theory and water safety knowledge', criteria: [
      { id: 'f1', text: 'Water safety theory quiz', checked: false, subSkills: [], needsVerify: true },
    ]},
  ],
};

const STAGE_3: StageTree = {
  name: 'Stage 3',
  sequences: [
    { name: 'Sequence 3A — without goggles', criteria: [
      { id: 'st3-1', text: 'Enter the water with a stride or straddle entry in deep water', checked: false, subSkills: [] },
      { id: 'st3-2', text: 'Swim 25m breaststroke, 25m survival backstroke', checked: false, subSkills: [] },
      { id: 'st3-3', text: 'Scull head-first on the back for 10s and recover', checked: false, subSkills: [] },
      { id: 'st3-4', text: 'Scull, float or tread for a further 50s', checked: false, subSkills: [] },
      { id: 'st3-5', text: 'In chest-deep water, swim through hoops placed 2m apart (flutter kick), surface and exit', checked: false, subSkills: [] },
    ]},
    { name: 'Sequence 3B — shorts & t-shirt', criteria: [
      { id: 'st3-6', text: 'Swim 25m to a PFD', checked: false, subSkills: [] },
      { id: 'st3-7', text: 'Correctly fit a PFD in the water, swim 50m with PFD and exit', checked: false, subSkills: [] },
    ]},
    { name: 'Swim', criteria: [
      { id: 'st3-8', text: 'Swim 115m continuously: 25m front crawl, 25m breaststroke, 25m backstroke, 25m survival backstroke, 15m sidestroke', checked: false, subSkills: [] },
    ]},
    { name: 'Theory and water safety knowledge', criteria: [
      { id: 'st3-9', text: 'Water safety theory quiz', checked: false, subSkills: [], needsVerify: true },
    ]},
  ],
};

/**
 * Bronze / Silver / Gold follow the official checklist's category table, since the
 * tracker does not break these three into lettered sequences the way it does Stages 1-3.
 */
const BRONZE: StageTree = {
  name: 'Bronze',
  sequences: [
    { name: 'Entries & Exits', criteria: [
      { id: 'brz-1', text: 'Compact jump entry', checked: false, subSkills: [] },
    ]},
    { name: 'Sculling & Body Orientation', criteria: [
      { id: 'brz-2', text: 'Forward somersault', checked: false, subSkills: [] },
      { id: 'brz-3', text: 'Scull, float or tread water for 2 minutes', checked: false, subSkills: [] },
    ]},
    { name: 'Underwater Skills', criteria: [
      { id: 'brz-4', text: 'Feet-first surface dive to at least 1.4m, swim through hoops placed 2m apart', checked: false, subSkills: [] },
    ]},
    { name: 'Movement & Strokes', criteria: [
      { id: 'brz-5', text: 'Swim 100m continuously: 25m each of front crawl, backstroke, breaststroke and survival backstroke', checked: false, subSkills: [] },
    ]},
    { name: 'Survival & Activity Skills (clothed)', criteria: [
      { id: 'brz-6', text: 'Clothed: swim slowly for 3 minutes, changing between survival backstroke, sidestroke and survival breaststroke every 15m', checked: false, subSkills: [] },
      { id: 'brz-7', text: 'Wave and call for help', checked: false, subSkills: [] },
      { id: 'brz-8', text: 'Retrieve a flotation aid thrown 2m away and use it to reach the edge', checked: false, subSkills: [] },
    ]},
    { name: 'Rescue Skills', criteria: [
      { id: 'brz-9', text: 'Throw a flotation aid to a partner 2m away and instruct them to kick to the edge', checked: false, subSkills: [] },
    ]},
    { name: 'Theory and water safety knowledge', criteria: [
      { id: 'brz-10', text: 'Water safety theory quiz', checked: false, subSkills: [], needsVerify: true },
    ]},
  ],
};

const SILVER: StageTree = {
  name: 'Silver',
  sequences: [
    { name: 'Entries & Exits', criteria: [
      { id: 'slv-1', text: 'Dive entry from a crouching position', checked: false, subSkills: [] },
    ]},
    { name: 'Sculling & Body Orientation', criteria: [
      { id: 'slv-2', text: 'Backward somersault', checked: false, subSkills: [] },
      { id: 'slv-3', text: 'Scull, float or tread water while putting on a PFD in the water', checked: false, subSkills: [] },
    ]},
    { name: 'Underwater Skills', criteria: [
      { id: 'slv-4', text: 'Feet-first surface dive to at least 1.4m, swim through hoops placed 3m apart', checked: false, subSkills: [] },
    ]},
    { name: 'Movement & Strokes (timed)', criteria: [
      { id: 'slv-5', text: '50m front crawl', timed: true, thresholdSec: 90, thresholdLabel: '≤ 1:30', recordedValue: '1:42', checked: false, subSkills: [] },
      { id: 'slv-6', text: '50m breaststroke', timed: true, thresholdSec: 110, thresholdLabel: '≤ 1:50', recordedValue: '2:05', checked: false, subSkills: [] },
      { id: 'slv-7', text: '50m backstroke', timed: true, thresholdSec: 100, thresholdLabel: '≤ 1:40', recordedValue: '1:38', checked: true, subSkills: [] },
      { id: 'slv-8', text: '25m survival backstroke', checked: true, subSkills: [] },
      { id: 'slv-9', text: '25m sidestroke', checked: false, subSkills: [] },
      { id: 'slv-10', text: '10m dolphin kick on the front', checked: false, subSkills: [] },
    ]},
    { name: 'Survival & Activity Skills (clothed, long pants)', criteria: [
      { id: 'slv-11', text: 'Straddle jump into deep water', checked: false, subSkills: [] },
      { id: 'slv-12', text: 'Feet-first surface dive, swim through hoops 3m apart, and resurface', checked: false, subSkills: [] },
      { id: 'slv-13', text: '45m quick front crawl', checked: false, subSkills: [] },
      { id: 'slv-14', text: 'Signal for help and receive a thrown PFD', checked: false, subSkills: [] },
      { id: 'slv-15', text: 'Retrieve and fit a PFD while treading water', checked: false, subSkills: [] },
      { id: 'slv-16', text: 'Hold the H.E.L.P. position for 30 seconds', checked: false, subSkills: [] },
      { id: 'slv-17', text: 'Swim 25m wearing the PFD and exit', checked: false, subSkills: [] },
    ]},
    { name: 'Rescue Skills', criteria: [
      { id: 'slv-18', text: 'Throw a PFD to a partner 3m away and instruct them to kick to the edge', checked: false, subSkills: [] },
    ]},
    { name: 'Theory and water safety knowledge', criteria: [
      { id: 'slv-19', text: 'Water safety theory quiz', checked: false, subSkills: [], needsVerify: true },
    ]},
  ],
};

const GOLD: StageTree = {
  name: 'Gold',
  sequences: [
    { name: 'Entries & Exits', criteria: [
      { id: 'gld-1', text: 'Standing dive entry', checked: false, subSkills: [] },
    ]},
    { name: 'Sculling & Body Orientation', criteria: [
      { id: 'gld-2', text: 'Scull, float or tread water while making a self-made float, within 5 minutes', checked: false, subSkills: [] },
    ]},
    { name: 'Underwater Skills', criteria: [
      { id: 'gld-3', text: 'Head-first surface dive (tuck or pike) to at least 1.8m, equalising if needed; swim through hoops placed 5m apart', checked: false, subSkills: [] },
    ]},
    { name: 'Movement & Strokes (timed)', criteria: [
      { id: 'gld-4', text: '100m front crawl', timed: true, thresholdSec: 180, thresholdLabel: '≤ 3:00', recordedValue: '3:20', checked: false, subSkills: [] },
      { id: 'gld-5', text: '100m breaststroke', timed: true, thresholdSec: 240, thresholdLabel: '≤ 4:00', recordedValue: '4:15', checked: false, subSkills: [] },
      { id: 'gld-6', text: '100m backstroke', timed: true, thresholdSec: 200, thresholdLabel: '≤ 3:20', recordedValue: '3:20', checked: true, subSkills: [] },
      { id: 'gld-7', text: '50m survival backstroke', checked: false, subSkills: [] },
      { id: 'gld-8', text: '50m sidestroke', checked: false, subSkills: [] },
      { id: 'gld-9', text: '15m butterfly', checked: false, subSkills: [] },
    ]},
    { name: 'Survival & Activity Skills (clothed, long pants)', criteria: [
      { id: 'gld-10', text: 'Compact jump entry', checked: false, subSkills: [] },
      { id: 'gld-11', text: 'Head-first dive to at least 1.8m', checked: false, subSkills: [] },
      { id: 'gld-12', text: 'Swim through hoops placed 5m apart', checked: false, subSkills: [] },
      { id: 'gld-13', text: '45m front crawl sprint', checked: false, subSkills: [] },
      { id: 'gld-14', text: '50m slow survival stroke', checked: false, subSkills: [] },
      { id: 'gld-15', text: 'Remove trousers and float using them, within 5 minutes', checked: false, subSkills: [] },
      { id: 'gld-16', text: 'Hold the H.E.L.P. position for 1 minute', checked: false, subSkills: [] },
      { id: 'gld-17', text: 'Swim 25m using a self-made float and exit', checked: false, subSkills: [] },
    ]},
    { name: 'Theory and water safety knowledge', criteria: [
      { id: 'gld-18', text: 'Water safety theory quiz', checked: false, subSkills: [], needsVerify: true },
    ]},
  ],
};

export const TEMPLATES: Record<string, StageTree> = {
  'Foundation 1': FOUNDATION_1,
  'Foundation 2': FOUNDATION_2,
  'Foundation 3': FOUNDATION_3,
  'Foundation 4': FOUNDATION_4,
  'Foundation 5': FOUNDATION_5,
  'Stage 1': STAGE_1,
  'Stage 2': STAGE_2,
  'Stage 3': STAGE_3,
  Bronze: BRONZE,
  Silver: SILVER,
  Gold: GOLD,
};

export function templateForLevel(level: string): StageTree {
  return TEMPLATES[level] ?? FOUNDATION_1;
}

export function cloneTree(tree: StageTree): StageTree {
  return structuredClone(tree);
}

/** A fresh copy with every tick cleared. Timed criteria keep their recorded value. */
export function blankTree(tree: StageTree): StageTree {
  const copy = cloneTree(tree);
  for (const seq of copy.sequences) {
    for (const crit of seq.criteria) {
      if (!crit.timed) crit.checked = false;
      for (const sub of crit.subSkills) sub.checked = false;
    }
  }
  return copy;
}

export function seedChecked(tree: StageTree, ids: string[]): StageTree {
  for (const id of ids) {
    for (const seq of tree.sequences) {
      const crit = seq.criteria.find((c) => c.id === id);
      if (crit) crit.checked = true;
    }
  }
  return tree;
}
