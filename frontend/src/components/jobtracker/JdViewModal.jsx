export default function JdViewModal({ title, jd, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px", width: 680, maxWidth: "96vw", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 12px 48px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.4, color: "var(--text)" }}>{title}</h2>
          <button onClick={onClose} style={{ flexShrink: 0, padding: "5px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "none", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-display)", color: "var(--text-muted)" }}>Đóng</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", fontSize: 13, lineHeight: 1.7, color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-word", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          {jd || <span style={{ color: "var(--text-muted)" }}>Chưa có JD.</span>}
        </div>
      </div>
    </div>
  );
}
