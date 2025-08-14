import React, { useState } from "react";
import api from "../api";
import { useUser } from "./UserProvider";

export default function TutorDocumentUpload({ onUpload }) {
  const { user } = useUser();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file.");
      return;
    }
    setUploading(true);
    setError("");
    setSuccess("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/api/tutor/upload-document/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Upload successful!");
      setFile(null);
      if (onUpload) onUpload(res.data);
    } catch (err) {
      setError(
        err.response?.data?.error || "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="tutor-upload-section">
      <h3>Upload Documents (PDF, DOCX, etc.)</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {success && <div style={{ color: "green" }}>{success}</div>}
    </div>
  );
}
