# RailSmartAI

RailSmartAI is an end-to-end train intelligence platform. It combines a TypeScript/Express backend, a React + Vite frontend, and a Python ML microservice to deliver searchable train schedules and AI-powered delay predictions based on historical data.

## Architecture Overview

- **Frontend (`frontend/`)**: React app (MUI, TypeScript) for search, results, and delay insights.
- **Backend (`backend/`)**: Express API with MongoDB that exposes train search endpoints and proxies delay predictions to the ML service.
- **ML Service (`ml-service/`)**: Flask app with a RandomForest model trained on `train delay data.csv`.

```
Client ⇄ Frontend (Vite) ⇄ Backend API ⇄ MongoDB
                                  ↘
                                   ML Service (Flask)
```

## Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10+
- pip / virtualenv (recommended)
- MongoDB running locally (default `mongodb://localhost:27017`)

## Environment Variables

Create `backend/.env` (already provided in repo) and set:

```
MONGODB_URI=mongodb://localhost:27017/railsmartai
ML_SERVICE_URL=http://localhost:5001
```

Restart your terminal after using `setx` on Windows or export values in your shell.

## Initial Setup

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# ML service
cd ../ml-service
python -m venv .venv  # optional but recommended
.\.venv\Scripts\Activate.ps1  # Windows PowerShell
pip install -r requirements.txt
```

## Data Import (Run Once or When CSVs Change)

Both CSVs live at the repo root (`RailSmartAI/`):
- `isl_wise_train_detail_03082015_v1.csv`
- `train delay data.csv`

Import them into MongoDB from the `backend/` folder:

```bash
npm run import:trains   # loads station/route data from isl_wise_train_detail_03082015_v1.csv
npm run import:delays   # loads delay features from train delay data.csv
```

> Each script clears the target collection before inserting new records and logs progress to the console.

## Running the Project (3 Terminals Recommended)

1. **ML Service**
   ```bash
   cd ml-service
   .\.venv\Scripts\Activate.ps1
   python app.py        # serves http://localhost:5001
   ```

2. **Backend API**
   ```bash
   cd backend
   npm run dev          # ts-node-dev hot reload on http://localhost:5000
   # For production: npm run build && npm start
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm run dev          # Vite dev server on http://localhost:5173
   ```

The frontend calls `http://localhost:5000/api`, which in turn requests predictions from the ML service.

## Key API Endpoints

- `GET /api/health` – backend status
- `GET /api/trains/stations` – list of unique station codes/names
- `GET /api/trains/search?source=BBS&destination=BNC&date=2025-11-24` – route-aware train search
- `GET /api/trains/:trainNo` – full stop list for a train
- `POST /api/delays/predict` – invoked by the frontend to fetch delay estimates (forwards to Flask service)

## Frontend Highlights

- Clean navy & white theme with MUI
- Form validations and empty-state messaging
- Delay chips with severity colors and expandable AI suggestions
- Route accordion showing every stop

## Troubleshooting

- **No trains returned**: ensure import scripts were run after adjusting CSV paths, and MongoDB has data (`mongosh railsmartai --eval "db.trains.countDocuments()"`).
- **ML predictions failing**: confirm the Flask service is running and reachable at `ML_SERVICE_URL`.
- **CORS or mixed content errors**: keep all services on `http://localhost` or configure HTTPS consistently.
- **TypeScript errors**: run `npm run build` in `backend/` or `npm run build` in `frontend/` to surface issues.

## Scripts Reference

### Backend
- `npm run dev` – start Express via ts-node-dev
- `npm run build` – compile to `dist/`
- `npm start` – run compiled server
- `npm run import:trains` / `npm run import:delays` – load CSV data

### Frontend
- `npm run dev` – start Vite dev server
- `npm run build` – production bundle
- `npm run preview` – preview the production build

### ML Service
- `python train_model.py` – retrain RandomForest model (writes to `ml-service/models/`)
- `python app.py` – serve the model

## Deploying the Frontend to Vercel

The repository includes `vercel.json`, which tells Vercel to treat `frontend/` as the build root. Steps:

1. Install the Vercel CLI and log in:
   ```bash
   npm i -g vercel
   vercel login
   ```
2. From the repo root, run the first deployment and set the project settings:
   ```bash
   vercel
   ```
   - **Project name**: pick any
   - **Root directory**: leave default (repo root). Vercel reads `vercel.json` and builds the frontend.
   - **Framework preset**: choose `Other` (handled automatically)
3. Configure environment variables in the Vercel dashboard (Project Settings ➜ Environment Variables):
   - `VITE_API_URL` → `https://<your-backend-domain>/api` (or `https://railsmartai-api.vercel.app/api` if hosted separately)
4. Redeploy after variables are saved:
   ```bash
   vercel --prod
   ```

> Only the frontend is deployed to Vercel. Host the Express API and ML service elsewhere (Render, Railway, Fly.io, EC2, etc.) and expose a stable HTTPS URL for `VITE_API_URL`.

## Project Structure

```
RailSmartAI/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── scripts/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   └── package.json
├── ml-service/
│   ├── app.py
│   ├── train_model.py
│   └── models/
├── isl_wise_train_detail_03082015_v1.csv
├── train delay data.csv
└── READme.md
```

## Contributing

1. Create a branch: `git checkout -b feature/my-change`
2. Make changes + add tests/data updates where applicable
3. Run linting/build commands
4. Open a PR describing the change

Enjoy exploring Indian train routes with AI-powered insights! 
