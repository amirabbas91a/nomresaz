// Minimal, safe Markdown subset shared by the React preview and the DOCX generator (no raw HTML is ever rendered).
export type Run = { text: string; bold?: boolean; italic?: boolean; uncertain?: boolean; added?: boolean };
export type Block =
  | { type: "h"; level: 1 | 2 | 3; runs: Run[] }
  | { type: "p"; runs: Run[] }
  | { type: "quote"; runs: Run[] }
  | { type: "ul"; items: Run[][] }
  | { type: "ol"; items: Run[][] }
  | { type: "table"; rows: Run[][][] };

export function parseInline(src: string): Run[] {
  const runs: Run[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[؟[^\]]*\]|\[افزوده:[^\]]*\])/g;
  let last = 0;
  for (const m of src.matchAll(re)) {
    if (m.index! > last) runs.push({ text: src.slice(last, m.index) });
    const t = m[0];
    if (t.startsWith("**")) runs.push({ text: t.slice(2, -2), bold: true });
    else if (t.startsWith("[؟")) runs.push({ text: t, uncertain: true });
    else if (t.startsWith("[افزوده:")) runs.push({ text: t.slice(8, -1).trim(), added: true });
    else runs.push({ text: t.slice(1, -1), italic: true });
    last = m.index! + t.length;
  }
  if (last < src.length) runs.push({ text: src.slice(last) });
  return runs;
}

export function parseMarkdown(text: string): Block[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "p", runs: parseInline(para.join(" ")) });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { flush(); continue; }
    const h = t.match(/^(#{1,3})\s+(.*)$/);
    if (h) { flush(); blocks.push({ type: "h", level: h[1].length as 1 | 2 | 3, runs: parseInline(h[2]) }); continue; }
    if (/^>\s?/.test(t)) { flush(); blocks.push({ type: "quote", runs: parseInline(t.replace(/^>\s?/, "")) }); continue; }
    if (/^[-*•]\s+/.test(t)) {
      flush();
      const items: Run[][] = [parseInline(t.replace(/^[-*•]\s+/, ""))];
      while (i + 1 < lines.length && /^\s*[-*•]\s+/.test(lines[i + 1])) items.push(parseInline(lines[++i].trim().replace(/^[-*•]\s+/, "")));
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\d+[.)]\s+/.test(t)) {
      flush();
      const items: Run[][] = [parseInline(t.replace(/^\d+[.)]\s+/, ""))];
      while (i + 1 < lines.length && /^\s*\d+[.)]\s+/.test(lines[i + 1])) items.push(parseInline(lines[++i].trim().replace(/^\d+[.)]\s+/, "")));
      blocks.push({ type: "ol", items });
      continue;
    }
    if (t.startsWith("|")) {
      flush();
      const rows: Run[][][] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith("|")) {
        const cells = lines[j].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells.map(parseInline));
        j++;
      }
      i = j - 1;
      if (rows.length) blocks.push({ type: "table", rows });
      continue;
    }
    para.push(t);
  }
  flush();
  return blocks;
}
