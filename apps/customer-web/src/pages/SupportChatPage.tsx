import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createSupportTicket,
  getMySupportTickets,
  getSupportFAQs,
  sendSupportMessage,
  type FAQEntry,
  type SupportTicket
} from "@vyaha/api-client";
import CustomerShell from "../components/CustomerShell";

export default function SupportChatPage() {
  const [params] = useSearchParams();
  const mode = params.get("mode") === "report" ? "report" : "chat";
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [subject, setSubject] = useState(mode === "report" ? "Report an issue" : "Customer support");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeTicket = tickets.find((t) => t._id === activeId) || null;

  const load = async () => {
    const [faqRes, ticketRes] = await Promise.all([
      getSupportFAQs(),
      getMySupportTickets(mode === "report" ? "REPORT_ISSUE" : "CUSTOMER_SUPPORT")
    ]);
    setFaqs(faqRes.data || []);
    setTickets(ticketRes.data || []);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [mode]);

  const startTicket = async () => {
    setError("");
    if (!message.trim()) {
      setError("Enter a message.");
      return;
    }
    const res = await createSupportTicket({
      subject,
      message,
      category: mode === "report" ? "REPORT_ISSUE" : "CUSTOMER_SUPPORT"
    });
    if (res.success && res.data) {
      setTickets((prev) => [res.data!, ...prev]);
      setActiveId(res.data._id);
      setMessage("");
    }
  };

  const sendMessage = async () => {
    if (!activeId || !message.trim()) return;
    const res = await sendSupportMessage(activeId, message);
    if (res.success && res.data) {
      setTickets((prev) => prev.map((t) => (t._id === activeId ? res.data! : t)));
      setMessage("");
    }
  };

  return (
    <CustomerShell title={mode === "report" ? "Report an issue" : "Customer support"}>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
        <div>
          <h4>FAQs</h4>
          {faqs.map((faq) => (
            <details key={faq.question} className="card" style={{ marginBottom: 8 }}>
              <summary>{faq.question}</summary>
              <p style={{ color: "var(--muted)" }}>{faq.answer}</p>
            </details>
          ))}
          <h4>Tickets</h4>
          {tickets.map((t) => (
            <button
              key={t._id}
              className={`btn ghost ${activeId === t._id ? "" : ""}`}
              style={{ width: "100%", marginBottom: 6, textAlign: "left" }}
              onClick={() => setActiveId(t._id)}
            >
              {t.subject}
            </button>
          ))}
        </div>
        <div className="card">
          {!activeTicket ? (
            <>
              <div className="field">
                <label>Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="field">
                <label>Message</label>
                <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              {error ? <p className="error-text">{error}</p> : null}
              <button className="btn" onClick={startTicket}>
                Start conversation
              </button>
            </>
          ) : (
            <>
              <p>
                <strong>{activeTicket.subject}</strong> · {activeTicket.status}
              </p>
              <div style={{ maxHeight: 320, overflow: "auto", marginBottom: 12 }}>
                {activeTicket.messages?.map((m, idx) => (
                  <div key={m._id || idx} style={{ marginBottom: 8, textAlign: m.senderRole === "customer" ? "right" : "left" }}>
                    <span className="badge">{m.senderRole}</span>
                    <p>{m.message}</p>
                  </div>
                ))}
              </div>
              <div className="field">
                <label>Reply</label>
                <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <button className="btn" onClick={sendMessage}>
                Send
              </button>
            </>
          )}
        </div>
      </div>
    </CustomerShell>
  );
}
