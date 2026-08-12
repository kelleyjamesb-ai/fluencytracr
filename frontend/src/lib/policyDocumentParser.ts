const readAsArrayBuffer = (file: File) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });

const extractPdfText = async (file: File) => {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = await readAsArrayBuffer(file);
  const pdf = await pdfjs.getDocument({ data }).promise;
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const text = await page.getTextContent();
    const lines: string[] = [];
    let currentLine: string[] = [];
    let previousY: number | null = null;
    for (const item of text.items) {
      if (!("str" in item) || !item.str) continue;
      const y = "transform" in item ? Number(item.transform[5]) : null;
      if (
        currentLine.length > 0 &&
        previousY !== null &&
        y !== null &&
        Math.abs(y - previousY) > 2
      ) {
        lines.push(currentLine.join(" "));
        currentLine = [];
      }
      currentLine.push(item.str);
      if (y !== null) previousY = y;
    }
    if (currentLine.length > 0) lines.push(currentLine.join(" "));
    chunks.push(lines.join("\n"));
  }

  return chunks.join("\n").trim();
};

const extractDocxText = async (file: File) => {
  const mammoth = await import("mammoth");
  const data = await readAsArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer: data });
  return result.value.trim();
};

const extension = (name: string) => name.toLowerCase().split(".").pop() ?? "";

export const parseDocumentText = async (file: File) => {
  const ext = extension(file.name);
  if (ext === "pdf") {
    const text = await extractPdfText(file);
    return { text, contentType: file.type || "application/pdf" };
  }
  if (ext === "docx") {
    const text = await extractDocxText(file);
    return {
      text,
      contentType:
        file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    };
  }
  if (ext === "doc") {
    throw new Error("Legacy .doc is not supported. Save the document as .docx and upload again.");
  }
  throw new Error("Unsupported file type. Upload a .pdf or .docx file.");
};

export const parsePolicyDocument = parseDocumentText;
