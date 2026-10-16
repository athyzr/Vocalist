"use client";
import { useEffect, useState } from "react";

export default function MermaidChart({
  code,
  onRender,
}: {
  code: string;
  onRender?: (svg: string) => void;
}) {
  const [svg, setSvg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          htmlLabels: false, // wajib false agar teks ikut saat diekspor ke gambar
          flowchart: { htmlLabels: false, curve: "basis" },
          themeVariables: {
            primaryColor: "#ffe4ef",
            primaryBorderColor: "#f472b6",
            primaryTextColor: "#831843",
            lineColor: "#ec4899",
            edgeLabelBackground: "#fff5f9",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          },
        } as any);
        const { svg } = await mermaid.render("m" + Date.now(), code);
        setSvg(svg);
        setErr("");
        onRender?.(svg);
      } catch {
        setErr("Diagram gagal dirender. Coba rekam ulang ya 🥺");
      }
    })();
  }, [code, onRender]);

  if (err) return <p className="text-sm text-rose-500">{err}</p>;
  return (
    <div
      className="overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}