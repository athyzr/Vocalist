import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  AlignmentType,
} from "docx";

type Task = { title: string; priority: string; assignee: string };

export type ExportData = {
  summary: string;
  tasks: Task[];
  done: boolean[];
  svg: string;
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "Penting",
  medium: "Sedang",
  low: "Santai",
};

async function svgToPng(svg: string) {
  const el = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
  const vb = el.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);
  const w = vb?.[2] || 800;
  const h = vb?.[3] || 600;
  el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  el.setAttribute("width", String(w));
  el.setAttribute("height", String(h));
  el.removeAttribute("style");

  const xml = new XMLSerializer().serializeToString(el);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  });

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("png gagal");
  return { data: new Uint8Array(await blob.arrayBuffer()), w, h };
}

const heading = (text: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, color: "DB2777" })],
  });

export async function exportToDocx({ summary, tasks, done, svg }: ExportData) {
  const date = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: "Vocalist", bold: true, color: "DB2777" })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: `Dibuat pada ${date}`, color: "9D6B86", italics: true })],
    }),

    heading("Ringkasan"),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun(summary || "-")] }),

    heading("To-Do List"),
    ...tasks.map(
      (t, i) =>
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: `${done[i] ? "☑" : "☐"}  ${t.title}` }),
            new TextRun({
              text: `   (${t.assignee || "-"} · ${PRIORITY_LABEL[t.priority] || t.priority})`,
              color: "9D6B86",
              size: 20,
            }),
          ],
        })
    ),

    heading("Diagram Alur"),
  ];

  try {
    if (!svg) throw new Error("no svg");
    const { data, w, h } = await svgToPng(svg);
    const ratio = Math.min(1, 600 / w, 760 / h);
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: "png",
            data,
            transformation: { width: Math.round(w * ratio), height: Math.round(h * ratio) },
          }),
        ],
      })
    );
  } catch {
    children.push(new Paragraph("(Diagram tidak dapat disertakan)"));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 24 } } } },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Vocalist-${new Date().toISOString().slice(0, 10)}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}