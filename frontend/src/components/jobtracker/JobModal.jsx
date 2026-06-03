import { useState } from "react";

export const emptyJob = () => ({
  title: "", url: "", company: "", loc: "HCM", mode: "On-site",
  month: new Date().getMonth() + 1, year: new Date().getFullYear(),
  status: "applied", jd: "",
});

function JdEditorModal({ value, onSave, onClose }) {
  const [text, setText] = useState(value || "");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px", width: 600, maxWidth: "96vw", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--text)" }}>Nội dung JD</h2>
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Paste Job Description vào đây..."
          style={{ width: "100%", height: "50vh", fontSize: 13, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", fontFamily: "var(--font-display)", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6, background: "var(--bg)", color: "var(--text)" }} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "none", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-display)", color: "var(--text-muted)" }}>Huỷ</button>
          <button onClick={() => onSave(text.trim() || null)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-display)" }}>Lưu JD</button>
        </div>
      </div>
    </div>
  );
}

export default function JobModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || emptyJob());
  const [showJdEditor, setShowJdEditor] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inp = { fontSize: 13, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", width: "100%", boxSizing: "border-box", fontFamily: "var(--font-display)", outline: "none", background: "var(--bg)", color: "var(--text)" };
  const lbl = { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5, marginTop: 14 };

  const handleSave = () => {
    if (!form.title.trim() || !form.company.trim()) return;
    onSave({ ...form, month: parseInt(form.month), year: parseInt(form.year), jd: form.jd?.trim() || null });
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "28px 28px 24px", width: 480, maxWidth: "94vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 12px 48px rgba(0,0,0,0.5)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: "var(--text)", fontFamily: "var(--font-display)" }}>{initial ? "Sửa job" : "Thêm job mới"}</h2>

          <label style={lbl}>Vị trí <span style={{ color: "var(--accent)" }}>*</span></label>
          <input value={form.title} onChange={e => set("title", e.target.value)} style={inp} placeholder="Software Engineer" />

          <label style={lbl}>URL</label>
          <input value={form.url} onChange={e => set("url", e.target.value)} style={inp} placeholder="https://linkedin.com/jobs/..." />

          <label style={lbl}>Công ty <span style={{ color: "var(--accent)" }}>*</span></label>
          <input value={form.company} onChange={e => set("company", e.target.value)} style={inp} placeholder="Google" />

          <label style={lbl}>Trạng thái</label>
          <select value={form.status} onChange={e => set("status", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
            <option value="not_applied">Chưa apply</option>
            <option value="applied">Đã apply</option>
            <option value="viewed">Đã xem CV</option>
            <option value="downloaded">Đã tải CV</option>
            <option value="interviewing">Đang phỏng vấn</option>
            <option value="waiting">Chờ kết quả</option>
            <option value="rejected">Đã từ chối</option>
            <option value="failed">Rớt</option>
          </select>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Địa điểm</label>
              <input value={form.loc} onChange={e => set("loc", e.target.value)} style={inp} placeholder="HCM" />
            </div>
            <div>
              <label style={lbl}>Hình thức</label>
              <select value={form.mode} onChange={e => set("mode", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                <option>On-site</option><option>Hybrid</option><option>Remote</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Tháng apply</label>
              <input type="number" min={1} max={12} value={form.month} onChange={e => set("month", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Năm apply</label>
              <input type="number" min={2020} max={2099} value={form.year} onChange={e => set("year", e.target.value)} style={inp} />
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setShowJdEditor(true)}
              style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "none", cursor: "pointer", fontFamily: "var(--font-display)", color: "var(--text-muted)" }}>
              {form.jd ? "Sửa JD" : "+ Thêm JD"}
            </button>
            {form.jd && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Đã có JD ({form.jd.length} ký tự)</span>}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "none", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-display)", color: "var(--text-muted)" }}>Huỷ</button>
            <button onClick={handleSave} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-display)" }}>Lưu</button>
          </div>
        </div>
      </div>
      {showJdEditor && <JdEditorModal value={form.jd} onSave={text => { set("jd", text); setShowJdEditor(false); }} onClose={() => setShowJdEditor(false)} />}
    </>
  );
}
