import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Startup: Check backend connection
console.log("%c🚀 DerivHR Starting...", "font-size: 16px; font-weight: bold; color: #10b981;");
console.log("%c📋 Quick Setup Checklist:", "font-size: 14px; font-weight: bold;");
console.log("1️⃣ Backend server running? Check http://localhost:5000/api/health");
console.log("2️⃣ Frontend dev server? You're seeing this, so yes! ✅");
console.log("");
console.log("%c⚠️  If 'Generate Offer Letter' button gets stuck:", "font-size: 13px; color: #f59e0b; font-weight: bold;");
console.log("   → Backend is probably not running!");
console.log("   → Open terminal: cd backend && source ../venv/bin/activate && python run.py");
console.log("");

// Test backend connection
fetch("/api/health")
  .then(res => res.json())
  .then(data => {
    console.log("%c✅ Backend Connected!", "font-size: 14px; color: #10b981; font-weight: bold;");
    console.log("   Status:", data);
  })
  .catch(err => {
    console.error("%c❌ Backend NOT Connected!", "font-size: 14px; color: #ef4444; font-weight: bold;");
    console.error("   Error:", err.message);
    console.log("");
    console.log("%c🔧 To start backend:", "font-size: 13px; font-weight: bold;");
    console.log("   cd backend");
    console.log("   source ../venv/bin/activate");
    console.log("   python run.py");
  });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);