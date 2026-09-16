"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

type Message = { role: "user" | "assistant"; text: string };
type ProgressState = { stage: string; progress: number; message: string; contextCount?: number };

export default function HomePage() {
  const [profileId, setProfileId] = useState("");
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [notice, setNotice] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);

  async function login(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, pin }),
    });
    setNotice(response.ok ? "Zalogowano." : "Nieprawidłowy profil lub PIN.");
    if (response.ok) {
      setNotice("");
      setLoggedIn(true);
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setNotice("");
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!selectedFile) {
      setNotice("Najpierw wybierz materiał.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", selectedFile);
      const response = await fetch("/api/materials", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      setNotice(response.ok ? "Materiał przekazany do indeksowania." : `Błąd wysyłania: ${data.error ?? response.status}`);
      if (response.ok) setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  }

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || asking) return;
    const current = question.trim();
    setQuestion("");
    setMessages((value) => [...value, { role: "user", text: current }]);
    setAsking(true);
    setProgress({ stage: "searching", progress: 10, message: "Przeszukuję materiały…" });
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: current }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(String(data.error ?? "Tutor jest chwilowo niedostępny."));
      }
      if (!response.body) throw new Error("Brak strumienia odpowiedzi.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answerAdded = false;
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const event = block.match(/^event: (.+)$/m)?.[1];
          const dataText = block.match(/^data: (.+)$/m)?.[1];
          if (!event || !dataText) continue;
          const data = JSON.parse(dataText) as ProgressState & { answer?: string; message?: string };
          if (event === "progress") setProgress(data);
          if (event === "error") throw new Error(data.message ?? "Tutor jest chwilowo niedostępny.");
          if (event === "complete") {
            setMessages((value) => [...value, { role: "assistant", text: data.answer ?? "Brak odpowiedzi." }]);
            answerAdded = true;
          }
        }
        if (done) break;
      }
      if (!answerAdded) throw new Error("Tutor nie zwrócił odpowiedzi.");
    } catch (error) {
      setMessages((value) => [...value, { role: "assistant", text: error instanceof Error ? error.message : "Tutor jest chwilowo niedostępny." }]);
    } finally {
      setProgress(null);
      setAsking(false);
    }
  }

  if (!loggedIn) {
    return (
      <main className="login-screen">
        <div className="lumio-logo">lumio</div>
        <div className="lumio-tagline">Twoja osobista przestrzeń do nauki</div>
        <form className="login-card" onSubmit={login}>
          <label htmlFor="profile-id">Twój profil</label>
          <input id="profile-id" placeholder="np. kinga" autoComplete="username" value={profileId} onChange={(event) => setProfileId(event.target.value)} />
          <label htmlFor="profile-pin">PIN</label>
          <input id="profile-pin" placeholder="••••" type="password" autoComplete="current-password" value={pin} onChange={(event) => setPin(event.target.value)} />
          <button className="btn btn-primary" type="submit">Rozpocznij naukę</button>
          {notice && <p className="upload-status error">{notice}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-logo">lumio</div>
        <div className="topbar-stats">Nauka z zatwierdzonych materiałów</div>
        <div className="topbar-actions">
          <span className="topbar-user">{profileId}</span>
          <button className="btn btn-ghost" type="button" onClick={() => setLoggedIn(false)}>Wyloguj</button>
        </div>
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          <section className="sidebar-section">
            <div className="sidebar-title">Dodaj materiały</div>
            <label className="upload-area" htmlFor="file-input">
              {uploading ? "Indeksowanie materiału…" : "Upuść PDF, TXT lub Markdown albo kliknij"}
            </label>
            <input id="file-input" type="file" accept=".pdf,.txt,.md" onChange={selectFile} disabled={uploading} />
            {selectedFile && <div className="file-item"><span className="file-name">📄 {selectedFile.name}</span></div>}
            {notice && <p className={`upload-status ${notice.startsWith("Błąd") ? "error" : "success"}`}>{notice}</p>}
            <form onSubmit={upload}>
              <button className="btn btn-primary" type="submit" disabled={uploading || !selectedFile}>
                {uploading ? "Wysyłanie…" : "Wyślij materiał"}
              </button>
            </form>
          </section>
          <section className="sidebar-section materials">
            <div className="sidebar-title">Moje materiały</div>
            <p className="muted">Materiały pojawią się tutaj po podłączeniu biblioteki.</p>
          </section>
        </aside>

        <section className="chat-area">
          <div className="messages">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <div className="icon">📚</div>
                <h3>Gotowy, żeby pomóc Ci w nauce</h3>
                <p>Dodaj materiał z panelu bocznego, a potem zapytaj mnie o jego treść.</p>
              </div>
            ) : messages.map((message, index) => (
              <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <div className="message-avatar">{message.role === "user" ? profileId.slice(0, 1).toUpperCase() : "✦"}</div>
                <div className="message-bubble">{message.text}</div>
              </div>
            ))}
            {asking && progress && (
              <div className="rag-progress" role="status" aria-live="polite">
                <div className="rag-progress-header">
                  <span className="progress-spinner" />
                  <strong>{progress.message}</strong>
                  <span>{progress.progress}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-value" style={{ width: `${progress.progress}%` }} />
                </div>
                {progress.contextCount !== undefined && <small>{progress.contextCount} fragmentów z materiałów</small>}
              </div>
            )}
          </div>
          <form className="input-bar" onSubmit={ask}>
            <input placeholder="Zapytaj o swoje materiały…" value={question} onChange={(event) => setQuestion(event.target.value)} disabled={asking} />
            <button className="btn btn-primary" type="submit" disabled={asking || !question.trim()}>{asking ? "Myślę…" : "Zapytaj"}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
