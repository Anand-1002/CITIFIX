/**
 * Categorizes a civic complaint based on title + description keywords.
 * Rules:
 *  - Categories are checked in PRIORITY ORDER — more specific first
 *  - Water/Electricity/Parks/Traffic are checked BEFORE Roads
 *    (Roads has generic words like "damage" that would shadow specific categories)
 *  - Each category has weighted keywords: primary (stronger signal) checked first
 */

const CATEGORY_KEYWORDS = [
  // ── Water ── (must come BEFORE Roads — pipes, drainage often described with "damage")
  {
    category: 'Water',
    keywords: [
      // Pipe issues
      'pipe', 'pipes', 'pipeline', 'burst pipe', 'pipe burst', 'broken pipe',
      'leaking pipe', 'water pipe', 'pipe bust', 'pipe break',
      // Water supply
      'water', 'drinking water', 'water supply', 'tap water', 'water shortage',
      'no water', 'water outage', 'water pressure', 'contaminated water',
      'dirty water', 'muddy water',
      // Leaks & flooding
      'leak', 'leaking', 'leakage', 'water leak', 'flood', 'flooding',
      'waterlogging', 'water logging', 'inundation', 'submerged',
      // Sewage & drainage
      'sewage', 'sewer', 'drain', 'drainage', 'blocked drain', 'clogged drain',
      'overflow', 'overflowing', 'manhole', 'open manhole', 'gutter',
      // Taps & tanks
      'tap', 'borewell', 'borehole', 'hand pump', 'water tank', 'overhead tank',
      'water meter',
    ],
  },

  // ── Electricity ──
  {
    category: 'Electricity',
    keywords: [
      'electricity', 'electric', 'electrical', 'power', 'power cut', 'power outage',
      'no power', 'blackout', 'load shedding', 'load-shedding',
      'streetlight', 'street light', 'street lamp', 'lamp post', 'lamppost',
      'light', 'lights', 'lighting', 'dark road', 'no light',
      'wire', 'wires', 'live wire', 'fallen wire', 'electric wire', 'dangling wire',
      'pole', 'electric pole', 'transformer', 'short circuit', 'sparking',
      'meter', 'electricity meter', 'voltage',
    ],
  },

  // ── Traffic ──
  {
    category: 'Traffic',
    keywords: [
      'traffic', 'traffic jam', 'congestion', 'gridlock',
      'signal', 'traffic signal', 'traffic light', 'broken signal', 'signal not working',
      'sign', 'road sign', 'signage', 'missing sign', 'no sign',
      'crossing', 'zebra crossing', 'pedestrian crossing', 'footpath crossing',
      'speed breaker', 'speed bump', 'hump', 'divider', 'median',
      'parking', 'illegal parking', 'encroachment',
      'one way', 'wrong side', 'u-turn', 'flyover', 'underpass', 'overpass',
    ],
  },

  // ── Parks & Green Spaces ──
  {
    category: 'Parks',
    keywords: [
      'park', 'garden', 'public garden', 'children park', 'kids park',
      'playground', 'play area', 'swings', 'slide', 'see-saw',
      'tree', 'trees', 'fallen tree', 'dead tree', 'branch', 'overgrown',
      'bench', 'benches', 'sitting area',
      'grass', 'lawn', 'overgrown grass', 'open space',
      'statue', 'fountain', 'jogging', 'walkway',
      'green', 'vegetation', 'playground equipments',
    ],
  },

  // ── Waste & Garbage ── (before Roads to catch "dump" before "damage")
  {
    category: 'Waste',
    keywords: [
      'garbage', 'waste', 'trash', 'rubbish', 'litter', 'littering',
      'dump', 'dumping', 'garbage dump', 'open dump', 'illegal dump',
      'bin', 'dustbin', 'garbage bin', 'overflowing bin', 'full bin',
      'smell', 'stench', 'foul smell', 'bad smell', 'odour', 'odor',
      'solid waste', 'biomedical waste', 'construction debris',
      'sweeping', 'cleaning', 'not cleaned', 'uncollected',
    ],
  },

  // ── Roads ── (last — has generic terms that could shadow other categories)
  {
    category: 'Roads',
    keywords: [
      'pothole', 'potholes', 'pot hole', 'pot-hole',
      'road', 'roads', 'roadway', 'main road', 'road condition',
      'street', 'streets', 'lane', 'highway', 'bypass',
      'pavement', 'footpath', 'sidewalk', 'pathway',
      'crack', 'cracks', 'cracking', 'broken road', 'damaged road',
      'uneven road', 'road repair', 'road work', 'digging',
      'gravel', 'mud road', 'unpaved', 'no road',
      'bridge', 'culvert', 'flyover slab', 'road subsidence', 'sinkhole',
    ],
  },
];

/**
 * Returns the best-matching category for the given title + description.
 * Uses a scoring approach: counts how many keywords match, picks highest.
 */
export const categorizeIssue = (description = '', title = '') => {
  const text = `${title} ${description}`.toLowerCase().replace(/[*#_]/g, ' ');

  let bestCategory = 'Other';
  let bestScore = 0;

  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    // Count matches — longer keywords (more specific) score higher
    const score = keywords.reduce((acc, kw) => {
      if (text.includes(kw.toLowerCase())) {
        // Weight by keyword specificity: longer = more specific = higher weight
        return acc + Math.max(1, kw.split(' ').length);
      }
      return acc;
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
};