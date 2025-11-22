import { useState } from "react";

function FloUploadPage({ onComplete, onBack }) {
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // for now just simulate:
    onComplete("demo-flo-profile-id");
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="button" onClick={onBack}>
        ← Back
      </button>
      <h2>Upload Flo export</h2>
      <input
        type="file"
        accept=".json,.zip"
        onChange={(e) => setFile(e.target.files[0] || null)}
      />
      <button type="submit" disabled={!file}>
        Upload & continue
      </button>
    </form>
  );
}

export default FloUploadPage;
