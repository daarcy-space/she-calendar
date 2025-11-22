import { useState } from "react";

function FloUploadPage({ onComplete, onBack }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);

    // TODO: call backend with FormData
    // For now, just simulate:
    setTimeout(() => {
      onComplete("demo-flo-profile-id");
      setUploading(false);
    }, 800);
  };

  return (
    <div className="screen-root">
      <div className="screen-card">
        <button type="button" onClick={onBack} className="btn-ghost">
          ← Back
        </button>

        <h2
          className="screen-title"
          style={{ fontSize: "1.6rem", marginTop: "1rem" }}
        >
          Upload your Flo export
        </h2>
        <p className="screen-subtitle">
          We&apos;ll parse your past cycles and symptoms to build a personalised
          model. Your data is only used to improve your schedule.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="screen-field">
            <label className="screen-label">Flo export file</label>
            <input
              type="file"
              accept=".json,.zip"
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="screen-input"
              style={{ padding: "0.5rem 0.5rem" }}
            />
          </div>

          <div className="screen-actions" style={{ marginTop: "1.75rem" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!file || uploading}
            >
              {uploading ? "Processing..." : "Upload & continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FloUploadPage;
