# Quick Start Guide - Offer Letter Generation

## 🚨 Issue: Button Stuck on "Processing..."

**Root Cause:** Backend server is not running!

## ✅ Solution: Start Both Servers

### Step 1: Start Backend Server
Open a terminal and run:
```bash
cd /Users/mariaivanova/Desktop/Deriv014_final/Deriv014/backend
source ../venv/bin/activate  # Activate virtual environment
python run.py                # Start Flask backend
```

**You should see:**
```
 * Running on http://127.0.0.1:5000
 * Running on http://192.168.x.x:5000
```

### Step 2: Start Frontend Server
Open ANOTHER terminal and run:
```bash
cd /Users/mariaivanova/Desktop/Deriv014_final/Deriv014
npm run dev
```

**You should see:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### Step 3: Test the Flow
1. Open browser to `http://localhost:5173`
2. Click "New Employee" → "AI Assisted"
3. Answer all AI questions
4. Click "Finish & Generate Offer Letter"
5. Review form and click "Generate Offer Letter"
6. **✨ You should now see the Offer Letter Display!**

## 🔍 How to Verify Backend is Running

### Option 1: Check terminal output
Look for Flask startup messages showing it's running on port 5000

### Option 2: Test health endpoint
Open browser or use curl:
```bash
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok","rag_loaded":true}`

### Option 3: Check browser console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages like:
   - `Failed to fetch` = Backend not running
   - `404 Not Found` = Endpoint doesn't exist
   - `500 Internal Server Error` = Backend error

## 🐛 Debugging Tips

### If button still stuck:

1. **Open Browser Console (F12)** and look for:
   - 🚀 Starting offer letter generation...
   - 📤 Sending data to backend: {...}
   - ❌ Error messages

2. **Check Backend Terminal** for error messages when you click the button

3. **Verify data being sent:**
   - Name, Email, Position must be filled
   - Check console logs for the data payload

### Common Errors:

**Error: "Failed to fetch"**
- Backend is not running
- Start backend with `python run.py`

**Error: "User with this email already exists"**
- Email already in database
- Use a different email or delete the existing user

**Error: "full_name, email, and position_title are required"**
- Required fields are empty
- Fill in all required fields in the form

**Error: "CORS policy"**
- Backend CORS not configured properly
- Backend should have `CORS(app)` enabled

## 📊 Expected Console Output (Working Flow)

When you click "Generate Offer Letter", you should see:

```
🚀 Starting offer letter generation...
Form Data: {candidateName: "John Doe", email: "john@example.com", ...}
📤 Sending data to backend: {full_name: "John Doe", ...}
📥 Response status: 201
✅ Success! Result: {employee_id: "...", offer_url: "/api/offer/..."}
🔗 Offer URL: http://localhost:5173/api/offer/...
```

Then the Offer Letter Display view should appear!

## 🎯 Complete Working Setup Checklist

- [ ] Backend server running on port 5000
- [ ] Frontend dev server running on port 5173
- [ ] Supabase credentials configured in `.env`
- [ ] All required fields filled in the form
- [ ] Email not already in database
- [ ] Browser console shows no errors
- [ ] Browser DevTools Network tab shows successful POST request

## 📞 Still Having Issues?

1. Check both terminals for error messages
2. Look at browser console for detailed logs
3. Verify `.env` file has correct Supabase credentials
4. Try restarting both servers
5. Clear browser cache and localStorage
