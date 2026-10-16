"use client";
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  Download,
  FileText,
  ListChecks,
  GitBranch,
  Heart,
  Sparkles,
} from "lucide-react";
import MermaidChart from "@/components/MermaidChart";
import { exportToDocx } from "@/lib/exportDocx";

type Task = { title: string; priority: string; assignee: string };
type Result = { transcript: string; summary: string; tasks: Task[]; mermaid: string };

const PRIORITY: Record<string, { label: string; cls: string }> = {
  high: { label: "🔥 Penting", cls: "bg-rose-100 text-rose-600" },
  medium: { label: "⭐ Sedang", cls: "bg-amber-100 text-amber-600" },
  low: { label: "🌱 Santai", cls: "bg-emerald-100 text-emerald-600" },
};

const DECOR = [
  { e: "🎀", c: "left-[6%] top-[10%] text-4xl", d: "0s" },
  { e: "✨", c: "right-[8%] top-[14%] text-3xl", d: "1s" },
  { e: "💖", c: "left-[10%] top-[55%] text-3xl", d: "2s" },
  { e: "🎧", c: "right-[6%] top-[60%] text-4xl", d: "0.5s" },
  { e: "🌸", c: "left-[45%] top-[4%] text-3xl", d: "1.5s" },
];

const card =
  "rounded-3xl border border-pink-100 bg-white/80 p-5 shadow-lg shadow-pink-200/40 backdrop-blur animate-pop sm:p-6";

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState<boolean[]>([]);
  const [svg, setSvg] = useState("");
  const [exporting, setExporting] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!recording) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  // otomatis berhenti di 3 menit
  useEffect(() => {
    if (recording && seconds >= 180) stop();
  }, [seconds, recording]);

  async function start() {
    setError("");
    setResult(null);
    setSvg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        send(new Blob(chunks.current, { type: mr.mimeType }));
      };
      mr.start();
      recorder.current = mr;
      setRecording(true);
    } catch {
      setError("Izin mikrofon ditolak / tidak tersedia 🥺");
    }
  }

  function stop() {
    recorder.current?.stop();
    setRecording(false);
  }

  async function send(blob: Blob) {
    setLoading(true);
    try {
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const fd = new FormData();
      fd.append("audio", new File([blob], `rekaman.${ext}`, { type: blob.type }));
      const res = await fetch("/api/process", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setDone(new Array(data.tasks?.length || 0).fill(false));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!result) return;
    setExporting(true);
    try {
      await exportToDocx({
        summary: result.summary,
        tasks: result.tasks || [],
        done,
        svg,
      });
    } catch {
      setError("Gagal membuat file dokumen 🥺");
    } finally {
      setExporting(false);
    }
  }

  const toggle = (i: number) =>
    setDone((d) => d.map((v, idx) => (idx === i ? !v : v)));

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const doneCount = done.filter(Boolean).length;
  const total = result?.tasks?.length || 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-pink-100 via-rose-50 to-white">
      {/* dekorasi */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-pink-300/30 blur-3xl" />
        <div className="absolute -right-24 top-80 h-80 w-80 rounded-full bg-rose-300/30 blur-3xl" />
        {DECOR.map((d) => (
          <span
            key={d.e}
            className={`absolute animate-float opacity-70 ${d.c}`}
            style={{ animationDelay: d.d }}
          >
            {d.e}
          </span>
        ))}
      </div>

      <main className="relative z-10 mx-auto max-w-3xl space-y-6 px-4 py-10 sm:py-14">
        {/* header */}
        <header className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 animate-wiggle items-center justify-center rounded-3xl bg-gradient-to-br from-pink-400 to-rose-400 text-white shadow-lg shadow-pink-300/60">
            <Mic className="h-8 w-8" />
          </div>
          <h1 className="font-display text-5xl font-bold text-pink-600 sm:text-6xl">
            Vocalist
          </h1>
          <p className="mt-2 text-pink-900/60">
            Ngomong aja, biar Vocalist yang rapihin jadi to-do & diagram ✨
          </p>
        </header>

        {/* area rekam */}
        <section className={`${card} text-center`}>
          <div className="relative flex h-40 items-center justify-center">
            {recording && (
              <>
                <span className="absolute h-28 w-28 rounded-full bg-pink-400/40 animate-ripple" />
                <span
                  className="absolute h-28 w-28 rounded-full bg-pink-400/30 animate-ripple"
                  style={{ animationDelay: "0.6s" }}
                />
              </>
            )}
            <button
              onClick={recording ? stop : start}
              disabled={loading}
              aria-label={recording ? "Berhenti merekam" : "Mulai merekam"}
              className={`relative h-28 w-28 rounded-full text-white shadow-xl shadow-pink-300/60 transition hover:scale-105 active:scale-95 disabled:opacity-60 ${
                recording
                  ? "bg-gradient-to-br from-rose-500 to-pink-600"
                  : "bg-gradient-to-br from-pink-400 to-rose-400"
              }`}
            >
              {recording ? (
                <Square className="mx-auto h-9 w-9" fill="currentColor" />
              ) : (
                <Mic className="mx-auto h-10 w-10" />
              )}
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-3 w-3 animate-bounce rounded-full bg-pink-400"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="font-display text-pink-600">
                Vocalist lagi dengerin & mikir... 🎧
              </p>
            </div>
          ) : recording ? (
            <div>
              <p className="font-display text-3xl text-pink-600">
                {mm}:{ss}
              </p>
              <p className="text-sm text-pink-900/60">
                Lagi merekam... klik tombol untuk selesai (maks. 3 menit)
              </p>
            </div>
          ) : (
            <p className="font-display text-lg text-pink-600">
              {result ? "Mau rekam lagi? Tap mic ya 💕" : "Tap mic untuk mulai ngomong"}
            </p>
          )}
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 animate-pop">
            {error}
          </div>
        )}

        {/* cara kerja (sebelum ada hasil) */}
        {!result && !loading && !recording && (
          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: "🎙️", t: "1. Rekam", d: "Ceritakan ide atau rapatmu" },
              { icon: "📝", t: "2. Rapihin", d: "Jadi ringkasan & to-do list" },
              { icon: "🗺️", t: "3. Simpan", d: "Diagram alur + ekspor ke Word" },
            ].map((s) => (
              <div
                key={s.t}
                className="rounded-2xl border border-pink-100 bg-white/70 p-4 text-center shadow-sm animate-pop"
              >
                <div className="text-3xl">{s.icon}</div>
                <p className="font-display mt-1 text-pink-600">{s.t}</p>
                <p className="text-sm text-pink-900/60">{s.d}</p>
              </div>
            ))}
          </section>
        )}

        {/* hasil */}
        {result && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display flex items-center gap-2 text-2xl text-pink-600">
                <Sparkles className="h-6 w-6" /> Hasil kamu
              </h2>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-pink-300/60 transition hover:scale-105 active:scale-95 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {exporting ? "Menyiapkan..." : "Simpan ke Word"}
              </button>
            </div>

            <section className={card}>
              <h3 className="font-display mb-2 flex items-center gap-2 text-lg text-pink-600">
                <FileText className="h-5 w-5" /> Ringkasan
              </h3>
              <p className="rounded-2xl bg-yellow-50 p-4 leading-relaxed text-pink-950/80">
                {result.summary}
              </p>
            </section>

            <section className={card}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display flex items-center gap-2 text-lg text-pink-600">
                  <ListChecks className="h-5 w-5" /> To-Do List
                </h3>
                <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-600">
                  {doneCount}/{total} selesai
                </span>
              </div>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-pink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-400 transition-all duration-500"
                  style={{ width: total ? `${(doneCount / total) * 100}%` : "0%" }}
                />
              </div>
              <ul className="space-y-2">
                {result.tasks?.map((t, i) => {
                  const p = PRIORITY[t.priority] || { label: t.priority, cls: "bg-pink-100 text-pink-600" };
                  return (
                    <li
                      key={i}
                      onClick={() => toggle(i)}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                        done[i]
                          ? "border-pink-100 bg-pink-50/60"
                          : "border-pink-100 bg-white hover:-translate-y-0.5 hover:shadow-md hover:shadow-pink-200/50"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                          done[i]
                            ? "border-pink-500 bg-pink-500 text-white"
                            : "border-pink-300 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={`flex-1 ${done[i] ? "text-pink-900/40 line-through" : "text-pink-950/80"}`}
                      >
                        {t.title}
                      </span>
                      {t.assignee && t.assignee !== "-" && (
                        <span className="hidden rounded-full bg-fuchsia-100 px-2 py-1 text-xs text-fuchsia-600 sm:inline">
                          👤 {t.assignee}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.cls}`}>
                        {p.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className={card}>
              <h3 className="font-display mb-3 flex items-center gap-2 text-lg text-pink-600">
                <GitBranch className="h-5 w-5" /> Diagram Alur
              </h3>
              <div className="rounded-2xl bg-pink-50/60 p-3">
                <MermaidChart code={result.mermaid} onRender={setSvg} />
              </div>
            </section>

            <details className="rounded-3xl border border-pink-100 bg-white/70 p-4 text-sm">
              <summary className="font-display cursor-pointer text-pink-600">
                Lihat transkrip 📜
              </summary>
              <p className="mt-3 leading-relaxed text-pink-950/70">{result.transcript}</p>
            </details>
          </div>
        )}

        <footer className="pt-6 text-center text-sm text-pink-900/50">
          Dibuat dengan <Heart className="inline h-4 w-4 fill-pink-400 text-pink-400" /> Vocalist
        </footer>
      </main>
    </div>
  );
}