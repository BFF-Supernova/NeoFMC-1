import { Request } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/xml",
  "application/xml",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
];

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xml", ".csv", ".xlsx", ".xls", ".jpg", ".jpeg", ".png"];

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  filename: string;
  path: string;
}

export function getUploadDir(): string {
  return UPLOAD_DIR;
}

export function generateFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const hash = crypto.randomBytes(16).toString("hex");
  return `${Date.now()}-${hash}${ext}`;
}

export function validateFile(file: { originalname: string; mimetype: string; size: number }): string | null {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `File type ${ext} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
  }
  if (file.size > 10 * 1024 * 1024) {
    return "File too large. Maximum size is 10MB";
  }
  return null;
}

export function deleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
    rows.push(row);
  }
  return rows;
}

export function generateCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const lines = [headers.join(",")];
  for (const row of data) {
    const values = headers.map(h => {
      const v = row[h];
      const s = v === null || v === undefined ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    });
    lines.push(values.join(","));
  }
  return lines.join("\n");
}

export function generateXML(data: Record<string, unknown>[], rootElement = "records", itemElement = "record"): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n`;
  for (const row of data) {
    xml += `  <${itemElement}>\n`;
    for (const [key, value] of Object.entries(row)) {
      const v = value === null || value === undefined ? "" : String(value);
      const escaped = v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      xml += `    <${key}>${escaped}</${key}>\n`;
    }
    xml += `  </${itemElement}>\n`;
  }
  xml += `</${rootElement}>`;
  return xml;
}

export function parseXML(content: string): Record<string, string>[] {
  const records: Record<string, string>[] = [];
  const itemRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
  const rootMatch = content.match(/<(\w+)>\s*([\s\S]*?)\s*<\/\1>/);
  if (!rootMatch) return records;
  const inner = rootMatch[2];
  const itemTagMatch = inner.match(/<(\w+)>/);
  if (!itemTagMatch) return records;
  const itemTag = itemTagMatch[1];
  const itemRegex2 = new RegExp(`<${itemTag}>([\\s\\S]*?)<\\/${itemTag}>`, "g");
  let match;
  while ((match = itemRegex2.exec(inner)) !== null) {
    const item: Record<string, string> = {};
    const fieldRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(match[1])) !== null) {
      item[fieldMatch[1]] = fieldMatch[2].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    }
    records.push(item);
  }
  return records;
}
