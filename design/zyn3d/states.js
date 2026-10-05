/* The 36 states. Eyes only, no mouth, no fins. What a state says it says with the eyes
   (shape, size, slant), the whole body (lean, nod, turn, squash, jump), the hands and
   the prop. Hand coordinates are the 2D sheet's (x 0-240, y 0-240). */
const both = (t, o = {}) => [Object.assign({ side: -1, t }, o), Object.assign({ side: 1, t }, o)];
const two = (a, b) => [Object.assign({ side: -1 }, a), Object.assign({ side: 1 }, b)];

export const STATES = {
  /* ── feelings ── */
  happy: { eyes: both('up', { sx: 1.15, sy: 1.15 }), pose: { tilt: 5, yaw: 0.25, dy: -6, sy: 1.02, sx: 0.99 }, hands: { l: [48, 134], r: [192, 134] }, props: 'twinkle' },
  curious: { eyes: two({ t: 'ring', s: 11, sy: 1.1 }, { t: 'ring', s: 8, sy: 1.2, dy: 0.03 }), pose: { tilt: 13, ant: 32, yaw: 0.5, pitch: -0.1 }, hands: { r: [160, 164] }, props: 'twinkle' },
  thinking: { eyes: both('dash', { dx: 0.05, dy: 0.06, rot: 0.14, sx: 1.1 }), pose: { tilt: -9, ant: -10, yaw: -0.4, pitch: -0.14 }, hands: { r: [148, 168] }, props: 'thought' },
  excited: { eyes: both('caret', { sx: 1.35, sy: 1.35 }), pose: { dy: -30, sy: 1.1, sx: 0.93, ant: -20, tilt: 7, yaw: 0.2 }, hands: { l: [26, 58], r: [214, 58] }, props: 'burst' },
  helpful: { eyes: both('ring', { s: 10, sy: 1.12 }), pose: { tilt: -5, ant: 26, yaw: -0.3, pitch: 0.12 }, hands: { l: [40, 150], r: [210, 122] }, props: 'sparkleHeart' },
  winking: { eyes: two({ t: 'ring', s: 10 }, { t: 'lt', sx: 1.15, sy: 1.15 }), pose: { tilt: 11, yaw: 0.4, pitch: 0.06, dy: -4 }, hands: { r: [200, 108] }, props: 'twinkle' },
  surprised: { eyes: both('ring', { s: 12, sy: 1.35 }), pose: { dy: -18, sy: 1.12, sx: 0.9, ant: -18, pitch: -0.14, yaw: 0.05 }, hands: { l: [30, 88], r: [210, 88] }, props: 'bang' },
  sleepy: { eyes: both('down', { dy: -0.04, sx: 1.1, sy: 0.7 }), pose: { tilt: 13, dy: 10, sy: 0.9, sx: 1.07, ant: 42, pitch: 0.2, yaw: 0.1 }, hands: { l: [60, 176], r: [180, 176] }, props: 'zzz' },
  confused: { eyes: two({ t: 'ring', s: 12, sy: 1.1 }, { t: 'ring', s: 5.5 }), pose: { tilt: -13, ant: -22, yaw: -0.45, pitch: -0.05 }, hands: { r: [176, 56] }, props: 'question' },
  sorry: { eyes: two({ t: 'dash', rot: 0.4, sx: 1.2, dy: -0.04 }, { t: 'dash', rot: -0.4, sx: 1.2, dy: -0.04 }), pose: { tilt: 6, dy: 10, sy: 0.92, sx: 1.05, ant: 40, pitch: 0.22 }, hands: { l: [106, 178], r: [134, 178] }, props: 'drop' },
  proud: { eyes: both('up', { sx: 1.1, sy: 1.1 }), pose: { tilt: -9, ant: 8, pitch: -0.18, yaw: 0.25, sy: 1.04, dy: -4 }, hands: { l: [36, 150], r: [204, 150] }, props: 'twinkle3' },
  delighted: { eyes: both('heart'), pose: { dy: -20, tilt: 9, ant: 24, sy: 1.04, yaw: 0.2 }, hands: { l: [54, 118], r: [186, 118] }, props: 'hearts' },

  /* ── actions ── */
  searching: { eyes: both('ring', { s: 10, dx: 0.06 }), pose: { tilt: 9, ant: 18, yaw: 0.55, pitch: 0.04 }, hands: { r: [222, 88] }, props: 'magnifier' },
  listening: { eyes: both('ring', { s: 10 }), pose: { tilt: -11, ant: 16, yaw: -0.45, pitch: 0.04 }, hands: { l: [32, 98] }, props: 'waves' },
  typing: { eyes: both('dot', { dy: -0.05, s: 5.5 }), pose: { ant: 14, pitch: 0.24, yaw: 0.1, dy: 2 }, hands: { l: [96, 182], r: [144, 182] }, props: 'bubble' },
  calculating: { eyes: both('dot', { dx: 0.07, dy: 0.05, s: 5.5 }), pose: { tilt: -7, ant: -12, yaw: 0.4, pitch: -0.1 }, hands: { r: [199, 100] }, props: 'calculator' },
  comparing: { eyes: two({ t: 'ring', s: 7 }, { t: 'ring', s: 11 }), pose: { tilt: 10, ant: -8, yaw: 0.4 }, hands: { r: [212, 108] }, props: 'cards' },
  navigating: { eyes: both('ring', { s: 10, dx: 0.05 }), pose: { tilt: 10, ant: 20, yaw: 0.55, dy: -6 }, hands: { r: [206, 94] }, props: 'pin' },
  waving: { eyes: both('up', { sx: 1.15, sy: 1.15 }), pose: { tilt: -11, ant: 28, dy: -10, yaw: 0.15 }, hands: { r: [212, 64] }, props: 'wave' },
  loading: { eyes: both('ring', { s: 9 }), pose: { ant: -14, tilt: 4, yaw: -0.2 }, props: 'spinner' },
  scheduling: { eyes: both('up'), pose: { tilt: 7, ant: 16, yaw: 0.35, dy: -4 }, hands: { r: [198, 90] }, props: 'calendar' },
  calling: { eyes: both('up'), pose: { tilt: -9, ant: 18, yaw: -0.2, dy: -4 }, hands: { r: [203, 98] }, props: 'phone' },
  celebrating: { eyes: both('caret', { sx: 1.35, sy: 1.35 }), pose: { dy: -34, ant: -24, sy: 1.12, sx: 0.92, tilt: 11, yaw: 0.2 }, hands: { l: [30, 62], r: [210, 62] }, props: 'confetti' },
  saving: { eyes: both('down', { sx: 1.1 }), pose: { ant: 14, pitch: 0.12, tilt: 5, yaw: 0.25 }, hands: { r: [205, 100] }, props: 'bookmark' },

  /* ── what a reply carries ── */
  home: { eyes: both('up', { sx: 1.1, sy: 1.1 }), pose: { tilt: 5, ant: 16, yaw: 0.35, dy: -6 }, hands: { r: [204, 108] }, props: 'house' },
  price: { eyes: both('ring', { s: 9 }), pose: { tilt: 4, ant: 10, yaw: 0.3 }, hands: { r: [200, 104] }, props: 'tag' },
  verified: { eyes: both('up', { sx: 1.1, sy: 1.1 }), pose: { tilt: -5, ant: 10, pitch: -0.14, yaw: 0.2, sy: 1.03, dy: -4 }, hands: { r: [204, 112] }, props: 'shield' },
  nearby: { eyes: both('ring', { s: 10 }), pose: { tilt: 6, ant: 22, yaw: 0.45 }, hands: { r: [205, 112] }, props: 'skyline' },
  documents: { eyes: both('up'), pose: { tilt: 4, ant: 14, yaw: 0.3, pitch: 0.06 }, hands: { r: [202, 108] }, props: 'document' },
  offer: { eyes: two({ t: 'ring', s: 10 }, { t: 'lt', sx: 1.1, sy: 1.1 }), pose: { tilt: -8, ant: -8, yaw: 0.35 }, hands: { r: [216, 100] }, props: 'offer' },
  keys: { eyes: both('caret', { sx: 1.3, sy: 1.3 }), pose: { tilt: 8, ant: 24, dy: -16, sy: 1.06, yaw: 0.3 }, hands: { r: [210, 80] }, props: 'key' },
  headsup: { eyes: both('ring', { s: 9, sy: 1.25 }), pose: { tilt: -6, ant: -10, pitch: -0.08, yaw: 0.15 }, hands: { r: [204, 94] }, props: 'warning' },
  nothing: { eyes: two({ t: 'dash', rot: 0.35, sx: 1.2, dy: -0.04 }, { t: 'dash', rot: -0.35, sx: 1.2, dy: -0.04 }), pose: { tilt: 5, dy: 6, ant: 38, pitch: 0.14, sy: 0.96 }, hands: { r: [200, 108] }, props: 'emptybox' },
  alert: { eyes: both('up'), pose: { tilt: -6, ant: 20, yaw: 0.25, dy: -6 }, hands: { r: [204, 100] }, props: 'bell' },
  intro: { eyes: both('up', { sx: 1.1, sy: 1.1 }), pose: { ant: 16, tilt: 4, yaw: 0.3, dy: -4 }, hands: { l: [46, 140], r: [194, 140] }, props: 'people' },
  shared: { eyes: both('up'), pose: { tilt: 6, ant: 22, yaw: 0.35, dy: -8 }, hands: { r: [200, 106] }, props: 'plane' },
};
