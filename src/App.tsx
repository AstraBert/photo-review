import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PhotoReview, Bbox } from "./types";
import "./App.css";

const API_KEY_NAME = "openai";

const SCORE_FIELDS: { key: keyof PhotoReview; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "sharpness_focus", label: "Sharpness & Focus" },
  { key: "exposure", label: "Exposure" },
  { key: "noise", label: "Noise" },
  { key: "color_accuracy", label: "Color Accuracy" },
  { key: "dynamic_range", label: "Dynamic Range" },
  { key: "composition", label: "Composition" },
  { key: "background", label: "Background" },
  { key: "cropping", label: "Cropping" },
  { key: "subject_clarity", label: "Subject Clarity" },
  { key: "emotional_impact", label: "Emotional Impact" },
  { key: "moment_timing", label: "Moment & Timing" },
  { key: "lighting", label: "Lighting" },
  { key: "color_harmony", label: "Color Harmony" },
  { key: "post_processing", label: "Post-Processing" },
];

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#84cc16";
  if (score >= 40) return "#eab308";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

function fileToBytes(file: File): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      resolve(Array.from(bytes));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function ApiKeySetup({ onSaved }: { onSaved: () => Promise<void> }) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await invoke("save_api_key", { keyName: API_KEY_NAME, apiKey: key.trim() });
      await onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="setup-container">
      <div className="setup-card">
        <h1>Photo Review</h1>
        <p className="setup-subtitle">
          AI-powered photography critique using OpenAI vision models.
        </p>
        <form onSubmit={handleSave} className="setup-form">
          <label htmlFor="api-key">OpenAI API Key</label>
          <input
            id="api-key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            autoFocus
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={saving || !key.trim()}>
            {saving ? "Saving..." : "Save API Key"}
          </button>
        </form>
        <p className="setup-hint">
          Your key is stored securely in the system keyring and never leaves your device except when calling OpenAI.
        </p>
      </div>
    </div>
  );
}

function ScoreBar({ label, score, explanation }: { label: string; score: number; explanation: string }) {
  const [expanded, setExpanded] = useState(false);
  const color = getScoreColor(score);

  return (
    <div className="score-row" onClick={() => setExpanded((v) => !v)}>
      <div className="score-header">
        <span className="score-label">{label}</span>
        <span className="score-value" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="score-track">
        <div
          className="score-fill"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      {expanded && <p className="score-explanation">{explanation}</p>}
    </div>
  );
}

function BboxOverlay({
  bboxes,
  imgWidth,
  imgHeight,
  containerWidth,
  containerHeight,
  activeIndex,
}: {
  bboxes: Bbox[];
  imgWidth: number;
  imgHeight: number;
  containerWidth: number;
  containerHeight: number;
  activeIndex: number | null;
}) {
  const scaleX = containerWidth / imgWidth;
  const scaleY = containerHeight / imgHeight;

  return (
    <>
      {bboxes.map((bbox, i) => {
        // Backend coords: origin at bottom-right, x increases left, y increases up
        const cssLeft = (imgWidth - (bbox.x + bbox.width)) * scaleX;
        const cssTop = (imgHeight - (bbox.y + bbox.height)) * scaleY;
        const cssWidth = bbox.width * scaleX;
        const cssHeight = bbox.height * scaleY;

        return (
          <div
            key={i}
            className={`bbox ${activeIndex === i ? "active" : ""}`}
            style={{
              left: cssLeft,
              top: cssTop,
              width: cssWidth,
              height: cssHeight,
            }}
          >
            <span className="bbox-label">{bbox.text}</span>
          </div>
        );
      })}
    </>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasCheckedKey, setHasCheckedKey] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [review, setReview] = useState<PhotoReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeBbox, setActiveBbox] = useState<number | null>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invoke<string>("get_api_key", { keyName: API_KEY_NAME })
      .then((key) => setApiKey(key))
      .catch(() => setApiKey(null))
      .finally(() => setHasCheckedKey(true));
  }, []);

  async function refreshApiKey() {
    try {
      const key = await invoke<string>("get_api_key", { keyName: API_KEY_NAME });
      setApiKey(key);
    } catch {
      setApiKey(null);
    }
  }

  const measureContainer = useCallback(() => {
    if (imgContainerRef.current) {
      const rect = imgContainerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    measureContainer();
    window.addEventListener("resize", measureContainer);
    return () => window.removeEventListener("resize", measureContainer);
  }, [measureContainer]);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setError(null);
    setReview(null);
    setActiveBbox(null);

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      // measure after image renders
      requestAnimationFrame(measureContainer);
    };
    img.src = url;

    setLoading(true);
    try {
      const bytes = await fileToBytes(file);
      const result = await invoke<PhotoReview>("review_picture", {
        picture: bytes,
        apiKey,
      });
      setReview(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave() {
    setDragOver(false);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  async function deleteKey() {
    try {
      await invoke("delete_api_key", { keyName: API_KEY_NAME });
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      setApiKey(null);
      setShowSettings(false);
      setImageUrl(null);
      setImageSize(null);
      setReview(null);
    } catch (err) {
      setError(String(err));
    }
  }

  if (!hasCheckedKey) {
    return (
      <div className="container">
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (!apiKey) {
    return <ApiKeySetup onSaved={refreshApiKey} />;
  }

  const overallScore = review?.overall.score ?? 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Photo Review</h1>
        <button
          className="icon-btn"
          onClick={() => setShowSettings((v) => !v)}
          title="Settings"
        >
          ⚙
        </button>
      </header>

      {showSettings && (
        <div className="settings-panel">
          <p>OpenAI API key is saved.</p>
          <button className="danger-btn" onClick={deleteKey}>
            Delete API Key
          </button>
        </div>
      )}

      <main className="app-main">
        <div
          className={`upload-zone ${dragOver ? "drag-over" : ""} ${imageUrl ? "has-image" : ""}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !imageUrl && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileInputChange}
            hidden
          />
          {imageUrl ? (
            <div className="image-wrapper" ref={imgContainerRef}>
              <img
                src={imageUrl}
                alt="Uploaded"
                className="preview-image"
                onLoad={measureContainer}
              />
              {containerSize && imageSize && review && (
                <BboxOverlay
                  bboxes={review.bboxes}
                  imgWidth={imageSize.width}
                  imgHeight={imageSize.height}
                  containerWidth={containerSize.width}
                  containerHeight={containerSize.height}
                  activeIndex={activeBbox}
                />
              )}
            </div>
          ) : (
            <div className="upload-prompt">
              <p className="upload-icon">📷</p>
              <p>Drag & drop a photo here, or click to browse</p>
            </div>
          )}
        </div>

        {loading && (
          <div className="status-box">
            <div className="spinner" />
            <p>Analyzing image with AI...</p>
          </div>
        )}

        {error && <div className="status-box error">{error}</div>}

        {review && (
          <div className="review-panel">
            <div className="overall-score">
              <div
                className="overall-circle"
                style={{
                  borderColor: getScoreColor(overallScore),
                  color: getScoreColor(overallScore),
                }}
              >
                {overallScore}
              </div>
              <div className="overall-info">
                <h2>Overall</h2>
                <p>{review.overall.explanation}</p>
              </div>
            </div>

            {review.bboxes.length > 0 && (
              <div className="bbox-list">
                <h3>Highlighted Areas</h3>
                <div className="bbox-chips">
                  {review.bboxes.map((bbox, i) => (
                    <button
                      key={i}
                      className={`bbox-chip ${activeBbox === i ? "active" : ""}`}
                      onMouseEnter={() => setActiveBbox(i)}
                      onMouseLeave={() => setActiveBbox(null)}
                    >
                      {bbox.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="scores-list">
              <h3>Detailed Scores</h3>
              {SCORE_FIELDS.map(({ key, label }) => {
                const entry = review[key] as { score: number; explanation: string };
                return (
                  <ScoreBar
                    key={key}
                    label={label}
                    score={entry.score}
                    explanation={entry.explanation}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
