# 🚀 Start Servers - Quick Reference

## TL;DR - Just Copy These Commands

### Terminal 1 - Backend
```bash
cd /Users/mariaivanova/Desktop/Deriv014_final/Deriv014/backend
source ../venv/bin/activate
python run.py
```
**Wait for:** `Running on http://127.0.0.1:5000` ✅

---

### Terminal 2 - Frontend
```bash
cd /Users/mariaivanova/Desktop/Deriv014_final/Deriv014
npm run dev
```
**Wait for:** `Local: http://localhost:5173/` ✅

---

### Then Open Browser
```
http://localhost:5173
```

**Check console (F12):**
- Should see: ✅ Backend Connected!

---

## Quick Test

1. Click "New Employee" → "AI Assisted"
2. Answer AI questions
3. Click "Generate Offer Letter"
4. **Should work now!** 🎉

---

## If Button Still Stuck

**Open browser console (F12) and look for:**
- ❌ "Backend NOT Connected!" → Backend not running
- ❌ "Failed to fetch" → Backend not running
- ✅ "Backend Connected!" → Backend is OK, check form data

**Check backend terminal for errors**

---

## Stop Servers

**Backend:** Press `Ctrl+C` in backend terminal  
**Frontend:** Press `Ctrl+C` in frontend terminal

---

## Restart Everything

1. Stop both servers (Ctrl+C)
2. Close both terminals
3. Open new terminals
4. Run commands above again
5. Refresh browser

---

## Environment Variables

Make sure `.env` file exists in backend folder:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_key
```

---

That's it! 🎉
