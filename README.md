# 🔥 Binder — Free & Open-Source Dating App

A full-stack Tinder-like dating app built with **React + Vite** (frontend), **Node.js + Express** (backend), and **Supabase** (database, auth, storage, realtime).

**Deploy to: Vercel (frontend) · Render (backend) · Supabase (database)**

---

## ✨ Features

- 🔐 Email/password authentication via Supabase Auth  
- 👤 Multi-step profile setup with photo uploads  
- 💘 Swipe left / right with drag gestures (mobile-first)  
- 🎉 Mutual match detection + animated match modal  
- 💬 Real-time chat powered by Supabase Realtime  
- ⚙️ Editable preferences (gender, age range)  
- 📱 Mobile-first responsive UI  

---

## 🏗 Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS    |
| Backend   | Node.js + Express                 |
| Database  | Supabase (PostgreSQL)             |
| Auth      | Supabase Auth                     |
| Storage   | Supabase Storage (avatars bucket) |
| Realtime  | Supabase Realtime (messages)      |
| Deploy FE | Vercel                            |
| Deploy BE | Render                            |

---

## 🚀 Deployment Guide (Step by Step)

### Step 1 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Once created, go to **SQL Editor** and run the entire contents of `supabase/schema.sql`
3. From **Project Settings → API**, copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon / public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` *(keep secret!)*
4. In **Authentication → URL Configuration**, add your Vercel frontend URL to **Site URL** and **Redirect URLs**

---

### Step 2 — Deploy Backend to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo, set **Root Directory** to `backend`
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Add these **Environment Variables**:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   FRONTEND_URL=https://your-app.vercel.app
   PORT=4000
   ```
6. Deploy and copy your Render URL (e.g. `https://binder-backend.onrender.com`)

---

### Step 3 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo, set **Root Directory** to `frontend`
3. Add these **Environment Variables**:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=https://binder-backend.onrender.com
   ```
4. Deploy! Vercel auto-detects Vite.

---

### Step 4 — Update CORS

Go back to your **Render** service → Environment Variables and update:
```
FRONTEND_URL=https://your-app.vercel.app
```
(Replace with your actual Vercel URL)

---

## 💻 Local Development

### Prerequisites
- Node.js 18+
- A Supabase project (from Step 1)

### Backend
```bash
cd backend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev
# Runs on http://localhost:4000
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
# Fill in:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY
#   VITE_API_URL=http://localhost:4000
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 📁 Project Structure

```
binder/
├── supabase/
│   └── schema.sql          # Run this in Supabase SQL Editor
│
├── backend/                # Express API → deploy to Render
│   ├── src/
│   │   ├── index.js        # Entry point
│   │   ├── lib/
│   │   │   └── supabase.js # Supabase admin client
│   │   ├── middleware/
│   │   │   └── auth.js     # JWT verification
│   │   └── routes/
│   │       ├── profiles.js # CRUD + discovery
│   │       ├── swipes.js   # Swipe + match detection
│   │       ├── matches.js  # List matches
│   │       ├── messages.js # Chat messages
│   │       └── upload.js   # Photo uploads
│   ├── render.yaml
│   └── package.json
│
└── frontend/               # React + Vite → deploy to Vercel
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── lib/
    │   │   ├── supabase.js
    │   │   └── api.js
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   ├── SwipeCard.jsx
    │   │   ├── MatchModal.jsx
    │   │   └── Spinner.jsx
    │   ├── pages/
    │   │   ├── AuthPage.jsx
    │   │   ├── SetupPage.jsx
    │   │   ├── SwipePage.jsx
    │   │   ├── MatchesPage.jsx
    │   │   ├── ChatPage.jsx
    │   │   └── ProfilePage.jsx
    │   ├── App.jsx
    │   └── main.jsx
    ├── vercel.json
    └── package.json
```

---

## 🔒 Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` is **only** used server-side (backend). Never expose it to the frontend.
- All routes are protected with JWT verification via `requireAuth` middleware.
- Row Level Security (RLS) is enabled on all tables as a second layer of protection.
- Photo uploads are limited to 5MB and images only.
- Rate limiting is applied: 200 requests per 15 minutes per IP.

---

## 🛣 Roadmap / Extensions

- [ ] Google / Apple OAuth login
- [ ] Push notifications (web push / expo)
- [ ] Geolocation-based discovery
- [ ] Video profiles
- [ ] Boost / premium features
- [ ] Block & report users
- [ ] Profile verification

---

## 📄 License

MIT — free for personal and commercial use.
