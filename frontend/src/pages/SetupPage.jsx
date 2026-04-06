import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

const GENDERS = ['man', 'woman', 'nonbinary', 'other'];
const STEPS   = ['basics', 'about', 'interests', 'photos', 'prefs'];

const ALL_INTERESTS = [
  'Music','Travel','Fitness','Foodie','Gaming','Art','Reading',
  'Movies','Hiking','Cooking','Dogs','Cats','Dancing','Yoga','Coffee',
];

const PROMPTS = [
  "My ideal weekend is…",
  "The way to my heart is…",
  "I'm looking for someone who…",
  "A random fact about me…",
  "My love language is…",
];

export default function SetupPage() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]               = useState(0);
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState('');
  const [name, setName]               = useState('');
  const [age, setAge]                 = useState('');
  const [gender, setGender]           = useState('');
  const [bio, setBio]                 = useState('');
  const [location, setLocation]       = useState('');
  const [interests, setInterests]     = useState([]);
  const [promptQ, setPromptQ]         = useState(PROMPTS[0]);
  const [promptA, setPromptA]         = useState('');
  const [photos, setPhotos]           = useState([]);
  const [interested, setInterested]   = useState(['man','woman','nonbinary','other']);
  const [minAge, setMinAge]           = useState(18);
  const [maxAge, setMaxAge]           = useState(60);
  const [uploading, setUploading]     = useState(false);

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

  function canNext() {
    if (step === 0) return name.trim() && age && gender;
    if (step === 3) return photos.length > 0;
    if (step === 4) return interested.length > 0;
    return true;
  }

  async function handleNext() {
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
    setError(''); setBusy(true);
    try {
      const prompts = promptA.trim() ? [{ question: promptQ, answer: promptA.trim() }] : [];
      await api.put('/api/profiles/me', {
        name: name.trim(), age: parseInt(age), gender,
        bio: bio.trim(), location: location.trim(),
        photos, interested_in: interested, min_age: minAge, max_age: maxAge,
        interests, prompts, is_setup: true,
      });
      await refreshProfile();
      navigate('/swipe');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  const INTEREST_ICONS = {
    Music:'🎵', Travel:'✈️', Fitness:'💪', Foodie:'🍕', Gaming:'🎮',
    Art:'🎨', Reading:'📚', Movies:'🎬', Hiking:'🏔️', Cooking:'👨‍🍳',
    Dogs:'🐶', Cats:'🐱', Dancing:'💃', Yoga:'🧘', Coffee:'☕',
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col max-w-md mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl font-black text-rose-500">binder 🔥</span>
        </div>
        <p className="text-slate-400 text-sm mb-3">Step {step + 1} of {STEPS.length}</p>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1">
        {/* Step 0: Basics */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-white">The basics</h2>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Your name</label>
              <input className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500" placeholder="e.g. Alex" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Age</label>
              <input className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500" type="number" min="18" placeholder="18+" value={age} onChange={e => setAge(e.target.value)} />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">I am a…</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {GENDERS.map(g => (
                  <button key={g} onClick={() => setGender(g)}
                    className={`py-3 rounded-xl border font-medium capitalize transition-colors ${gender === g ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-600 text-slate-300'}`}>{g}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: About */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-white">About you</h2>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Bio <span className="text-slate-500">(optional)</span></label>
              <textarea className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500 min-h-[100px] resize-none"
                placeholder="Tell people something interesting…" value={bio} onChange={e => setBio(e.target.value)} maxLength={300} />
              <p className="text-xs text-slate-500 mt-1 text-right">{bio.length}/300</p>
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Location <span className="text-slate-500">(optional)</span></label>
              <input className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500" placeholder="e.g. Kampala, Uganda" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            {/* Prompt */}
            <div>
              <label className="text-slate-400 text-sm block mb-1">Prompt <span className="text-slate-500">(optional)</span></label>
              <select className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none mb-2" value={promptQ} onChange={e => setPromptQ(e.target.value)}>
                {PROMPTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Your answer…" value={promptA} onChange={e => setPromptA(e.target.value)} maxLength={120} />
            </div>
          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-white">Your interests</h2>
              <p className="text-slate-400 text-sm mt-1">Pick up to 5 — they show on your profile</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map(tag => {
                const selected = interests.includes(tag);
                return (
                  <button key={tag} onClick={() => toggleTag(tag)}
                    className={`px-4 py-2 rounded-full border font-medium text-sm transition-colors ${selected ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-600 text-slate-300'} ${!selected && interests.length >= 5 ? 'opacity-40' : ''}`}>
                    {INTEREST_ICONS[tag]} {tag}
                  </button>
                );
              })}
            </div>
            <p className="text-slate-500 text-xs">{interests.length}/5 selected</p>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-white">Add photos</h2>
            <p className="text-slate-400 text-sm">At least 1 photo. Up to 6.</p>
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
                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-rose-500 bg-slate-800 transition-colors">
                  {uploading ? <Spinner size={6} /> : <><span className="text-2xl text-slate-400">+</span><span className="text-xs text-slate-500 mt-1">Add photo</span></>}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Preferences */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Your preferences</h2>
            <div>
              <label className="text-slate-400 text-sm block mb-2">I'm interested in…</label>
              <div className="grid grid-cols-2 gap-2">
                {GENDERS.map(g => (
                  <button key={g} onClick={() => toggleInterest(g)}
                    className={`py-3 rounded-xl border font-medium capitalize transition-colors ${interested.includes(g) ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-600 text-slate-300'}`}>{g}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-2">Age range: {minAge} – {maxAge}</label>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Min: {minAge}</p>
                  <input type="range" min="18" max="80" value={minAge} onChange={e => { const v = +e.target.value; setMinAge(v); if (v > maxAge) setMaxAge(v); }} className="w-full accent-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Max: {maxAge}</p>
                  <input type="range" min="18" max="99" value={maxAge} onChange={e => { const v = +e.target.value; setMaxAge(v); if (v < minAge) setMinAge(v); }} className="w-full accent-rose-500" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-sm">{error}</div>}

      <div className="mt-8 flex gap-3">
        {step > 0 && <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300">Back</button>}
        <button onClick={handleNext} disabled={!canNext() || busy || uploading}
          className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-semibold disabled:opacity-40">
          {busy ? <Spinner size={5} /> : step === STEPS.length - 1 ? "Let's go 🔥" : 'Next'}
        </button>
      </div>
    </div>
  );
}
