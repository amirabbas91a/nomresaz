import { Fragment } from "react";
import { parseMarkdown, type Run } from "@/lib/markdown";

function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r, i) => {
        let n: React.ReactNode = r.text;
        if (r.bold) n = <strong>{n}</strong>;
        if (r.italic) n = <em>{n}</em>;
        if (r.uncertain) return <mark key={i} title="بخش نامطمئن؛ نیازمند تأیید شما">{n}</mark>;
        if (r.added) return <span key={i} className="added" title="محتوای افزوده‌شده توسط هوش مصنوعی">{n}</span>;
        return <Fragment key={i}>{n}</Fragment>;
      })}
    </>
  );
}

/** Renders the safe Markdown subset as React elements (no innerHTML). */
export function MarkdownView({ text }: { text: string }) {
  const blocks = parseMarkdown(text);
  if (!blocks.length) return <p className="text-faint">پیش‌نمایشی برای نمایش وجود ندارد.</p>;
  return (
    <div className="prose-fa">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h": { const T = (`h${b.level}`) as "h1" | "h2" | "h3"; return <T key={i}><Runs runs={b.runs} /></T>; }
          case "p": return <p key={i}><Runs runs={b.runs} /></p>;
          case "quote": return <blockquote key={i}><Runs runs={b.runs} /></blockquote>;
          case "ul": return <ul key={i}>{b.items.map((it, j) => <li key={j}><Runs runs={it} /></li>)}</ul>;
          case "ol": return <ol key={i}>{b.items.map((it, j) => <li key={j}><Runs runs={it} /></li>)}</ol>;
          case "table": return <div key={i} className="overflow-x-auto"><table><tbody>{b.rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => (ri === 0 ? <th key={ci}><Runs runs={c} /></th> : <td key={ci}><Runs runs={c} /></td>))}</tr>)}</tbody></table></div>;
        }
      })}
    </div>
  );
}
