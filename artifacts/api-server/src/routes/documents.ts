import { Router } from "express";
import { db, documentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateFileName, validateFile, getUploadDir, generateCSV, generateXML } from "../lib/fileHandler";
import fs from "fs";
import path from "path";

const router = Router();

router.post("/upload", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data") && !contentType.includes("application/json")) {
      res.status(400).json({ error: "bad_request", message: "Content-Type must be multipart/form-data or application/json" });
      return;
    }

    if (contentType.includes("application/json")) {
      const { clientId, loanRequestId, documentType, documentName, fileContent, mimeType } = req.body;
      if (!documentType || !documentName || !fileContent) {
        res.status(400).json({ error: "bad_request", message: "documentType, documentName, fileContent required" });
        return;
      }

      const fileName = generateFileName(documentName);
      const filePath = path.join(getUploadDir(), fileName);
      const buffer = Buffer.from(fileContent, "base64");
      fs.writeFileSync(filePath, buffer);

      const [doc] = await db.insert(documentsTable).values({
        tenantId,
        clientId: clientId || null,
        guaranteeId: req.body.guaranteeId || null,
        loanRequestId: loanRequestId || null,
        documentType,
        documentName,
        fileUrl: `/uploads/${fileName}`,
        mimeType: mimeType || "application/octet-stream",
        version: req.body.version || 1,
        replacedById: null,
        uploadedById: req.user!.id,
      }).returning();

      res.status(201).json(doc);
      return;
    }

    let body = "";
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const fullBuffer = Buffer.concat(chunks);
        const boundary = contentType.split("boundary=")[1];
        if (!boundary) {
          res.status(400).json({ error: "bad_request", message: "No boundary found" });
          return;
        }

        const parts = fullBuffer.toString("binary").split(`--${boundary}`);
        let fileBuffer: Buffer | null = null;
        let originalName = "file";
        let mimeType = "application/octet-stream";
        const fields: Record<string, string> = {};

        for (const part of parts) {
          if (part.includes("filename=")) {
            const nameMatch = part.match(/filename="([^"]+)"/);
            if (nameMatch) originalName = nameMatch[1];
            const typeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
            if (typeMatch) mimeType = typeMatch[1].trim();
            const headerEnd = part.indexOf("\r\n\r\n");
            if (headerEnd !== -1) {
              const fileData = part.substring(headerEnd + 4);
              const cleanData = fileData.replace(/\r\n$/, "");
              fileBuffer = Buffer.from(cleanData, "binary");
            }
          } else if (part.includes("name=")) {
            const nameMatch = part.match(/name="([^"]+)"/);
            const headerEnd = part.indexOf("\r\n\r\n");
            if (nameMatch && headerEnd !== -1) {
              fields[nameMatch[1]] = part.substring(headerEnd + 4).trim().replace(/\r\n--$/, "");
            }
          }
        }

        if (!fileBuffer) {
          res.status(400).json({ error: "bad_request", message: "No file found in upload" });
          return;
        }

        const validationError = validateFile({ originalname: originalName, mimetype: mimeType, size: fileBuffer.length });
        if (validationError) {
          res.status(400).json({ error: "bad_request", message: validationError });
          return;
        }

        const fileName = generateFileName(originalName);
        const filePath = path.join(getUploadDir(), fileName);
        fs.writeFileSync(filePath, fileBuffer);

        const [doc] = await db.insert(documentsTable).values({
          tenantId,
          clientId: fields.clientId || null,
          guaranteeId: fields.guaranteeId || null,
          loanRequestId: fields.loanRequestId || null,
          documentType: fields.documentType || "General",
          documentName: fields.documentName || originalName,
          fileUrl: `/uploads/${fileName}`,
          mimeType,
          version: Number(fields.version) || 1,
          replacedById: null,
          uploadedById: req.user!.id,
        }).returning();

        res.status(201).json(doc);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "server_error" });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const clientId = req.query.clientId as string | undefined;
    const guaranteeId = req.query.guaranteeId as string | undefined;
    const loanRequestId = req.query.loanRequestId as string | undefined;

    let whereClause = eq(documentsTable.tenantId, tenantId);
    if (clientId) whereClause = and(whereClause, eq(documentsTable.clientId, clientId)) as typeof whereClause;
    if (guaranteeId) whereClause = and(whereClause, eq(documentsTable.guaranteeId, guaranteeId)) as typeof whereClause;
    if (loanRequestId) whereClause = and(whereClause, eq(documentsTable.loanRequestId, loanRequestId)) as typeof whereClause;

    const docs = await db.select().from(documentsTable).where(whereClause).orderBy(desc(documentsTable.createdAt));
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/download/:id", (req, res, next) => {
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [doc] = await db.select().from(documentsTable)
      .where(and(eq(documentsTable.id, req.params.id), eq(documentsTable.tenantId, tenantId))).limit(1);
    if (!doc) { res.status(404).json({ error: "not_found" }); return; }

    const filePath = path.join(process.cwd(), doc.fileUrl);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "not_found", message: "File not found on disk" });
      return;
    }

    res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${doc.documentName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [doc] = await db.select().from(documentsTable)
      .where(and(eq(documentsTable.id, req.params.id), eq(documentsTable.tenantId, tenantId))).limit(1);
    if (!doc) { res.status(404).json({ error: "not_found" }); return; }

    const filePath = path.join(process.cwd(), doc.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await db.delete(documentsTable).where(eq(documentsTable.id, doc.id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/export", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const { data, format, fileName } = req.body;
    if (!data || !format) {
      res.status(400).json({ error: "bad_request", message: "data and format required" });
      return;
    }

    let content: string;
    let mimeType: string;
    let ext: string;

    switch (format.toLowerCase()) {
      case "csv":
        content = generateCSV(data);
        mimeType = "text/csv";
        ext = ".csv";
        break;
      case "xml":
        content = generateXML(data);
        mimeType = "application/xml";
        ext = ".xml";
        break;
      default:
        res.status(400).json({ error: "bad_request", message: "Supported formats: csv, xml" });
        return;
    }

    const outputName = `${fileName || "export"}-${Date.now()}${ext}`;
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${outputName}"`);
    res.send(content);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
