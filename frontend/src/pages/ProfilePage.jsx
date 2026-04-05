import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

const GENDERS = ['man', 'woman', 'nonbinary', 'other'];

export default function ProfilePage() {
  const { profile, refreshProfile, signOut } = useAuth();

  const [name, setName]         = useState(profile?.name || '');
  const [bio, setBio]           = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [minAge, setMinAge]     = useState(profile?.min_age || 18);
  const [maxAge, setMaxAge]     = useState(profile?.max_age || 60);
  const [interested, setInterested] = useState(profile?.interested_in || GENDERS);
  const [photos, setPhotos]     = useState(profile?.photos || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  function toggleInterest(g) {
    setInterested((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file || photos.length >= 6) return;
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

  async function handleSave() {
    setError(''); setSaving(true); setSaved(false);
    try {
      await api.put('/api/profiles', {
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        min_age: minAge,
        max_age: maxAge,
        interested_in: interested,
        photos,
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="relative">
        <div className="h-40 bg-gradient-to-br from-flame to-orange-600" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-900 bg-slate-700 shadow-xl">
            {photos[0] ? (
              <img src={photos[0]} alt={profile?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-16 px-5 pb-8 space-y-6">
        {/* Name & email */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{profile?.name}</h2>
          <p className="text-slate-400 text-sm">{profile?.age} · {profile?.gender}</p>
        </div>

        {/* Errors / success */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-sm">{error}</div>
        )}
        {saved && (
          <div className="p-3 bg-green-500/20 border border-green-500/40 text-green-300 rounded-xl text-sm">✓ Profile saved!</div>
        )}

        {/* Photos */}
        <div>
          <label className="label">Photos</label>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-700">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                >✕</button>
                {i === 0 && (
                  <div className="absolute bottom-1 left-1 bg-flame text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">Main</div>
                )}
              </div>
            ))}
            {photos.length < 6 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-flame bg-slate-800">
                {uploading ? <Spinner size={5} /> : <><span className="text-2xl text-slate-400">+</span><span className="text-xs text-slate-500 mt-1">Add</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="label">Display name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Bio */}
        <div>
          <label className="label">Bio</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            placeholder="Tell people about yourself…"
          />
          <p className="text-xs text-slate-500 text-right mt-1">{bio.length}/300</p>
        </div>

        {/* Location */}
        <div>
          <label className="label">Location</label>
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kampala, Uganda" />
        </div>

        {/* Interested in */}
        <div>
          <label className="label">Interested in</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {GENDERS.map((g) => (
              <button
                key={g}
                onClick={() => toggleInterest(g)}
                className={`py-2.5 rounded-xl border font-medium capitalize text-sm transition-colors ${
                  interested.includes(g) ? 'bg-flame border-flame text-white' : 'border-slate-600 text-slate-300 hover:border-slate-400'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Age range */}
        <div>
          <label className="label">Age range: {minAge} – {maxAge}</label>
          <div className="space-y-3 mt-2">
            <div>
              <p className="text-xs text-slate-500 mb-1">Min: {minAge}</p>
              <input type="range" min="18" max="80" value={minAge}
                onChange={(e) => { const v = +e.target.value; setMinAge(v); if (v > maxAge) setMaxAge(v); }}
                className="w-full accent-flame"
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Max: {maxAge}</p>
              <input type="range" min="18" max="99" value={maxAge}
                onChange={(e) => { const v = +e.target.value; setMaxAge(v); if (v < minAge) setMinAge(v); }}
                className="w-full accent-flame"
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
          {saving ? <Spinner size={5} color="border-white" /> : 'Save changes'}
        </button>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full py-3 rounded-2xl border border-red-500/40 text-red-400 font-medium hover:bg-red-500/10 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
