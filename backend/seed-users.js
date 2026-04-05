import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://guioaekqkxfphndbvrgy.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aW9hZWtxa3hmcGhuZGJ2cmd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQwNTEyOSwiZXhwIjoyMDkwOTgxMTI5fQ.46fwolWQHp27FKI5rA-U_y2BzWlgRgpRZi6Clfmmdxg';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const names = [
  'Alex','Jordan','Morgan','Taylor','Casey','Riley','Jamie','Avery','Quinn','Blake',
  'Reese','Drew','Hayden','Emery','Cameron','Sage','Rowan','Finley','Logan','Dakota',
  'Skylar','Parker','Peyton','Kendall','Addison','Charlie','Harper','Dylan','Elliot','Sloane',
  'Micah','Remy','Eden','Phoenix','Indigo','Nova','Jude','Lane','Rue','Wren',
];

const bios = [
  'Love hiking and good coffee.',
  'Dog parent. Bookworm. Adventurer.',
  'Gym in the morning, Netflix at night.',
  'Amateur chef, professional overthinker.',
  'Looking for someone to explore the city with.',
  'Traveller. 30 countries and counting.',
  'Big fan of live music and late dinners.',
  'Introvert with extrovert tendencies.',
  'Sunrise runs and sunset views.',
  'Obsessed with plants and podcasts.',
];

const genders = ['man', 'woman', 'nonbinary'];
const locations = ['Kampala', 'Nairobi', 'Lagos', 'Accra', 'Dar es Salaam', 'Kigali', 'Addis Ababa'];

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function createUser(i) {
  const email = `testuser${i}@binder-test.com`;
  const password = 'Password123!';
  const name = `${random(names)} ${random(names)}`;
  const age = randomInt(18, 45);
  const gender = random(genders);

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error(`❌ User ${i} auth failed:`, authError.message);
    return;
  }

  const userId = authData.user.id;

  // Create profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    name,
    age,
    bio: random(bios),
    gender,
    interested_in: ['man', 'woman', 'nonbinary', 'other'],
    min_age: 18,
    max_age: 50,
    photos: [],
    location: random(locations),
    is_setup: true,
  });

  if (profileError) {
    console.error(`❌ User ${i} profile failed:`, profileError.message);
    return;
  }

  console.log(`✅ ${i}/100 — ${name} (${email})`);
}

async function main() {
  console.log('🔥 Creating 100 test users...\n');
  for (let i = 1; i <= 100; i++) {
    await createUser(i);
  }
  console.log('\n✅ Done. All users have password: Password123!');
}

main();
