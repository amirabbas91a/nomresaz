import Link from "next/link";
import type { PageBlock } from "@/db/schema";

/** Renders structured, safe page blocks (no raw HTML/JS). */
export function PageBlocks({ blocks }: { blocks: PageBlock[] }) {
  return (
    <div className="grid gap-6">
      {blocks.map((b) => {
        switch (b.type) {
          case "hero":
            return <section key={b.id} className="glass p-8 text-center md:p-12"><h1 className="hero-title m-0 text-3xl font-extrabold leading-snug md:text-4xl">{b.title}</h1>{b.text && <p className="mx-auto mb-0 mt-3 max-w-2xl whitespace-pre-line text-lg text-muted">{b.text}</p>}</section>;
          case "text":
            return <section key={b.id} className="glass-solid p-6">{b.title && <h2 className="mt-0 font-extrabold">{b.title}</h2>}<p className="m-0 whitespace-pre-line leading-8">{b.text}</p></section>;
          case "image":
            return <figure key={b.id} className="glass m-0 overflow-hidden">{b.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={b.imageUrl} alt={b.title ?? ""} loading="lazy" className="w-full object-cover" />}{b.text && <figcaption className="p-3 text-center text-sm text-muted">{b.text}</figcaption>}</figure>;
          case "list":
            return <section key={b.id} className="glass-solid p-6">{b.title && <h2 className="mt-0 font-extrabold">{b.title}</h2>}<ul className="m-0 grid gap-2 ps-5">{b.items?.map((it, i) => <li key={i}>{it}</li>)}</ul></section>;
          case "cta":
            return <section key={b.id} className="glass p-8 text-center"><h2 className="mt-0 font-extrabold">{b.title}</h2>{b.text && <p className="text-muted">{b.text}</p>}{b.buttonLabel && b.buttonUrl && (b.buttonUrl.startsWith("/") ? <Link href={b.buttonUrl} className="btn btn-primary">{b.buttonLabel}</Link> : <a href={b.buttonUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">{b.buttonLabel}</a>)}</section>;
        }
      })}
    </div>
  );
}
