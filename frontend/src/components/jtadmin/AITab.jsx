import { useState, useEffect } from "react";

const authH = (token) => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });

export default function AITab({ token }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newModel, setNewModel] = useState("");

  useEffect(() => {
    fetch("/api/jtadmin/ai-settings", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setSettings(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const persist = async (updates) => {
    setSaving(true);
    try {
      await fetch("/api/jtadmin/ai-settings", { method: "PUT", headers: authH(token), body: JSON.stringify(updates) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert("Lưu thất bại: " + e.message); }
    setSaving(false);
  };

  const selectModel = (model) => {
    setSettings(s => ({ ...s, active_model: model }));
    persist({ active_model: model });
  };

  const removeModel = (model) => {
    if (settings.available_models.length <= 1) return;
    const models = settings.available_models.filter(m => m !== model);
    const active = model === settings.active_model ? models[0] : settings.active_model;
    setSettings(s => ({ ...s, available_models: models, active_model: active }));
    persist({ available_models: models, active_model: active });
  };

  const addModel = () => {
    const m = newModel.trim();
    if (!m || settings.available_models.includes(m)) return;
    const models = [...settings.available_models, m];
    setSettings(prev => ({ ...prev, available_models: models }));
    persist({ available_models: models });
    setNewModel("");
  };

  const inp = {
    fontSize: 13, padding: "8px 12px", borderRadius: 8,
    border: "1px solid var(--border)", boxSizing: "border-box",
    fontFamily: "var(--font-mono)", outline: "none",
    background: "var(--bg)", color: "var(--text)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, padding: "0 0 14px", borderBottom: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text)" }}>AI Models</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saving && <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Đang lưu...</span>}
          {saved && <span style={{ fontSize: 12, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>✓ Đã lưu</span>}
        </div>
      </div>

      {/* Scrollable */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 0" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : !settings ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Không tải được AI settings.</p>
        ) : (
          <>
            {/* Active model */}
            <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)", borderRadius: 14, padding: "16px 20px", marginBottom: 24 }}>
              <p style={{ fontSize: 10, color: "var(--accent)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 6 }}>ACTIVE MODEL</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-mono)" }}>{settings.active_model}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Dùng cho chatbot tư vấn và phân tích JD</p>
            </div>

            {/* Model list */}
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Nhấp vào model để đặt làm active:</p>
            <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
              {settings.available_models.map(model => (
                <div key={model} onClick={() => selectModel(model)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "13px 16px", borderRadius: 12, cursor: "pointer",
                    border: `1px solid ${settings.active_model === model ? "var(--accent-border)" : "var(--border)"}`,
                    background: settings.active_model === model ? "var(--accent-dim)" : "var(--bg-card)",
                    transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, border: `2px solid ${settings.active_model === model ? "var(--accent)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {settings.active_model === model && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />}
                    </div>
                    <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: settings.active_model === model ? "var(--accent)" : "var(--text)" }}>{model}</span>
                  </div>
                  {settings.available_models.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); removeModel(model); }}
                      style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "none", color: "#f87171", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      title="Xóa model">✕</button>
                  )}
                </div>
              ))}
            </div>

            {/* Add new model */}
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: 8 }}>THÊM MODEL MỚI</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newModel} onChange={e => setNewModel(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addModel()}
                placeholder="gemini-..."
                style={{ ...inp, flex: 1 }} />
              <button onClick={addModel}
                style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-display)", flexShrink: 0 }}>
                Thêm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
