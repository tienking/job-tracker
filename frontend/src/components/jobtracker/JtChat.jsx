import { useState, useEffect, useRef } from "react";

function renderMd(text) {
  return text.split('\n').map((line, i) => {
    const bullet = /^[*-] /.test(line);
    const raw = bullet ? line.slice(2) : line;
    const parts = raw.split(/(\*\*.*?\*\*)/g).map((seg, j) =>
      seg.startsWith('**') && seg.endsWith('**')
        ? <strong key={j}>{seg.slice(2, -2)}</strong>
        : seg
    );
    if (bullet) return (
      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 3 }}>
        <span style={{ flexShrink: 0 }}>•</span><span>{parts}</span>
      </div>
    );
    if (!raw.trim()) return <div key={i} style={{ height: 6 }} />;
    return <div key={i} style={{ marginBottom: 2 }}>{parts}</div>;
  });
}

export const JT_WELCOME = { role: "assistant", content: "Xin chào! Tôi là AI hỗ trợ tìm việc của bạn 👋\nTôi có thể giúp phân tích danh sách job đã apply, đánh giá JD mới, hoặc tư vấn cải thiện hồ sơ. Bạn cần hỗ trợ gì?" };
export const JT_SUGGESTED = ["Tổng kết tình hình apply của tôi", "Tôi nên cải thiện gì trong hồ sơ?", "Phân tích job nào phù hợp nhất với tôi?"];

function JtChatMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
      {!isUser && (
        <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--accent)", marginRight: 7, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>AI</div>
      )}
      <div style={{ maxWidth: "80%", padding: "9px 13px", fontSize: 13, lineHeight: 1.6, background: isUser ? "var(--accent)" : "var(--bg-card)", border: `1px solid ${isUser ? "transparent" : "var(--border)"}`, borderRadius: isUser ? "14px 14px 3px 14px" : "14px 14px 14px 3px", color: isUser ? "#fff" : "var(--text)", wordBreak: "break-word" }}>
        {isUser ? msg.content : renderMd(msg.content)}
      </div>
    </div>
  );
}

function JtChatPopup({ username, token, onClose, analyzeMsg, clearAnalyze, isMobile }) {
  const [messages, setMessages] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const bottomRef = useRef(null);
  const chatContainerRef = useRef(null);
  const chatFileRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const lastSentAnalyzeRef = useRef(null);
  const requestGenRef = useRef(0);

  useEffect(() => {
    fetch(`/api/jobtracker/chat/${username}/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const raw = d.messages?.length ? d.messages : [JT_WELCOME];
        setMessages(raw);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 50);
      })
      .catch(() => setMessages([JT_WELCOME]));
  }, [username, token]);

  useEffect(() => {
    if (analyzeMsg && analyzeMsg.api !== lastSentAnalyzeRef.current && messages !== null && !loading) {
      lastSentAnalyzeRef.current = analyzeMsg.api;
      clearAnalyze?.();
      handleSend(analyzeMsg.api, analyzeMsg.display);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzeMsg, messages]);

  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (loading && !prevLoadingRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLoadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const onScroll = () => { setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 50); };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const clearChat = () => {
    fetch(`/api/jobtracker/chat/${username}/history`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    requestGenRef.current++;
    setMessages([JT_WELCOME]);
    setLoading(false);
  };

  const sendToApi = async (text, file, display) => {
    const headers = { Authorization: `Bearer ${token}` };
    if (file) {
      const fd = new FormData();
      fd.append("file", file); fd.append("message", text || ""); fd.append("session_id", "main");
      const res = await fetch(`/api/jobtracker/chat/${username}/file`, { method: "POST", headers, body: fd });
      return (await res.json()).reply;
    }
    const hasDisplay = display && display !== text;
    const body = { message: hasDisplay ? display : text, session_id: "main" };
    if (hasDisplay) body.analyze_context = text;
    const res = await fetch(`/api/jobtracker/chat/${username}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return (await res.json()).reply;
  };

  const handleSend = async (textOverride, displayOverride) => {
    const text = textOverride !== undefined ? textOverride.trim() : input.trim();
    const display = displayOverride !== undefined ? displayOverride : text;
    if ((!text && !selectedFile) || loading || messages === null) return;
    if (textOverride === undefined) setInput("");
    const file = selectedFile; setSelectedFile(null);
    setLoading(true);
    setMessages(prev => [...prev, { role: "user", content: file ? `📎 ${file.name}${display ? "\n" + display : ""}` : display }]);
    const gen = requestGenRef.current;
    try {
      const reply = await sendToApi(text, file, display);
      if (requestGenRef.current !== gen) return;
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      if (requestGenRef.current !== gen) return;
      setMessages(prev => [...prev, { role: "assistant", content: "Có lỗi xảy ra. Vui lòng thử lại." }]);
    }
    setLoading(false);
  };

  const canSend = (input.trim() || selectedFile) && !loading;

  return (
    <div style={{ position: "fixed", bottom: isMobile ? 84 : 84, right: isMobile ? 16 : 40, left: isMobile ? 16 : "auto", zIndex: 999, width: isMobile ? "auto" : "clamp(408px, 40vw, 696px)", height: isMobile ? "70vh" : 624, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 12px 48px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "var(--font-display)" }}>

      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>AI Trợ lý</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={clearChat} title="Cuộc trò chuyện mới" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 6px" }}>↺</button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 6px" }}>×</button>
        </div>
      </div>

      <div ref={chatContainerRef} style={{ flex: 1, overflowY: "auto", padding: "14px 12px", position: "relative", overscrollBehavior: "contain" }}>
        {messages === null
          ? <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginTop: 20 }}>Đang tải...</div>
          : messages.map((msg, i) => <JtChatMessage key={i} msg={msg} />)}
        {messages?.length === 1 && !loading && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, marginLeft: 33 }}>
            {JT_SUGGESTED.map(q => (
              <button key={q} onClick={() => handleSend(q)}
                style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-display)" }}>{q}</button>
            ))}
          </div>
        )}
        {loading && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--accent)", marginRight: 7, fontWeight: 700, fontFamily: "var(--font-mono)" }}>AI</div>
            <div style={{ padding: "9px 13px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px 14px 14px 3px", color: "var(--text-muted)", fontSize: 13 }}>...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!isAtBottom && (
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0", flexShrink: 0 }}>
          <button onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            style={{ fontSize: 12, padding: "4px 14px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-muted)", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", fontFamily: "var(--font-display)" }}>
            ↓ Cuối
          </button>
        </div>
      )}

      {selectedFile && (
        <div style={{ padding: "6px 12px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, background: "var(--bg-card)", flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {selectedFile.name}</span>
          <button onClick={() => setSelectedFile(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>×</button>
        </div>
      )}

      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: 7, alignItems: "center", flexShrink: 0, background: "var(--bg-card)" }}>
        <button onClick={() => chatFileRef.current?.click()} disabled={loading}
          style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--text-muted)", cursor: loading ? "default" : "pointer", fontSize: 15, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          title="Đính kèm JD (PDF, Word, Text)">📎</button>
        <input ref={chatFileRef} type="file" accept=".pdf,.docx,.txt" onChange={e => { if (e.target.files[0]) setSelectedFile(e.target.files[0]); e.target.value = ""; }} style={{ display: "none" }} />
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={selectedFile ? "Thêm ghi chú (tùy chọn)..." : "Nhập tin nhắn..."}
          rows={1}
          style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "var(--font-display)", resize: "none", outline: "none", lineHeight: 1.5, background: "var(--bg)", color: "var(--text)" }} />
        <button onClick={() => handleSend()} disabled={!canSend}
          style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${canSend ? "var(--accent)" : "var(--border)"}`, background: canSend ? "var(--accent)" : "none", color: canSend ? "#fff" : "var(--text-muted)", cursor: canSend ? "pointer" : "default", fontSize: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
      </div>
    </div>
  );
}

export function JtChatBot({ username, token, open, onToggle, analyzeMsg, clearAnalyze, isMobile }) {
  return (
    <>
      {open && <JtChatPopup username={username} token={token} onClose={() => onToggle(false)} analyzeMsg={analyzeMsg} clearAnalyze={clearAnalyze} isMobile={isMobile} />}
      <button onClick={() => onToggle(o => !o)}
        style={{ position: "fixed", bottom: 24, right: 40, zIndex: 1000, width: 48, height: 48, borderRadius: "50%", border: open ? "1px solid var(--border)" : "none", background: open ? "var(--bg-card)" : "var(--accent)", color: open ? "var(--text-muted)" : "#fff", fontSize: open ? 22 : 18, cursor: "pointer", boxShadow: open ? "none" : "0 4px 20px rgba(236,86,61,0.4)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", fontFamily: "var(--font-display)" }}>
        {open ? "×" : "✦"}
      </button>
    </>
  );
}
