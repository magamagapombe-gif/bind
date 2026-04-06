import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

const GENDERS = ['man', 'woman', 'nonbinary', 'other'];
const ALL_INTERESTS = [
  'Music','Travel','Fitness','Foodie','Gaming','Art','Reading',
  'Movies','Hiking','Cooking','Dogs','Cats','Dancing','Yoga','Coffee',
];
const INTEREST_ICONS = {
  Music:'🎵', Travel:'✈️', Fitness:'💪', Foodie:'🍕', Gaming:'🎮',
  Art:'🎨', Reading:'📚', Movies:'🎬', Hiking:'🏔️', Cooking:'👨‍🍳',
  Dogs:'🐶', Cats:'🐱', Dancing:'💃', Yoga:'🧘', Coffee:'☕',
};
const PROMPTS = [
  "My ideal weekend is…",
  "The way to my heart is…",
  "I'm looking for someone who…",
  "A random fact about me…",
  "My love language is…",
];

function completeness(profile) {
  const fields = [
    profile?.photos?.length > 0,
    profile?.bio?.length > 10,
    profile?.location,
    profile?.interests?.length > 0,
    profile?.prompts?.length > 0,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export default function ProfilePage() {
  const { profile, refreshProfile, signOut } = useAuth();

  const [name, setName]               = useState(profile?.name || '');
  const [bio, setBio]                 = useState(profile?.bio || '');
  const [location, setLocation]       = useState(profile?.location || '');
  const [minAge, setMinAge]           = useState(profile?.min_age || 18);
  const [maxAge, setMaxAge]           = useState(profile?.max_age || 60);
  const [interested, setInterested]   = useState(profile?.interested_in || GENDERS);
  const [photos, setPhotos]           = useState(profile?.photos || []);
  const [interests, setInterests]     = useState(profile?.interests || []);
  const [prompts, setPrompts]         = useState(profile?.prompts || []);
  const [promptQ, setPromptQ]         = useState(prompts[0]?.question || PROMPTS[0]);
  const [promptA, setPromptA]         = useState(prompts[0]?.answer || '');
  const [uploading, setUploading]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState('');

  const pct = completeness(profile);

  function toggleInterest(g) {
    setInterested(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }
  function toggleTag(tag) {
    setInterests(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : prev.length < 5 ? [...prev, tag] : prev);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file || photos.length >= 6) return;
    setUploading(true); setError('');
    try { const url = await api.uploadPhoto(file); setPhotos(p => [...p, url]); }
    catch (err) { setError(err.message); }
    finally { setUploading(false); }
  }

  async function handleSave() {
    setError(''); setSaving(true); setSaved(false);
    const newPrompts = promptA.trim() ? [{ question: promptQ, answer: promptA.trim() }] : [];
    try {
      await api.put('/api/profiles/me', {
        name: name.trim(), bio: bio.trim(), location: location.trim(),
        min_age: minAge, max_age: maxAge, interested_in: interested,
        photos, interests, prompts: newPrompts,
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="relative">
        <div className="h-40 bg-gradient-to-br from-rose-500 to-orange-500" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-900 bg-slate-700 shadow-xl">
            {photos[0] ? <img src={photos[0]} alt={profile?.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>}
          </div>
        </div>
      </div>

      <div className="pt-16 px-5 pb-8 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{profile?.name}</h2>
          <p className="text-slate-400 text-sm">{profile?.age} · {profile?.gender}</p>
        </div>

        {/* Profile completeness */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-white">Profile strength</p>
            <p className="text-sm font-bold text-rose-400">{pct}%</p>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          {pct < 100 && (
            <p className="text-xs text-slate-400 mt-2">
              {!profile?.bio || profile.bio.length < 10 ? '✏️ Add a bio · ' : ''}
              {!profile?.interests?.length ? '🏷️ Add interests · ' : ''}
              {!profile?.prompts?.length ? '💬 Add a prompt · ' : ''}
              {!profile?.location ? '📍 Add location' : ''}
            </p>
          )}
        </div>

        {error && <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-sm">{error}</div>}
        {saved && <div className="p-3 bg-green-500/20 border border-green-500/40 text-green-300 rounded-xl text-sm">✓ Profile saved!</div>}

        {/* Photos */}
        <div>
          <label className="text-slate-400 text-sm block mb-2">Photos</label>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-700">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs">✕</button>
                {i === 0 && <div className="absolute bottom-1 left-1 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">Main</div>}
              </div>
            ))}
            {photos.length < 6 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-rose-500 bg-slate-800">
                {uploading ? <Spinner size={5} /> : <><span className="text-2xl text-slate-400">+</span><span className="text-xs text-slate-500 mt-1">Add</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-slate-400 text-sm block mb-1">Display name</label>
          <input className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500" value={name} onChange={e => setName(e.target.value)} />
        </div>

        {/* Bio */}
        <div>
          <label className="text-slate-400 text-sm block mb-1">Bio</label>
          <textarea className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            rows={3} value={bio} onChange={e => setBio(e.target.value)} maxLength={300} placeholder="Tell people about yourself…" />
          <p className="text-xs text-slate-500 text-right mt-1">{bio.length}/300</p>
        </div>

        {/* Location */}
        <div>
          <label className="text-slate-400 text-sm block mb-1">Location</label>
          <input className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Kampala, Uganda" />
        </div>

        {/* Interests */}
        <div>
          <label className="text-slate-400 text-sm block mb-2">Interests <span className="text-slate-500">(up to 5)</span></label>
          <div className="flex flex-wrap gap-2">
            {ALL_INTERESTS.map(tag => {
              const selected = interests.includes(tag);
              return (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${selected ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-600 text-slate-300'} ${!selected && interests.length >= 5 ? 'opacity-40' : ''}`}>
                  {INTEREST_ICONS[tag]} {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prompt */}
        <div>
          <label className="text-slate-400 text-sm block mb-2">Prompt</label>
          <select className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none mb-2" value={promptQ} onChange={e => setPromptQ(e.target.value)}>
            {PROMPTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500"
            placeholder="Your answer…" value={promptA} onChange={e => setPromptA(e.target.value)} maxLength={120} />
        </div>

        {/* Interested in */}
        <div>
          <label className="text-slate-400 text-sm block mb-2">Interested in</label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map(g => (
              <button key={g} onClick={() => toggleInterest(g)}
                className={`py-2.5 rounded-xl border font-medium capitalize text-sm transition-colors ${interested.includes(g) ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-600 text-slate-300'}`}>{g}</button>
            ))}
          </div>
        </div>

        {/* Age range */}
        <div>
          <label className="text-slate-400 text-sm block mb-2">Age range: {minAge} – {maxAge}</label>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Min: {minAge}</p>
              <input type="range" min="18" max="80" value={minAge}
                onChange={e => { const v = +e.target.value; setMinAge(v); if (v > maxAge) setMaxAge(v); }} className="w-full accent-rose-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Max: {maxAge}</p>
              <input type="range" min="18" max="99" value={maxAge}
                onChange={e => { const v = +e.target.value; setMaxAge(v); if (v < minAge) setMinAge(v); }} className="w-full accent-rose-500" />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors disabled:opacity-40">
          {saving ? <Spinner size={5} /> : 'Save changes'}
        </button>

        <button onClick={signOut}
          className="w-full py-3 rounded-2xl border border-red-500/40 text-red-400 font-medium hover:bg-red-500/10 transition-colors">
          Sign out
        </button>
      </div>
    </div>
  );
}
