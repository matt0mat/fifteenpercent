// src/components/PlaygroundsCard.jsx
import React, { useMemo, useState } from "react";
import tokens from "../theme/tokens";
import usePlaygrounds from "../hooks/usePlaygrounds";

const ui = {
  line: "rgba(255,255,255,0.10)",
  muted: "rgba(255,255,255,0.65)",
  text: "rgba(255,255,255,0.92)",
  card: "#111214",
};

export default function PlaygroundsCard({ apiBase, value, onChange }) {
  const { items, loading, err, create, remove } = usePlaygrounds(apiBase);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const selected = useMemo(
    () => items.find((p) => p.id === value) || null,
    [items, value]
  );

  const handleCreate = async () => {
    if (!name.trim()) return;
    const pg = await create({ name: name.trim(), description: description.trim() });
    if (pg?.id) {
      onChange?.(pg.id);
      setShowNew(false);
      setName("");
      setDescription("");
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = await remove(id);
    if (ok && value === id) onChange?.(""); // clear selection if deleted
  };

  return (
    <div
      className="p-6 rounded-2xl shadow-lg flex flex-col space-y-4"
      style={{ backgroundColor: ui.card, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: ui.text }}>
          Playgrounds
        </h2>
        <button
          onClick={() => setShowNew((s) => !s)}
          className="px-3 py-1 rounded-md text-sm bg-white bg-opacity-10 hover:bg-opacity-20"
          style={{ color: ui.text }}
        >
          {showNew ? "Close" : "New"}
        </button>
      </div>

      {/* New playground form */}
      {showNew && (
        <div className="space-y-2 border rounded-lg p-3" style={{ borderColor: ui.line }}>
          <div className="flex flex-col">
            <label className="text-xs" style={{ color: ui.muted }}>
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-md bg-transparent border"
              style={{
                borderColor: ui.line,
                backgroundColor: "rgba(255,255,255,0.05)",
                color: ui.text,
              }}
              placeholder="e.g., ops-handbook-v1"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs" style={{ color: ui.muted }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="px-3 py-2 rounded-md bg-transparent border"
              style={{
                borderColor: ui.line,
                backgroundColor: "rgba(255,255,255,0.05)",
                color: ui.text,
                resize: "none",
              }}
              placeholder="What goes in here?"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-md text-sm bg-white bg-opacity-10 hover:bg-opacity-20"
              style={{ color: ui.text }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div
        className="rounded-lg border divide-y overflow-hidden"
        style={{ borderColor: ui.line }}
      >
        {loading && (
          <div className="px-3 py-2 text-sm" style={{ color: ui.muted }}>
            Loading…
          </div>
        )}
        {err && (
          <div className="px-3 py-2 text-sm text-red-400">
            {`Error: ${err} (do your /playgrounds routes exist?)`}
          </div>
        )}
        {!loading && items.length === 0 && !err && (
          <div className="px-3 py-2 text-sm" style={{ color: ui.muted }}>
            No playgrounds yet.
          </div>
        )}
        {items.map((p) => (
          <div
            key={p.id}
            className="px-3 py-2 flex items-center justify-between hover:bg-white hover:bg-opacity-5"
          >
            <button
              onClick={() => onChange?.(p.id)}
              className="text-left"
              title={p.description || ""}
            >
              <div
                className="text-sm font-medium"
                style={{ color: value === p.id ? ui.text : ui.muted }}
              >
                {p.name} {value === p.id ? "•" : ""}
              </div>
              <div className="text-xs" style={{ color: ui.muted }}>
                {p.id}
              </div>
            </button>
            <button
              onClick={() => handleDelete(p.id)}
              className="px-2 py-1 rounded text-xs bg-white bg-opacity-10 hover:bg-opacity-20"
              style={{ color: ui.text }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Current selection hint */}
      <div className="text-xs" style={{ color: ui.muted }}>
        Active playground →{" "}
        <span className="font-mono" style={{ color: ui.text }}>
          {selected ? selected.id : "none"}
        </span>
        <div className="mt-1">
          (We auto-fill the “Tenant ID” for Ingest/Query/Synth with this.)
        </div>
      </div>
    </div>
  );
}
