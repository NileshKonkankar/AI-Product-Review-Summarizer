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
    <main className="min-h-screen bg-paper text-ink p-4 sm:p-8 md:p-12">
      <div className="mx-auto max-w-[1600px]">
        <header className="app-header animate-slide-in stagger-1">
          <div>
            <p className="eyebrow text-xl">AI Product Review Summarizer</p>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-tighter sm:text-6xl lg:text-7xl max-w-4xl">
              Turn messy reviews into a hard buying decision.
            </h1>
          </div>
          <div className="status-strip" aria-label="Service status">
            <span className={health?.status === "ok" ? "status-dot is-live" : "status-dot"} />
            <span>{health?.status === "ok" ? "API LIVE" : "API OFFLINE"}</span>
            <span className="divider" />
            <span>{health?.database === "connected" ? "DB ACTIVE" : "DB OFFLINE"}</span>
          </div>
        </header>

        <div className={`mt-12 grid gap-8 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${result ? "lg:grid-cols-[400px_minmax(0,1fr)]" : "max-w-4xl mx-auto"}`}>
          <div className="flex flex-col gap-8 animate-slide-in stagger-2">
            <form className="tool-panel" onSubmit={handleSubmit}>
              <h2 className="text-3xl font-black uppercase tracking-tighter border-b-4 border-line pb-4 mb-6">
                Command Center
              </h2>

              <label className="field-label" htmlFor="productName">
                Product name
              </label>
              <input
                id="productName"
                className="field-input"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="NOISE-CANCELLING HEADPHONES"
              />

              <label className="field-label" htmlFor="sourceUrl">
                Source URL
                <span className="ml-2 font-bold text-coral">REQUIRED</span>
              </label>
              <input
                id="sourceUrl"
                className="field-input"
                type="url"
                required
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="HTTPS://STORE.EXAMPLE/PRODUCT"
              />

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <label className="field-label m-0" htmlFor="reviewsText">
                  Raw Reviews
                </label>
                <label className="file-button">
                  Upload .TXT / .CSV
                  <input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={handleFileUpload} />
                </label>
              </div>

              {fileName ? <p className="mt-3 text-sm font-bold text-ink/60 uppercase tracking-widest">LOADED: {fileName}</p> : null}

              <textarea
                id="reviewsText"
                className="review-box"
                value={reviewsText}
                onChange={(event) => setReviewsText(event.target.value)}
                placeholder="PASTE REVIEWS HERE..."
              />

              <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-4 border-line pt-6">
                <p className="text-lg font-black uppercase tracking-widest">{reviewCount} REVIEW{reviewCount === 1 ? "" : "S"}</p>
                <button className="primary-button text-lg" type="submit" disabled={loading}>
                  {loading ? "ANALYZING..." : "ANALYZE NOW"}
                </button>
              </div>

              {error ? <p className="error-box">{error}</p> : null}
            </form>

            <HistoryPanel
              records={history}
              activeId={result?.id}
              loadingId={historyLoadingId}
              onOpen={openHistoryItem}
            />
          </div>

          {(result || loading) && (
            <div className="animate-slide-in stagger-3">
              <AnalysisResult result={result} onExport={exportResult} loading={loading} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function AnalysisResult({ result, onExport, loading }) {
  if (loading) {
    return (
      <section className="result-panel flex flex-col gap-8 h-full min-h-[600px]">
        <div className="skeleton h-16 w-3/4" />
        <div className="skeleton h-8 w-1/2" />
        <div className="skeleton h-64 w-full" />
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
        </div>
      </section>
    );
  }

  if (!result) return null;

  return (
    <section className="result-panel flex flex-col gap-8 h-full">
      <div className="flex flex-col gap-4 border-b-8 border-line pb-8 animate-slide-in stagger-1">
        <p className="eyebrow text-xl">{result.provider || "local"} analysis</p>
        <h2 className="text-5xl sm:text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] break-words">
          {result.productName}
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-6">
          <p className="text-xl font-bold text-ink/60 uppercase tracking-widest">
            {result.reviewCount} REVIEWS &mdash; {formatDate(result.createdAt)}
          </p>
          <button className="secondary-button" type="button" onClick={onExport}>
            Export RAW
          </button>
        </div>
      </div>

      <p className="summary-box text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-tight animate-slide-in stagger-2">
        {result.summary}
      </p>

      <div className="grid gap-6 sm:grid-cols-3 animate-slide-in stagger-3">
        <MetricTile label="Sentiment Score" value={`${result.sentiment.score}`} detail={result.sentiment.label} />
        <MetricTile
          label="Confidence"
          value={`${result.recommendation.confidence}/10`}
          detail={result.recommendation.verdict}
        />
        <MetricTile
          label="Fake Risk"
          value={result.fakeReviewDetection.riskLevel}
          detail={`${result.fakeReviewDetection.suspiciousCount} SIGNAL(S)`}
        />
      </div>

      <div className="animate-slide-in stagger-4">
        <SentimentBars sentiment={result.sentiment} total={result.reviewCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 animate-slide-in stagger-5">
        <InsightList title="Positives" items={result.pros} tone="positive" />
        <InsightList title="Negatives" items={result.cons} tone="negative" />
      </div>

      <div className="animate-slide-in stagger-5">
        <InsightList title="Key Takeaways" items={result.keyInsights} />
      </div>

      <div className="recommendation-box animate-slide-in stagger-5">
        <p className="text-lg font-black uppercase tracking-widest text-teal">Final Verdict</p>
        <p className="mt-4 text-5xl lg:text-7xl font-black uppercase tracking-tighter">{result.recommendation.verdict}</p>
        <p className="mt-6 text-xl font-bold uppercase leading-relaxed text-ink/80">{result.recommendation.reason}</p>
      </div>

      <div className="animate-slide-in stagger-5">
        <InsightList title="Suspicious Signals" items={result.fakeReviewDetection.reasons} tone="negative" />
      </div>
    </section>
  );
}

function MetricTile({ label, value, detail }) {
  return (
    <div className="metric-tile flex flex-col justify-between">
      <p className="text-sm font-black uppercase tracking-widest text-ink/60">{label}</p>
      <p className="mt-6 text-6xl lg:text-7xl font-black tracking-tighter">{value}</p>
      <p className="mt-4 text-lg font-bold uppercase tracking-wider">{detail}</p>
    </div>
  );
}

function SentimentBars({ sentiment, total }) {
  const items = [
    { label: "POSITIVE", value: sentiment.positive, className: "bg-leaf" },
    { label: "NEUTRAL", value: sentiment.neutral, className: "bg-honey" },
    { label: "NEGATIVE", value: sentiment.negative, className: "bg-coral" }
  ];

  return (
    <div className="sentiment-box">
      <p className="text-lg font-black uppercase tracking-widest text-ink">Sentiment Distribution</p>
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-[100px_minmax(0,1fr)_50px] items-center gap-4 text-base font-bold">
            <span className="text-ink/60">{item.label}</span>
            <div className="bar-track">
              <span
                className={`bar-fill ${item.className}`}
                style={{ width: `${Math.max((item.value / Math.max(total, 1)) * 100, item.value ? 5 : 0)}%` }}
              />
            </div>
            <span className="text-right text-xl font-black">{item.value}</span>
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
      <h3 className="text-xl font-black uppercase tracking-widest text-ink">{title}</h3>
      <ul className="mt-6 space-y-4">
        {items?.length ? (
          items.map((item) => (
            <li className="flex items-start gap-4 text-lg font-medium leading-relaxed text-ink/90" key={item}>
              <span className={markerClass} />
              <span>{item}</span>
            </li>
          ))
        ) : (
          <li className="text-lg font-bold text-ink/40 uppercase">NO DATA DETECTED.</li>
        )}
      </ul>
    </div>
  );
}

function HistoryPanel({ records, activeId, loadingId, onOpen }) {
  return (
    <section className="history-panel">
      <div className="flex items-center justify-between gap-4 border-b-4 border-line pb-4">
        <h2 className="text-2xl font-black uppercase tracking-tighter">History</h2>
        <span className="border-4 border-line bg-paper px-3 py-1 text-base font-black">{records.length}</span>
      </div>

      <div className="mt-6 grid gap-4">
        {records.length ? (
          records.map((record) => (
            <button
              className={`history-item ${activeId === record.id ? "is-active" : ""}`}
              key={record.id}
              type="button"
              onClick={() => onOpen(record.id)}
            >
              <span className="text-lg font-black uppercase truncate block w-full">{record.productName}</span>
              <span className="text-sm font-bold text-ink/60 uppercase tracking-widest mt-1 block">
                {loadingId === record.id
                  ? "LOADING..."
                  : `${record.reviewCount} REVIEWS / ${record.recommendation?.verdict || "ANALYZED"}`}
              </span>
            </button>
          ))
        ) : (
          <p className="text-base font-bold text-ink/50 uppercase border-dashed border-4 border-line p-6 text-center">NO LOGS AVAILABLE</p>
        )}
      </div>
    </section>
  );
}

// Helpers
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
  if (!value) return "JUST NOW";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value)).toUpperCase();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default App;
