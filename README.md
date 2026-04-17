# AI Product Review Summarizer

A full-stack web app that turns large batches of product reviews into concise buying insights: summary, pros, cons, sentiment mix, confidence score, and basic suspicious-review detection.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB Atlas through Mongoose
- AI providers: Gemini, Groq, Together AI, or Hugging Face
- Styling: CSS with a utility-style component structure
- Deployment: Vercel for `frontend`, Render for `backend`

The backend includes a local heuristic analyzer, so the app still works before AI keys or MongoDB are configured.

## Project Structure

```text
.
+-- backend
|   +-- src
|   |   +-- config
|   |   +-- controllers
|   |   +-- models
|   |   +-- routes
|   |   +-- services
|   |   +-- utils
|   +-- package.json
+-- frontend
    +-- src
    +-- package.json
```

## Local Setup

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

## Environment Variables

Copy the examples and fill values as needed:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Only `MONGODB_URI` and one AI API key are needed for the full production flow. Without them, the backend uses in-memory history and local analysis.

## AI Provider Setup

Set `AI_PROVIDER` in `backend/.env` to one of:

- `gemini`
- `groq`
- `together`
- `huggingface`
- `local`

Then provide the matching API key. Model names are configurable in the same file.

## API Endpoints

- `GET /health` - service health and MongoDB connection status
- `POST /api/analyses` - analyze reviews and save the result when MongoDB is connected
- `POST /api/analyze` - alias for `POST /api/analyses`
- `GET /api/analyses` - list recent analyses
- `GET /api/analyses/:id` - fetch one saved analysis
- `DELETE /api/analyses/:id` - delete a saved analysis

## Deploying

### Backend on Render

1. Create a new Web Service from this repo.
2. Set root directory to `backend`.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables from `backend/.env.example`.
6. Set `CORS_ORIGIN` to your deployed Vercel frontend URL.

### Frontend on Vercel

1. Import the repo into Vercel.
2. Set root directory to `frontend`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add `VITE_API_URL` with your Render backend URL.

## Notes

URL review fetching is intentionally left as a metadata field because review scraping varies by site policy and usually needs site-specific parsing. The paste and file upload flows are fully implemented.
