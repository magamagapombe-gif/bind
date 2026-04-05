import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

const GENDERS = ['man', 'woman', 'nonbinary', 'other'];

const STEPS = ['basics', 'about', 'photos', 'prefs'];

export default function SetupPage() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName]         = useState('');
  const [age, setAge]           = useState('');
  const [gender, setGender]     = useState('');
  const [bio, setBio]           = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos]     = useState([]);
  const [interested, setInterested] = useState(['man', 'woman', 'nonbinary', 'other']);
  const [minAge, setMinAge]     = useState(18);
  const [maxAge, setMaxAge]     = useState(60);
  const [uploading, setUploading] = useState(false);

  function toggleInterest(g) {
    setInterested((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (photos.length >= 6) { setError('Max 6 photos'); return; }
    setUploading(true);
    setError('');
    try {
      const url = await api.uploadPhoto(file);
      setPhotos((p) => [...p, url]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(i) {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
  }

  function canNext() {
    if (step === 0) return name.trim() && age && gender;
    if (step === 1) return true;
    if (step === 2) return photos.length > 0;
    if (step === 3) return interested.length > 0;
    return true;
  }

  async function handleNext() {
    if (step < STEPS.length - 1) { setStep((s) => s + 1); return; }
    // Final submit
    setError(''); setBusy(true);
    try {
      await api.post('/api/profiles', {
        name: name.trim(),
        age: parseInt(age),
        gender,
        bio: bio.trim(),
        location: location.trim(),
        photos,
        interested_in: interested,
        min_age: minAge,
        max_age: maxAge,
      });
      await refreshProfile();
      navigate('/swipe');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col max-w-md mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🔥</span>
          <h1 className="text-2xl font-bold text-white">Binder</h1>
        </div>
        <p className="text-slate-400 text-sm mb-3">Step {step + 1} of {STEPS.length}</p>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-flame rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1">
        {step === 0 && (
          <div className="animate-slide-up space-y-5">
            <h2 className="text-2xl font-bold text-white">The basics</h2>
            <div>
              <label className="label">Your name</label>
              <input className="input" placeholder="e.g. Alex" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">Age</label>
              <input className="input" type="number" min="18" max="120" placeholder="18+" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div>
              <label className="label">I am a…</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`py-3 rounded-xl border font-medium capitalize transition-colors ${
                      gender === g
                        ? 'bg-flame border-flame text-white'
                        : 'border-slate-600 text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-slide-up space-y-5">
            <h2 className="text-2xl font-bold text-white">About you</h2>
            <div>
              <label className="label">Bio <span className="text-slate-500">(optional)</span></label>
              <textarea
                className="input min-h-[120px] resize-none"
                placeholder="Tell people something interesting about yourself…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={300}
              />
              <p className="text-xs text-slate-500 mt-1 text-right">{bio.length}/300</p>
            </div>
            <div>
              <label className="label">Location <span className="text-slate-500">(optional)</span></label>
              <input className="input" placeholder="e.g. Nairobi, Kenya" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up space-y-5">
            <h2 className="text-2xl font-bold text-white">Add photos</h2>
            <p className="text-slate-400 text-sm">Add at least 1 photo. Up to 6.</p>

            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-700">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
                  >
                    ✕
                  </button>
                  {i === 0 && (
                    <div className="absolute bottom-1 left-1 bg-flame text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      Main
                    </div>
                  )}
                </div>
              ))}

              {photos.length < 6 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-flame transition-colors bg-slate-800">
                  {uploading ? (
                    <Spinner size={6} />
                  ) : (
                    <>
                      <span className="text-2xl text-slate-400">+</span>
                      <span className="text-xs text-slate-500 mt-1">Add photo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up space-y-6">
            <h2 className="text-2xl font-bold text-white">Your preferences</h2>

            <div>
              <label className="label">I'm interested in…</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleInterest(g)}
                    className={`py-3 rounded-xl border font-medium capitalize transition-colors ${
                      interested.includes(g)
                        ? 'bg-flame border-flame text-white'
                        : 'border-slate-600 text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Age range: {minAge} – {maxAge}</label>
              <div className="space-y-3 mt-2">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Min age: {minAge}</p>
                  <input
                    type="range" min="18" max="80"
                    value={minAge}
                    onChange={(e) => { const v = +e.target.value; setMinAge(v); if (v > maxAge) setMaxAge(v); }}
                    className="w-full accent-flame"
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Max age: {maxAge}</p>
                  <input
                    type="range" min="18" max="99"
                    value={maxAge}
                    onChange={(e) => { const v = +e.target.value; setMaxAge(v); if (v < minAge) setMinAge(v); }}
                    className="w-full accent-flame"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className="btn-ghost flex-1">
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canNext() || busy || uploading}
          className="btn-primary flex-1"
        >
          {busy ? <Spinner size={5} color="border-white" /> : step === STEPS.length - 1 ? 'Let\'s go 🔥' : 'Next'}
        </button>
      </div>
    </div>
  );
}
