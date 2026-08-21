/**
 * fix-categories.js
 * ─────────────────────────────────────────────────────────────────
 * Run this whenever you update keywords in aiCategorization.js to
 * re-categorize ALL existing complaints in the DB.
 *
 * Usage:  node scripts/fix-categories.js
 *   or:   npm run fix-categories   (from backend/)
 *
 * ⚠️  Keep the CATEGORY_KEYWORDS below in sync with
 *     frontend/src/utils/aiCategorization.js
 * ─────────────────────────────────────────────────────────────────
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── SINGLE SOURCE OF TRUTH ─────────────────────────────────────────
// Mirror of frontend/src/utils/aiCategorization.js
// Update BOTH files together when adding new keywords.
// ──────────────────────────────────────────────────────────────────
const CATEGORY_KEYWORDS = [
  {
    category: 'Water',
    keywords: [
      'pipe', 'pipes', 'pipeline', 'burst pipe', 'pipe burst', 'broken pipe',
      'leaking pipe', 'water pipe', 'pipe bust', 'pipe break',
      'water', 'drinking water', 'water supply', 'tap water', 'water shortage',
      'no water', 'water outage', 'water pressure', 'contaminated water',
      'dirty water', 'muddy water',
      'leak', 'leaking', 'leakage', 'water leak', 'flood', 'flooding',
      'waterlogging', 'water logging', 'inundation', 'submerged',
      'sewage', 'sewer', 'drain', 'drainage', 'blocked drain', 'clogged drain',
      'overflow', 'overflowing', 'manhole', 'open manhole', 'gutter',
      'tap', 'borewell', 'borehole', 'hand pump', 'water tank', 'overhead tank',
      'water meter',
    ],
  },
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
  {
    category: 'Parks',
    keywords: [
      'park', 'garden', 'public garden', 'children park', 'kids park',
      'playground', 'play area', 'swings', 'slide', 'see-saw',
      'playground equipment', 'playground equipments', 'damaged equipment',
      'broken equipment', 'play equipment',
      'tree', 'trees', 'fallen tree', 'dead tree', 'branch', 'overgrown',
      'bench', 'benches', 'sitting area',
      'grass', 'lawn', 'overgrown grass', 'open space',
      'statue', 'fountain', 'jogging', 'walkway',
      'green', 'vegetation',
    ],
  },
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

// ── Scoring logic (mirrors aiCategorization.js) ────────────────────
function categorize(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase().replace(/[*#_]/g, ' ');
  let bestCategory = 'Other';
  let bestScore    = 0;

  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    const score = keywords.reduce((acc, kw) => {
      if (text.includes(kw.toLowerCase())) {
        return acc + Math.max(1, kw.split(' ').length);
      }
      return acc;
    }, 0);

    if (score > bestScore) {
      bestScore    = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}

// ── Main ────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🔄  CitiFix — Re-categorizing all complaints...\n');

  const complaints = await prisma.complaint.findMany({
    select: { id: true, title: true, description: true, category: true },
  });

  let changed = 0;
  let unchanged = 0;

  for (const c of complaints) {
    const correct = categorize(c.title, c.description);
    if (correct !== c.category) {
      await prisma.complaint.update({
        where: { id: c.id },
        data:  { category: correct },
      });
      console.log(`  ✅ #${c.id} "${c.title}"\n     ${c.category} → ${correct}`);
      changed++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n──────────────────────────────────────`);
  console.log(`  ✅ Fixed   : ${changed} complaint(s)`);
  console.log(`  ✔️  Correct : ${unchanged} complaint(s)`);
  console.log(`  📦 Total   : ${complaints.length} complaint(s)`);
  console.log(`──────────────────────────────────────\n`);

  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
