const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function analyzeReviews(payload) {
  return request("/api/analyses", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchHistory() {
  return request("/api/analyses?limit=12");
}

export function fetchAnalysis(id) {
  return request(`/api/analyses/${id}`);
}

export function fetchHealth() {
  return request("/health");
}
