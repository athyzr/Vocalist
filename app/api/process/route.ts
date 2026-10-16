import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const LLM_MODEL = process.env.GROQ_LLM_MODEL || "openai/gpt-oss-120b";
const STT_MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";

const SYSTEM = `Kamu asisten yang mengubah transkrip rapat/curhat kerja menjadi tindakan.
Balas HANYA JSON valid dengan bentuk:
{
 "summary": "ringkasan 2-3 kalimat",
 "tasks": [{"title":"...","priority":"high|medium|low","assignee":"nama atau -"}],
 "flow": {
   "nodes": [{"id":"1","label":"teks singkat"}],
   "edges": [{"from":"1","to":"2","label":""}]
 }
}
Aturan flow: urutan langkah/alur dari awal sampai akhir, maksimal 10 node,
label singkat (maks 6 kata), tanpa tanda kutip atau kurung. "label" pada edge boleh kosong.
Gunakan bahasa yang sama dengan transkrip.`;

type FlowNode = { id: string | number; label: string };
type FlowEdge = { from: string | number; to: string | number; label?: string };

function cleanLabel(s: unknown): string {
  return String(s ?? "")
    .replace(/["'`()\[\]{}<>|#;\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function buildMermaid(flow: { nodes?: FlowNode[]; edges?: FlowEdge[] } | undefined): string {
  const nodes = (flow?.nodes ?? []).slice(0, 12);
  const edges = flow?.edges ?? [];
  if (nodes.length === 0) return "";

  // Petakan id asli -> id aman (n0, n1, ...)
  const idMap = new Map<string, string>();
  nodes.forEach((n, i) => idMap.set(String(n.id), `n${i}`));

  const lines: string[] = ["graph TD"];
  nodes.forEach((n, i) => {
    lines.push(`  n${i}["${cleanLabel(n.label) || "Langkah " + (i + 1)}"]`);
  });

  let edgeCount = 0;
  for (const e of edges) {
    const from = idMap.get(String(e.from));
    const to = idMap.get(String(e.to));
    if (!from || !to) continue;
    const label = cleanLabel(e.label);
    lines.push(label ? `  ${from} -->|"${label}"| ${to}` : `  ${from} --> ${to}`);
    edgeCount++;
  }

  // Kalau model lupa bikin edges, sambungkan berurutan
  if (edgeCount === 0) {
    for (let i = 0; i < nodes.length - 1; i++) {
      lines.push(`  n${i} --> n${i + 1}`);
    }
  }

  return lines.join("\n");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    if (!audio) {
      return NextResponse.json({ error: "Audio kosong" }, { status: 400 });
    }

    // 1) Speech-to-text
    const stt = await groq.audio.transcriptions.create({
      file: audio,
      model: STT_MODEL,
      response_format: "json",
      // language: "id", // aktifkan jika selalu bahasa Indonesia
    });
    const transcript = stt.text;

    if (!transcript || !transcript.trim()) {
      return NextResponse.json(
        { error: "Suara tidak terdeteksi, coba rekam lagi." },
        { status: 400 }
      );
    }

    // 2) LLM -> JSON terstruktur
    const chat = await groq.chat.completions.create({
      model: LLM_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: transcript },
      ],
    });

    const raw = chat.choices[0]?.message?.content || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const data = JSON.parse(clean);

    // 3) Rakit kode Mermaid di server (pasti valid)
    const mermaid = buildMermaid(data.flow);

    return NextResponse.json({
      transcript,
      summary: data.summary ?? "",
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      mermaid,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Gagal memproses" },
      { status: 500 }
    );
  }
}