const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "PROJECT_FUNCTIONALITY_GUIDE.md");
const outputPath = path.join(__dirname, "PROJECT_FUNCTIONALITY_GUIDE.pdf");

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 54;
const MARGIN_TOP = 58;
const MARGIN_BOTTOM = 58;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const NORMAL_SIZE = 10.5;
const SMALL_SIZE = 8.5;
const LINE_GAP = 4;

const pdfEscape = (value) =>
  String(value)
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const cleanMarkdown = (line) =>
  line
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

const estimateCharWidth = (fontSize, bold = false) => fontSize * (bold ? 0.57 : 0.52);

const wrapText = (text, fontSize, maxWidth, indentWidth = 0, bold = false) => {
  const words = cleanMarkdown(text).split(" ").filter(Boolean);
  const lines = [];
  let current = "";
  const charWidth = estimateCharWidth(fontSize, bold);
  const maxChars = Math.max(12, Math.floor((maxWidth - indentWidth) / charWidth));

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    if ((current + " " + word).length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
};

const newPage = (pages) => {
  const page = {
    ops: [],
    y: PAGE_HEIGHT - MARGIN_TOP,
  };
  pages.push(page);
  return page;
};

const ensureSpace = (pages, page, neededHeight) => {
  if (page.y - neededHeight < MARGIN_BOTTOM) {
    return newPage(pages);
  }
  return page;
};

const addText = (page, text, x, y, fontName, fontSize) => {
  if (!text) return;
  page.ops.push(`BT /${fontName} ${fontSize.toFixed(2)} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(text)}) Tj ET`);
};

const addWrappedBlock = (pages, page, text, options = {}) => {
  const {
    x = MARGIN_X,
    font = "F1",
    size = NORMAL_SIZE,
    bold = false,
    prefix = "",
    hangingIndent = 0,
    before = 0,
    after = 6,
  } = options;

  const lines = wrapText(text, size, CONTENT_WIDTH, hangingIndent, bold);
  const lineHeight = size + LINE_GAP;
  page = ensureSpace(pages, page, before + lines.length * lineHeight + after);
  page.y -= before;

  lines.forEach((line, index) => {
    const linePrefix = index === 0 ? prefix : "";
    const lineX = x + (index === 0 ? 0 : hangingIndent);
    addText(page, `${linePrefix}${line}`, lineX, page.y, font, size);
    page.y -= lineHeight;
  });

  page.y -= after;
  return page;
};

const renderMarkdown = (markdown) => {
  const pages = [];
  let page = newPage(pages);
  const lines = markdown.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      page.y -= 5;
      if (page.y < MARGIN_BOTTOM) page = newPage(pages);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      page = ensureSpace(pages, page, 46);
      page = addWrappedBlock(pages, page, trimmed.slice(2), {
        font: "F2",
        size: 22,
        bold: true,
        before: 0,
        after: 13,
      });
      continue;
    }

    if (trimmed.startsWith("## ")) {
      page = ensureSpace(pages, page, 34);
      page = addWrappedBlock(pages, page, trimmed.slice(3), {
        font: "F2",
        size: 15,
        bold: true,
        before: 11,
        after: 7,
      });
      continue;
    }

    if (trimmed.startsWith("### ")) {
      page = addWrappedBlock(pages, page, trimmed.slice(4), {
        font: "F2",
        size: 12.5,
        bold: true,
        before: 7,
        after: 5,
      });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      page = addWrappedBlock(pages, page, trimmed.slice(2), {
        prefix: "- ",
        hangingIndent: 14,
        before: 0,
        after: 2,
      });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const [, number, text] = trimmed.match(/^(\d+\.)\s+(.*)$/);
      page = addWrappedBlock(pages, page, text, {
        prefix: `${number} `,
        hangingIndent: 18,
        before: 0,
        after: 2,
      });
      continue;
    }

    page = addWrappedBlock(pages, page, trimmed, {
      before: 0,
      after: 5,
    });
  }

  pages.forEach((item, index) => {
    addText(item, "Vyaha / NearU Project Functionality Guide", MARGIN_X, 28, "F1", SMALL_SIZE);
    addText(item, `Page ${index + 1} of ${pages.length}`, PAGE_WIDTH - MARGIN_X - 58, 28, "F1", SMALL_SIZE);
  });

  return pages;
};

const buildPdf = (pages) => {
  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("");
  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];

  pages.forEach((page) => {
    const stream = page.ops.join("\n");
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
};

const markdown = fs.readFileSync(inputPath, "utf8");
const pages = renderMarkdown(markdown);
const pdfBuffer = buildPdf(pages);
fs.writeFileSync(outputPath, pdfBuffer);

console.log(`Generated ${outputPath}`);
console.log(`Pages: ${pages.length}`);
console.log(`Size: ${pdfBuffer.length} bytes`);
