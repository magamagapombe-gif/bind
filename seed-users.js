import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const maleNames   = ['James','Liam','Noah','Oliver','Elijah','Lucas','Mason','Ethan','Aiden','Logan','Jackson','Sebastian','Jack','Owen','Samuel'];
const femaleNames = ['Emma','Olivia','Ava','Sophia','Isabella','Mia','Amelia','Harper','Evelyn','Luna','Sofia','Camila','Aria','Scarlett','Victoria'];
const lastNames   = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Martinez','Davis','Wilson','Taylor','Anderson','Thomas','Moore','Jackson'];

const bios = [
  'Love hiking and good coffee ☕',
  'Dog parent 🐶 Bookworm 📚 Adventurer 🌍',
  'Gym mornings, Netflix nights.',
  'Amateur chef, professional overthinker.',
  'Looking for someone to explore the city with.',
  'Traveller. 30 countries and counting 🌏',
  'Big fan of live music and late dinners 🎵',
  'Introvert with extrovert tendencies.',
  'Sunrise runs 🌅 and sunset views.',
  'Obsessed with plants 🌿 and podcasts.',
  'Fluent in sarcasm. Learning kindness.',
  'Here for a good time and a long time.',
  'Will accept food as payment for my time.',
  'Making memories, not excuses.',
  'Part-time dreamer. Full-time hustler.',
];

const locations = ['Kampala', 'Nairobi', 'Lagos', 'Accra', 'Kigali', 'Dar es Salaam', 'Addis Ababa'];
const genders   = ['man', 'woman', 'nonbinary'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// pravatar gives consistent face photos by ID (1–70 for women, 1–70 for men)
function getPhoto(gender, index) {
  const n = (index % 70) + 1;
  if (gender === 'woman') return `https://i.pravatar.cc/400?img=${n}`;
  return `https://i.pravatar.cc/400?img=${n + 10}`;
}

async function createUser(i) {
  const gender    = pick(genders);
  const firstName = gender === 'woman' ? pick(femaleNames) : pick(maleNames);
  const name      = `${firstName} ${pick(lastNames)}`;
  const age       = randInt(18, 45);
  const email     = `testuser${i}@binder-test.com`;
  const password  = 'Password123!';

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr) { console.error(`❌ ${i} auth:`, authErr.message); return; }

  const photos = [getPhoto(gender, i), getPhoto(gender, i + 35)];

  const { error: profileErr } = await supabase.from('profiles').insert({
    id:           authData.user.id,
    name,
    age,
    bio:          pick(bios),
    gender,
    interested_in: ['man', 'woman', 'nonbinary', 'other'],
    min_age:      18,
    max_age:      50,
    photos,
    location:     pick(locations),
    is_setup:     true,
    last_active:  new Date().toISOString(),
  });

  if (profileErr) { console.error(`❌ ${i} profile:`, profileErr.message); return; }
  console.log(`✅ ${i}/100 — ${name} | ${gender} | ${age} | 2 photos`);
}

async function main() {
  console.log('🔥 Creating 100 test users with photos...\n');
  for (let i = 1; i <= 100; i++) await createUser(i);
  console.log('\n✅ Done. Password for all: Password123!');
}

main();
