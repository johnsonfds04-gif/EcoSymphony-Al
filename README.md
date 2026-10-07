# EcoSymphony AI – From Problems to Intelligent Resources

**AI-powered waste intelligence prototype for Goa** enabling citizen waste scanning, location-tagged incident reporting, rule-based and AI prioritization, municipal dashboard tracking, and resource recovery estimation.

> *"EcoSymphony AI does not replace waste-management authorities. It gives them better information to identify problems, prioritize action, track results and recover valuable resources."*

---

## Core Capabilities

1. **HTML5 AI Waste Camera (`Scan & Report`)**:
   - Standard `navigator.mediaDevices.getUserMedia()` live rear-camera stream (`facingMode: { ideal: "environment" }`) with resolution telemetry and image upload fallback.
2. **Gemini Vision Waste Classification**:
   - Server-side `/api/analyze-waste` endpoint using `@google/genai` (`gemini-3.8-flash`) to identify main waste categories, detected objects, material types, mixed-waste status, recyclability, potential hazards, and estimated quantity (`Small` / `Medium` / `Large`).
3. **Geolocation & Goa Municipal Configuration**:
   - Captures browser GPS coordinates with configurable Goa municipalities and village panchayats (initial demo location: **Cuncolim, Salcete, Goa**).
4. **Rule-Based + AI Priority Engine**:
   - Calculates `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL` priority with transparent explanations and optional authorized supervisor override.
5. **Citizen Portal (`My EcoSymphony`)**:
   - Supports Google Sign-In via Firebase Authentication or a one-click **Demo Citizen Profile**, 8-stage status timeline tracking, **EcoPoints** gamification, achievement badges, anti-spam duplicate checks, and a privacy-aware community leaderboard.
6. **Municipal Waste Intelligence Dashboard**:
   - Summary KPI cards, category/priority/status/area charts, interactive Leaflet GIS map (plus offline prototype map grid), stored-data hotspot detection, **Before/After** cleanup verification, configurable **Waste-to-Value** recovery rates, and the **Ask EcoSymphony AI** assistant grounded strictly in stored incident records.

---

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure environment variables**:
   Copy `.env.example` to `.env` and add your `GEMINI_API_KEY`:
   ```bash
   cp .env.example .env
   ```
3. **Start the development server** (runs Express + Vite on port `3000`):
   ```bash
   npm run dev
   ```

---

## Pushing to a GitHub Repository & Deploying to Firebase Hosting

### 1. Push Code to GitHub
If you have exported or downloaded this project locally:
```bash
git init
git add .
git commit -m "Initial commit: EcoSymphony AI Goa Prototype"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### 2. Deploy Manually to Firebase Hosting
Both `firebase.json` and `.firebaserc` (linked to project `key-cabinet-89brs`) are pre-configured in the root directory:
```bash
npm install -g firebase-tools
firebase login
npm run build
firebase deploy --only hosting
```

### 3. Automatic GitHub Actions Deployment
A GitHub Actions workflow is included at `.github/workflows/firebase-hosting-merge.yml`. To enable automatic deploys on every push to `main`, run:
```bash
firebase init hosting:github
```
This will generate the `FIREBASE_SERVICE_ACCOUNT_KEY_CABINET_89BRS` secret in your GitHub repository and automatically deploy `dist/` whenever changes are pushed to `main`.
