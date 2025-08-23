// src/components/Dropzone.jsx
import React, { useRef, useState } from "react";
import tokens from "../theme/tokens";

export default function Dropzone({ onFileSelected, isDragging, onDragOver, onDragLeave }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      onFileSelected?.(f);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDragLeave?.(e);
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      setFile(f);
      onFileSelected?.(f);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver?.(e);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDragLeave?.(e);
  };

  return (
    <div
      className={`p-6 border-2 border-dashed rounded-lg text-center transition-all duration-200 cursor-pointer ${
        isDragging ? "border-white border-opacity-50" : "border-white border-opacity-20"
      }`}
      style={{ backgroundColor: isDragging ? "rgba(255,255,255,0.05)" : "transparent" }}
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="*/*" // allow any file type
      />
      <div className="flex flex-col items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
             strokeLinejoin="round" style={{ color: tokens.muted }}>
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
          <path d="M12 12v9" />
          <path d="m8 17 4 4 4-4" />
        </svg>
        <span className="mt-2 text-sm" style={{ color: tokens.muted }}>
          {file ? `File selected: ${file.name}` : "Drag & drop a file here, or click to select."}
        </span>
      </div>
    </div>
  );
}
