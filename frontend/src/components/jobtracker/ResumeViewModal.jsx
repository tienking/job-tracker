export default function ResumeViewModal({ url, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", flexDirection: "column" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ margin: "24px auto", width: "92%", maxWidth: 860, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "var(--bg-surface)" }}>
          <button onClick={onClose} style={{ fontSize: 12, padding: "5px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "none", cursor: "pointer", fontFamily: "var(--font-display)", color: "var(--text-muted)" }}>Đóng</button>
        </div>
        <iframe src={url} style={{ flex: 1, border: "none", width: "100%" }} title="Resume" />
      </div>
    </div>
  );
}
