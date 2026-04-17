import { createFallbackAnalysis } from "./fallbackAnalyzer.js";

export async function runReviewAnalysis({ productName, sourceUrl, reviews }) {
  const fallback = createFallbackAnalysis({ productName, reviews });
  const provider = (process.env.AI_PROVIDER || "local").toLowerCase();

  if (provider === "local") {
    return fallback;
  }

  try {
    const prompt = buildPrompt({ productName, sourceUrl, reviews });
    const aiText = await callProvider(provider, prompt);
    const parsed = parseJsonFromText(aiText);
    return normalizeAiResult(parsed, fallback, provider);
  } catch (error) {
    console.warn(`AI provider failed; using local analyzer. Reason: ${error.message}`);
    return {
      ...fallback,
      provider: `${provider}:fallback`
    };
  }
}

function buildPrompt({ productName, sourceUrl, reviews }) {
  const reviewBlock = reviews
    .map((review, index) => `${index + 1}. ${review}`)
    .join("\n")
    .slice(0, 26000);

  return `
Analyze these product reviews for "${productName || "Untitled product"}".
Source URL metadata: ${sourceUrl || "none"}

Return only valid JSON with this exact shape:
{
  "summary": "string",
  "keyInsights": ["string"],
  "pros": ["string"],
  "cons": ["string"],
  "sentiment": {
    "positive": number,
    "neutral": number,
    "negative": number,
    "score": number,
    "label": "Positive | Mixed | Negative"
  },
  "recommendation": {
    "verdict": "Worth buying | Consider with caveats | Not recommended",
    "confidence": number,
    "reason": "string"
  },
  "fakeReviewDetection": {
    "suspiciousCount": number,
    "riskLevel": "Low | Medium | High",
    "reasons": ["string"]
  }
}

Rules:
- Sentiment counts must add up to ${reviews.length}.
- Confidence must be from 1 to 10.
- Keep pros and cons concise and based on recurring themes.
- Flag fake-review risk only from observable text patterns.

Reviews:
${reviewBlock}
`.trim();
}

async function callProvider(provider, prompt) {
  if (provider === "gemini") {
    return callGemini(prompt);
  }

  if (provider === "groq") {
    return callOpenAiCompatible({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      url: "https://api.groq.com/openai/v1/chat/completions",
      prompt
    });
  }

  if (provider === "together") {
    return callOpenAiCompatible({
      apiKey: process.env.TOGETHER_API_KEY,
      model: process.env.TOGETHER_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      url: "https://api.together.xyz/v1/chat/completions",
      prompt
    });
  }

  if (provider === "huggingface") {
    return callHuggingFace(prompt);
  }

  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") || "";
}

async function callOpenAiCompatible({ apiKey, model, url, prompt }) {
  if (!apiKey) {
    throw new Error("Provider API key is not configured");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You produce careful product-review analysis as strict JSON."
        },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI request failed with ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callHuggingFace(prompt) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const model = process.env.HUGGINGFACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";

  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not configured");
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: `[INST] ${prompt} [/INST]`,
      parameters: {
        max_new_tokens: 1200,
        temperature: 0.2,
        return_full_text: false
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Hugging Face request failed with ${response.status}`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return data[0]?.generated_text || "";
  }

  return data.generated_text || "";
}

function parseJsonFromText(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);

  if (!candidate || !candidate.trim().startsWith("{")) {
    throw new Error("AI response did not include JSON");
  }

  return JSON.parse(candidate);
}

function normalizeAiResult(parsed, fallback, provider) {
  const sentiment = parsed.sentiment || fallback.sentiment;
  const recommendation = parsed.recommendation || fallback.recommendation;
  const fakeReviewDetection = parsed.fakeReviewDetection || fallback.fakeReviewDetection;

  return {
    provider,
    summary: stringOr(parsed.summary, fallback.summary),
    keyInsights: stringArrayOr(parsed.keyInsights, fallback.keyInsights).slice(0, 6),
    pros: stringArrayOr(parsed.pros, fallback.pros).slice(0, 6),
    cons: stringArrayOr(parsed.cons, fallback.cons).slice(0, 6),
    sentiment: {
      positive: numberOr(sentiment.positive, fallback.sentiment.positive),
      neutral: numberOr(sentiment.neutral, fallback.sentiment.neutral),
      negative: numberOr(sentiment.negative, fallback.sentiment.negative),
      score: clamp(numberOr(sentiment.score, fallback.sentiment.score), 0, 100),
      label: stringOr(sentiment.label, fallback.sentiment.label)
    },
    recommendation: {
      verdict: stringOr(recommendation.verdict, fallback.recommendation.verdict),
      confidence: clamp(numberOr(recommendation.confidence, fallback.recommendation.confidence), 1, 10),
      reason: stringOr(recommendation.reason, fallback.recommendation.reason)
    },
    fakeReviewDetection: {
      suspiciousCount: numberOr(
        fakeReviewDetection.suspiciousCount,
        fallback.fakeReviewDetection.suspiciousCount
      ),
      riskLevel: stringOr(fakeReviewDetection.riskLevel, fallback.fakeReviewDetection.riskLevel),
      reasons: stringArrayOr(fakeReviewDetection.reasons, fallback.fakeReviewDetection.reasons).slice(0, 5)
    }
  };
}

function stringOr(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringArrayOr(value, fallback) {
  return Array.isArray(value) && value.length
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : fallback;
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
