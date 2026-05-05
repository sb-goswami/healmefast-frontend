"use client";

import { useState } from "react";
import api from "@/lib/api";
import { UploadCloud } from "lucide-react";
import { motion } from "framer-motion";

export default function UploadBox() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: any) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      await api.post("/upload", formData);
      alert("Upload successful 🚀");
      setFile(null);
    } catch (err) {
      console.error(err);
      alert("Upload failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Upload Box */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="border-2 border-dashed border-gray-600 rounded-2xl p-6 text-center cursor-pointer bg-gray-900 hover:bg-gray-800 transition"
      >
        <input
          type="file"
          onChange={handleFileChange}
          className="hidden"
          id="fileInput"
        />

        <label htmlFor="fileInput" className="cursor-pointer">
          <div className="flex flex-col items-center gap-3">
            <UploadCloud size={40} />
            <p className="text-sm text-gray-400">
              Drag & drop or click to upload
            </p>
          </div>
        </label>
      </motion.div>

      {/* File Preview */}
      {file && (
        <div className="mt-4 p-3 bg-gray-800 rounded-xl flex justify-between items-center">
          <span className="text-sm">{file.name}</span>
          <button
            onClick={() => setFile(null)}
            className="text-red-400 text-sm"
          >
            Remove
          </button>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={loading}
        className="mt-4 w-full bg-white text-black py-2 rounded-xl font-semibold hover:opacity-80 transition"
      >
        {loading ? "Uploading..." : "Upload Report"}
      </button>
    </div>
  );
}
