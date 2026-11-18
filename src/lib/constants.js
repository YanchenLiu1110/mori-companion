/**
 * MORI product constants.
 * These values drive the core commercial loop: focus → XP → character growth.
 */

export const XP_PER_MINUTE = 2;
export const FREE_LEVEL_CAP = 5;
export const PREMIUM_PRICE_RMB = 18;

export const COMPANIONS = {
  bear: {
    id: 'bear',
    name: 'Boba',
    species: 'Brown bear',
    emoji: '🐻',
    tagline: 'Steady paws, warm heart.',
    description:
      "Boba is a gentle soul who believes tiny steps still move mountains. He'll bring the tea; you bring the focus.",
    quote: 'A little progress is still a path.',
    colors: {
      fur: '#A9744F',
      furDark: '#825436',
      furLight: '#F0D6B8',
      inner: '#D89B78',
      scarf: '#6F9E7D',
      scarfDark: '#527C60',
      accent: '#E8B26A',
      glow: '#F4D8A9',
    },
    welcome:
      "Hi, I'm Boba. I saved you the sunny spot by the window. Shall we grow a little today?",
  },
  deer: {
    id: 'deer',
    name: 'Fenn',
    species: 'Young deer',
    emoji: '🦌',
    tagline: 'Quietly curious, always near.',
    description:
      'Fenn notices the little things — morning light, a page turned, a breath finally slowing down. A calm companion for busy minds.',
    quote: 'Slow roots make the strongest trees.',
    colors: {
      fur: '#C99A6C',
      furDark: '#966C46',
      furLight: '#F4E4CF',
      inner: '#E2B18A',
      scarf: '#D08162',
      scarfDark: '#A96147',
      accent: '#F0D08B',
      glow: '#F6DDC2',
    },
    welcome:
      "Hi, I'm Fenn. No rush — we can start with just five quiet minutes. I'll be right here.",
  },
  fox: {
    id: 'fox',
    name: 'Miso',
    species: 'Red fox',
    emoji: '🦊',
    tagline: 'A pocket-sized spark.',
    description:
      'Miso turns every finished chapter into a tiny celebration. Playful, clever, and always first to notice when you show up.',
    quote: 'Small sparks grow into bright mornings.',
    colors: {
      fur: '#D77C50',
      furDark: '#A85331',
      furLight: '#F7E7D4',
      inner: '#F3B18C',
      scarf: '#6D9F7C',
      scarfDark: '#507D5E',
      accent: '#F2C96E',
      glow: '#F8D8B7',
    },
    welcome:
      "Hey, I'm Miso! I already picked out a tiny reading nook for us. One page at a time?",
  },
};

export const COMPANION_LIST = Object.values(COMPANIONS);

export const STAGES = [
  { level: 1, name: 'Little seed' },
  { level: 2, name: 'First sprout' },
  { level: 3, name: 'Curious sapling' },
  { level: 4, name: 'Brave bud' },
  { level: 5, name: 'Forest friend' },
  { level: 6, name: 'Trail finder' },
  { level: 7, name: 'Canopy climber' },
  { level: 8, name: 'Sunbeam keeper' },
  { level: 9, name: 'Old-soul oak' },
  { level: 10, name: 'Forest guardian' },
];

export function getStage(level) {
  const match = [...STAGES].reverse().find((stage) => level >= stage.level);
  return match || STAGES[0];
}

export const SKILLS = [
  {
    id: 'quiet-company',
    name: 'Quiet company',
    description: 'Sits beside you through every focus session.',
    level: 1,
    premium: false,
    icon: 'BookOpen',
  },
  {
    id: 'leaf-scarf',
    name: 'Leaf scarf',
    description: 'A hand-knit scarf, made for slow mornings.',
    level: 2,
    premium: false,
    icon: 'Feather',
  },
  {
    id: 'tiny-cheer',
    name: 'Tiny cheerleader',
    description: 'Does a happy little spin when you hit your daily goal.',
    level: 3,
    premium: false,
    icon: 'PartyPopper',
  },
  {
    id: 'golden-focus',
    name: 'Golden focus',
    description: 'A warm glow that follows a three-day streak.',
    level: 5,
    premium: false,
    icon: 'Sparkles',
  },
  {
    id: 'moonlit-walk',
    name: 'Moonlit walks',
    description: 'Exclusive evening scenes and a calmer bedtime chat.',
    level: 7,
    premium: true,
    icon: 'Moon',
  },
  {
    id: 'forest-crown',
    name: 'Forest crown',
    description: 'A crown of leaves for a companion in full bloom.',
    level: 9,
    premium: true,
    icon: 'Crown',
  },
];

export const PREMIUM_PERKS = [
  {
    title: 'Grow beyond Level 5',
    body: 'Unlock every future stage, accessory, and animation.',
    icon: 'Sprout',
  },
  {
    title: 'Deeper evening chats',
    body: 'Longer, more personal reflections after a full day.',
    icon: 'MessageCircle',
  },
  {
    title: 'Seasonal forest scenes',
    body: 'New looks for your companion as the seasons change.',
    icon: 'Flower2',
  },
  {
    title: 'Full growth archive',
    body: 'Keep every milestone and revisit your whole journey.',
    icon: 'Archive',
  },
];

export const MOODS = {
  ready: {
    key: 'ready',
    label: 'Ready when you are',
    emoji: '🌤️',
    color: 'moss',
    blurb: 'saved you the sunny spot',
  },
  focused: {
    key: 'focused',
    label: 'In the zone',
    emoji: '🌿',
    color: 'fern',
    blurb: 'is reading right beside you',
  },
  joyful: {
    key: 'joyful',
    label: 'Over the moon',
    emoji: '✨',
    color: 'butter',
    blurb: 'is doing a tiny happy spin',
  },
  sleepy: {
    key: 'sleepy',
    label: 'A little sleepy',
    emoji: '🌙',
    color: 'apricot',
    blurb: 'is yawning, but still here',
  },
  missing: {
    key: 'missing',
    label: 'Missing you',
    emoji: '🍂',
    color: 'peach',
    blurb: 'keeps peeking at the door',
  },
};

export const DAILY_NOTES = {
  ready: [
    'The page is blank, the tea is warm. Everything is ready when you are.',
    'No big declarations needed today. A small beginning is enough.',
    'Your companion found a quiet corner. Come sit for a while?',
  ],
  focused: [
    'You already showed up today. That counts for more than it looks.',
    'One session at a time. The forest is growing quietly around you.',
    'You are doing the thing. So is your little companion.',
  ],
  joyful: [
    'Goal met. You made today a little softer for both of you.',
    'Look at that — a full day of showing up. Your companion felt every minute.',
    'A small celebration is in order. The forest is glittering.',
  ],
  sleepy: [
    'Late hours are allowed, but so is rest. Even five minutes counts tomorrow.',
    'Your companion is half-asleep too. One gentle page, then bed?',
    'The moon is up. A short, quiet session might feel just right.',
  ],
  missing: [
    'No guilt here. Your companion just likes it when you are around.',
    "It's been a little quiet. Even one small session would make the forest feel warmer.",
    'The door is open whenever you are ready. No catching up required.',
  ],
};

export const TIMER_PRESETS = [
  { focus: 25, break: 5 },
  { focus: 45, break: 10 },
  { focus: 60, break: 15 },
];

export const CHAT_SUGGESTIONS = [
  'I feel stuck today',
  "Cheer me on, Boba",
  'How is our streak going?',
  'Tell me about yourself',
];

export const BRAND = {
  name: 'MORI',
  tagline: 'Grow together.',
  promise: 'Your focus becomes their growth.',
  priceRmb: PREMIUM_PRICE_RMB,
};
