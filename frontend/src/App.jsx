import { useEffect, useMemo, useState } from "react";
import { analyzeReviews, fetchAnalysis, fetchHealth, fetchHistory } from "./api.js";

const sampleReviews = [
  "The battery life is excellent and it lasts through a full work day. Setup was easy and the build feels sturdy.",
  "Good value for the price. The screen is bright and the product feels reliable after two weeks.",
  "Shipping was late and the package had a small dent, but the device itself works well.",
  "The app is confusing at first. I had to restart pairing twice before it connected.",
  "Amazing quality, comfortable to use, and I would recommend it to friends.",
  "The charging cable feels cheap and customer support was slow to respond."
].join("\n");

function App() {
  const [productName, setProductName] = useState("Wireless Fitness Tracker");
  const [sourceUrl, setSourceUrl] = useState("");
  const [reviewsText, setReviewsText] = useState(sampleReviews);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoadingId, setHistoryLoadingId] = useState("");
  const [error, setError] = useState("");

  const reviewCount = useMemo(() => splitReviews(reviewsText).length, [reviewsText]);

  useEffect(() => {
    refreshHistory();
    fetchHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  async function refreshHistory() {
    try {
      const records = await fetchHistory();
      setHistory(records);
    } catch {
      setHistory([]);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const analysis = await analyzeReviews({
        productName,
        sourceUrl,
        reviewsText
      });
      setResult(analysis);
      await refreshHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const text = await file.text();
    const parsed = file.name.toLowerCase().endsWith(".csv") ? parseCsvReviews(text) : text;
    setReviewsText(parsed);
  }

  async function openHistoryItem(id) {
    setHistoryLoadingId(id);
    setError("");

    try {
      const analysis = await fetchAnalysis(id);
      setResult(analysis);
      setProductName(analysis.productName || "");
      setSourceUrl(analysis.sourceUrl || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setHistoryLoadingId("");
    }
  }

  function exportResult() {
    if (!result) return;

    const lines = [
      `Product: ${result.productName}`,
      `Reviews analyzed: ${result.reviewCount}`,
      `Generated: ${formatDate(result.createdAt)}`,
      "",
      "Summary",
      result.summary,
      "",
      "Key Insights",
      ...result.keyInsights.map((item) => `- ${item}`),
      "",
      "Pros",
      ...result.pros.map((item) => `- ${item}`),
      "",
      "Cons",
      ...result.cons.map((item) => `- ${item}`),
      "",
      "Sentiment",
      `${result.sentiment.label} (${result.sentiment.score}/100)`,
      `Positive: ${result.sentiment.positive}, Neutral: ${result.sentiment.neutral}, Negative: ${result.sentiment.negative}`,
      "",
      "Recommendation",
      `${result.recommendation.verdict} (${result.recommendation.confidence}/10)`,
      result.recommendation.reason,
      "",
      "Suspicious Review Detection",
      `${result.fakeReviewDetection.riskLevel} risk, ${result.fakeReviewDetection.suspiciousCount} suspicious signal(s)`,
      ...result.fakeReviewDetection.reasons.map((item) => `- ${item}`)
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(result.productName || "review-analysis")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="app-header">
          <div>
            <p className="eyebrow">AI Product Review Summarizer</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
              Turn messy customer reviews into a clear buying decision.
            </h1>
          </div>
          <div className="status-strip" aria-label="Service status">
            <span className={health?.status === "ok" ? "status-dot is-live" : "status-dot"} />
            <span>{health?.status === "ok" ? "API connected" : "API status unknown"}</span>
            <span className="divider" />
            <span>{health?.database === "connected" ? "MongoDB on" : "Demo history"}</span>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <form className="tool-panel" onSubmit={handleSubmit}>
            <div className="image-strip">
              <img
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80"
                alt="Customer purchase decisions"
              />
              <div>
                <p className="text-sm font-semibold text-ink">Review workspace</p>
                <p className="text-sm text-ink/70">
                  Paste reviews, load a text or CSV file, then generate a structured readout.
                </p>
              </div>
            </div>

            <label className="field-label" htmlFor="productName">
              Product name
            </label>
            <input
              id="productName"
              className="field-input"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="Example: Noise-cancelling headphones"
            />

            <label className="field-label" htmlFor="sourceUrl">
              Source URL
              <span className="ml-2 font-normal text-ink/50">optional</span>
            </label>
            <input
              id="sourceUrl"
              className="field-input"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://store.example/product"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="field-label m-0" htmlFor="reviewsText">
                Reviews
              </label>
              <label className="file-button">
                Upload TXT or CSV
                <input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={handleFileUpload} />
              </label>
            </div>

            {fileName ? <p className="mt-2 text-sm text-ink/60">Loaded {fileName}</p> : null}

            <textarea
              id="reviewsText"
              className="review-box"
              value={reviewsText}
              onChange={(event) => setReviewsText(event.target.value)}
              placeholder="Paste each review on a new line, or separate longer reviews with blank lines."
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink/65">{reviewCount} review{reviewCount === 1 ? "" : "s"} detected</p>
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? "Analyzing..." : "Analyze reviews"}
              </button>
            </div>

            {error ? <p className="error-box">{error}</p> : null}
          </form>

          <section className="flex min-w-0 flex-col gap-5">
            <AnalysisResult result={result} onExport={exportResult} loading={loading} />
            <HistoryPanel
              records={history}
              activeId={result?.id}
              loadingId={historyLoadingId}
              onOpen={openHistoryItem}
            />
          </section>
        </div>
      </section>
    </main>
  );
}

function AnalysisResult({ result, onExport, loading }) {
  if (loading) {
    return (
      <section className="result-panel">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-24 w-full" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="empty-panel">
        <p className="eyebrow">Ready</p>
        <h2 className="mt-2 text-2xl font-semibold">Your summary will land here.</h2>
        <p className="mt-3 text-ink/70">
          Run the sample set or paste your own reviews to see sentiment, recurring pros and cons,
          suspicious-review signals, and a final buy recommendation.
        </p>
      </section>
    );
  }

  return (
    <section className="result-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{result.provider || "local"} analysis</p>
          <h2 className="mt-2 text-2xl font-semibold">{result.productName}</h2>
          <p className="mt-1 text-sm text-ink/60">
            {result.reviewCount} reviews analyzed - {formatDate(result.createdAt)}
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={onExport}>
          Export text
        </button>
      </div>

      <p className="summary-box">{result.summary}</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile label="Sentiment" value={`${result.sentiment.score}/100`} detail={result.sentiment.label} />
        <MetricTile
          label="Recommendation"
          value={`${result.recommendation.confidence}/10`}
          detail={result.recommendation.verdict}
        />
        <MetricTile
          label="Fake risk"
          value={result.fakeReviewDetection.riskLevel}
          detail={`${result.fakeReviewDetection.suspiciousCount} signal(s)`}
        />
      </div>

      <SentimentBars sentiment={result.sentiment} total={result.reviewCount} />

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightList title="Pros" items={result.pros} tone="positive" />
        <InsightList title="Cons" items={result.cons} tone="negative" />
      </div>

      <InsightList title="Key insights" items={result.keyInsights} />

      <div className="recommendation-box">
        <p className="text-sm font-semibold text-ink">Final recommendation</p>
        <p className="mt-1 text-xl font-semibold">{result.recommendation.verdict}</p>
        <p className="mt-2 text-ink/70">{result.recommendation.reason}</p>
      </div>

      <InsightList title="Suspicious-review notes" items={result.fakeReviewDetection.reasons} />
    </section>
  );
}

function MetricTile({ label, value, detail }) {
  return (
    <div className="metric-tile">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 min-h-5 text-sm text-ink/70">{detail}</p>
    </div>
  );
}

function SentimentBars({ sentiment, total }) {
  const items = [
    { label: "Positive", value: sentiment.positive, className: "bg-leaf" },
    { label: "Neutral", value: sentiment.neutral, className: "bg-honey" },
    { label: "Negative", value: sentiment.negative, className: "bg-coral" }
  ];

  return (
    <div className="sentiment-box">
      <p className="text-sm font-semibold text-ink">Sentiment split</p>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-[86px_minmax(0,1fr)_36px] items-center gap-3 text-sm">
            <span className="text-ink/70">{item.label}</span>
            <div className="bar-track">
              <span
                className={`bar-fill ${item.className}`}
                style={{ width: `${Math.max((item.value / Math.max(total, 1)) * 100, item.value ? 6 : 0)}%` }}
              />
            </div>
            <span className="text-right font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightList({ title, items, tone }) {
  const markerClass = tone === "positive" ? "marker-positive" : tone === "negative" ? "marker-negative" : "marker-neutral";

  return (
    <div className="insight-list">
      <h3 className="text-sm font-semibold uppercase text-ink/65">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items?.length ? (
          items.map((item) => (
            <li className="flex gap-2 text-sm leading-6 text-ink/80" key={item}>
              <span className={markerClass} />
              <span>{item}</span>
            </li>
          ))
        ) : (
          <li className="text-sm text-ink/55">No strong recurring theme found.</li>
        )}
      </ul>
    </div>
  );
}

function HistoryPanel({ records, activeId, loadingId, onOpen }) {
  return (
    <section className="history-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">History</p>
          <h2 className="mt-1 text-xl font-semibold">Recent analyses</h2>
        </div>
        <span className="rounded-md border border-line px-2 py-1 text-sm text-ink/60">{records.length}</span>
      </div>

      <div className="mt-4 grid gap-3">
        {records.length ? (
          records.map((record) => (
            <button
              className={`history-item ${activeId === record.id ? "is-active" : ""}`}
              key={record.id}
              type="button"
              onClick={() => onOpen(record.id)}
            >
              <span className="font-semibold">{record.productName}</span>
              <span className="text-sm text-ink/60">
                {loadingId === record.id
                  ? "Loading..."
                  : `${record.reviewCount} reviews - ${record.recommendation?.verdict || "Analyzed"}`}
              </span>
            </button>
          ))
        ) : (
          <p className="text-sm text-ink/60">No saved analyses yet. Run one to start the list.</p>
        )}
      </div>
    </section>
  );
}

function splitReviews(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n|\n/g)
    .map((review) => review.trim())
    .filter((review) => review.length >= 8);
}

function parseCsvReviews(text) {
  const rows = parseCsvRows(text);
  if (!rows.length) return "";

  const header = rows[0].map((cell) => cell.toLowerCase().trim());
  const reviewColumnIndex = header.findIndex((cell) =>
    ["review", "reviews", "comment", "comments", "text", "body"].includes(cell)
  );
  const startIndex = reviewColumnIndex >= 0 ? 1 : 0;
  const columnIndex = reviewColumnIndex >= 0 ? reviewColumnIndex : 0;

  return rows
    .slice(startIndex)
    .map((row) => row[columnIndex])
    .filter(Boolean)
    .join("\n");
}

function parseCsvRows(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current.trim());
  rows.push(row);
  return rows.filter((cells) => cells.some(Boolean));
}

function formatDate(value) {
  if (!value) return "just now";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default App;
