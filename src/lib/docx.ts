import "server-only";
import {
  type IParagraphOptions,
  AlignmentType, Document, Footer, HeadingLevel, LevelFormat, Packer, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle,
} from "docx";
import { parseMarkdown, type Block, type Run } from "./markdown";

const FONT = "Tahoma";

function runs(rs: Run[], size = 24, extra: { bold?: boolean; color?: string } = {}) {
  return rs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.bold || extra.bold,
        italics: r.italic,
        rightToLeft: true,
        font: FONT,
        size,
        color: r.uncertain ? "B45309" : r.added ? "0F766E" : extra.color,
        highlight: r.uncertain ? "yellow" : undefined,
      }),
  );
}

const para = (children: TextRun[], opts: Omit<IParagraphOptions, "children"> = {}) =>
  new Paragraph({ bidirectional: true, alignment: AlignmentType.START, spacing: { after: 120, line: 360 }, ...opts, children });

function blockToDocx(b: Block): (Paragraph | Table)[] {
  switch (b.type) {
    case "h": {
      const level = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][b.level - 1];
      const size = [36, 30, 26][b.level - 1];
      return [para(runs(b.runs, size, { bold: true, color: b.level === 1 ? "1E40AF" : "0F172A" }), { heading: level, spacing: { before: 280, after: 140 } })];
    }
    case "p":
      return [para(runs(b.runs))];
    case "quote":
      return [para(runs(b.runs, 24, { color: "334155" }), { indent: { start: 360 }, border: { right: { style: BorderStyle.SINGLE, size: 18, color: "2563EB", space: 8 } } })];
    case "ul":
      return b.items.map((it) => para(runs(it), { numbering: { reference: "bullets", level: 0 } }));
    case "ol":
      return b.items.map((it) => para(runs(it), { numbering: { reference: "numbers", level: 0 } }));
    case "table": {
      const cols = Math.max(...b.rows.map((r) => r.length));
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          visuallyRightToLeft: true,
          rows: b.rows.map(
            (r, ri) =>
              new TableRow({
                tableHeader: ri === 0,
                children: Array.from({ length: cols }, (_, ci) =>
                  new TableCell({
                    shading: ri === 0 ? { fill: "DBEAFE" } : undefined,
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                    children: [para(runs(r[ci] ?? [], 22, { bold: ri === 0 }), { spacing: { after: 0 } })],
                  }),
                ),
              }),
          ),
        }),
        new Paragraph({ children: [] }),
      ];
    }
  }
}

export async function buildNotebookDocx(p: { siteName: string; title: string; subject: string; teacher: string; dateText: string; styleLabel: string; content: string }) {
  const cover = [
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 400 }, children: [new TextRun({ text: p.siteName, rightToLeft: true, font: FONT, size: 32, color: "2563EB", bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 600 }, children: [new TextRun({ text: p.title, rightToLeft: true, font: FONT, size: 60, bold: true, color: "0A1A3F" })] }),
    ...[["درس", p.subject], ["استاد", p.teacher], ["سبک", p.styleLabel], ["تاریخ", p.dateText]]
      .filter(([, v]) => v)
      .map(([k, v]) => new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 160 }, children: [new TextRun({ text: `${k}: ${v}`, rightToLeft: true, font: FONT, size: 28, color: "334155" })] })),
  ];
  const body = parseMarkdown(p.content).flatMap(blockToDocx);
  const doc = new Document({
    creator: p.siteName,
    title: p.title,
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.START }] },
        { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START }] },
      ],
    },
    sections: [
      { properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: cover },
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 })] })] }) },
        children: body.length ? body : [para(runs([{ text: "—" }]))],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
