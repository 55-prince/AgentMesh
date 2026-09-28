import PDFDocument from "pdfkit";
import { resolveDocumentImages } from "./imageResolver.js";

export const generatePdfBuffer = async (docData = {}) => {
  // Pre-fetch and guarantee valid images for the PDF document
  const rawImages = Array.isArray(docData.images) ? docData.images : (docData.image ? [docData.image] : []);
  const resolvedImages = await resolveDocumentImages({
    candidateUrls: rawImages,
    topic: docData.title || docData.summary || "Document Intelligence",
    isImageRequested: Boolean(rawImages.length > 0 || docData.hasImages),
    maxImages: 2,
  });

  const downloadedImages = resolvedImages.map((img) => ({
    buffer: img.buffer,
    url: img.url,
  }));

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
        bufferPages: true,
        info: {
          Title: docData.title || "AgentMesh Generated Document",
          Author: docData.author || "AgentMesh PDF Agent",
          Subject: docData.subtitle || "AI Generated Report",
          CreationDate: new Date(),
        },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on("error", (err) => reject(err));

      const primaryColor = "#0f172a"; // Slate 900
      const accentColor = "#d97706"; // Amber 600
      const secondaryColor = "#475569"; // Slate 600
      const lightBgColor = "#f8fafc"; // Slate 50
      const borderColor = "#e2e8f0"; // Slate 200

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 100;

      // Automatically draw top accent bar on every page
      doc.on("pageAdded", () => {
        doc.rect(0, 0, pageWidth, 6).fill(accentColor);
      });

      // --- First Page Top Accent Bar ---
      doc.rect(0, 0, pageWidth, 8).fill(accentColor);
      doc.y = 45;

      // --- Brand Header ---
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(accentColor)
        .text("AGENTMESH AI", 50, doc.y, { characterSpacing: 1.5, lineBreak: false });

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(secondaryColor)
        .text(
          `Generated: ${docData.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`,
          50,
          doc.y,
          {
            align: "right",
            width: contentWidth,
            lineBreak: false,
          }
        );

      doc.y += 18;
      doc.moveDown(0.4);

      // --- Document Title ---
      const title = docData.title || "Autonomous Intelligence Report";
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .fillColor(primaryColor)
        .text(title, 50, doc.y, { width: contentWidth, lineGap: 3 });

      // --- Subtitle ---
      if (docData.subtitle) {
        doc.moveDown(0.3);
        doc
          .fontSize(11)
          .font("Helvetica")
          .fillColor(secondaryColor)
          .text(docData.subtitle, { width: contentWidth, lineGap: 2 });
      }

      doc.moveDown(0.4);

      // --- Divider Line ---
      doc
        .strokeColor(borderColor)
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(pageWidth - 50, doc.y)
        .stroke();

      doc.moveDown(0.6);

      // Helper to ensure adequate space without creating orphan headers or blank pages
      const ensureSpace = (requiredHeight = 60) => {
        if (doc.y + requiredHeight > doc.page.height - 60 && doc.y > 60) {
          doc.addPage();
          doc.y = 45;
        }
      };

      // --- Main Featured Image (If available) ---
      if (downloadedImages.length > 0) {
        try {
          const mainImg = downloadedImages[0];
          const imgWidth = Math.min(260, contentWidth);
          const imgHeight = 160;

          ensureSpace(imgHeight + 35);

          const imgX = 50 + (contentWidth - imgWidth) / 2;
          const imgY = doc.y;

          doc.image(mainImg.buffer, imgX, imgY, {
            fit: [imgWidth, imgHeight],
            align: "center",
            valign: "center",
          });

          // Subtle frame outline
          doc
            .rect(imgX - 2, imgY - 2, imgWidth + 4, imgHeight + 4)
            .strokeColor(borderColor)
            .lineWidth(1)
            .stroke();

          doc.y = imgY + imgHeight + 10;

          // Caption
          doc
            .fontSize(8.5)
            .font("Helvetica-Oblique")
            .fillColor(secondaryColor)
            .text(`Figure 1: Visual representation — ${docData.title || "Featured Subject"}`, 50, doc.y, {
              align: "center",
              width: contentWidth,
            });

          doc.y += 14;
        } catch (imgRenderErr) {
          console.warn("[generatePdf] Error embedding main image:", imgRenderErr.message);
        }
      }

      // --- Executive Summary Box ---
      if (docData.summary) {
        const summaryPadding = 12;
        doc.fontSize(9.5).font("Helvetica");
        const summaryTextHeight = doc.heightOfString(docData.summary, {
          width: contentWidth - summaryPadding * 2 - 8,
          lineGap: 3,
        });
        const boxHeight = summaryTextHeight + 32;

        ensureSpace(boxHeight + 20);

        const summaryStartY = doc.y;

        // Background box
        doc
          .roundedRect(50, summaryStartY, contentWidth, boxHeight, 6)
          .fill(lightBgColor);

        // Left accent border
        doc
          .rect(50, summaryStartY, 4, boxHeight)
          .fill(accentColor);

        // Summary Header
        doc
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .fillColor(accentColor)
          .text("EXECUTIVE SUMMARY", 64, summaryStartY + 9, { characterSpacing: 0.8, lineBreak: false });

        // Summary Text
        doc
          .fontSize(9.5)
          .font("Helvetica")
          .fillColor("#1e293b")
          .text(docData.summary, 64, summaryStartY + 23, {
            width: contentWidth - summaryPadding * 2 - 8,
            lineGap: 3,
          });

        doc.y = summaryStartY + boxHeight + 14;
      }

      // --- Sections ---
      const sections = Array.isArray(docData.sections) ? docData.sections : [];

      sections.forEach((section, sIdx) => {
        ensureSpace(60);

        // Section Heading
        if (section.heading) {
          doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor(primaryColor)
            .text(`${sIdx + 1}. ${section.heading}`, 50, doc.y, {
              width: contentWidth,
              lineGap: 2,
            });

          doc.moveDown(0.3);
        }

        // Section Paragraph Content
        if (section.content) {
          doc
            .fontSize(9.5)
            .font("Helvetica")
            .fillColor("#334155")
            .text(section.content, {
              width: contentWidth,
              lineGap: 3,
              align: "justify",
            });

          doc.moveDown(0.3);
        }

        // Secondary Image (if 2nd image available and on section 2)
        if (sIdx === 1 && downloadedImages.length > 1) {
          try {
            const secImg = downloadedImages[1];
            const imgW = Math.min(220, contentWidth);
            const imgH = 135;
            ensureSpace(imgH + 30);
            const posX = 50 + (contentWidth - imgW) / 2;
            const posY = doc.y;

            doc.image(secImg.buffer, posX, posY, {
              fit: [imgW, imgH],
              align: "center",
              valign: "center",
            });
            doc.y = posY + imgH + 8;
          } catch (e) {
            // ignore
          }
        }

        // Bullet Points
        if (Array.isArray(section.bulletPoints) && section.bulletPoints.length > 0) {
          section.bulletPoints.forEach((point) => {
            ensureSpace(24);

            doc
              .fontSize(9.5)
              .font("Helvetica")
              .fillColor(accentColor)
              .text("• ", 60, doc.y, { continued: true });

            doc
              .fillColor("#334155")
              .text(point, {
                width: contentWidth - 20,
                lineGap: 2.5,
              });

            doc.moveDown(0.15);
          });
          doc.moveDown(0.3);
        }

        // Simple Table if present
        if (section.table && Array.isArray(section.table.headers) && Array.isArray(section.table.rows)) {
          const headers = section.table.headers;
          const rows = section.table.rows;
          const colWidth = contentWidth / headers.length;

          ensureSpace(50);

          const tableStartY = doc.y;

          // Header row background
          doc
            .roundedRect(50, tableStartY, contentWidth, 20, 3)
            .fill("#1e293b");

          // Header texts
          headers.forEach((h, hIdx) => {
            doc
              .fontSize(8.5)
              .font("Helvetica-Bold")
              .fillColor("#ffffff")
              .text(String(h), 55 + hIdx * colWidth, tableStartY + 5, {
                width: colWidth - 10,
                align: "left",
                lineBreak: false,
              });
          });

          let currentY = tableStartY + 22;

          // Rows
          rows.forEach((row, rIdx) => {
            if (currentY > doc.page.height - 55) {
              doc.addPage();
              doc.y = 45;
              currentY = 45;
            }

            const rowBg = rIdx % 2 === 0 ? "#f8fafc" : "#ffffff";
            doc.rect(50, currentY, contentWidth, 19).fill(rowBg);

            if (Array.isArray(row)) {
              row.forEach((cell, cIdx) => {
                doc
                  .fontSize(8.5)
                  .font("Helvetica")
                  .fillColor("#334155")
                  .text(String(cell), 55 + cIdx * colWidth, currentY + 4, {
                    width: colWidth - 10,
                    align: "left",
                    lineBreak: false,
                  });
              });
            }

            currentY += 19;
          });

          // Table border outline
          doc
            .rect(50, tableStartY, contentWidth, currentY - tableStartY)
            .strokeColor(borderColor)
            .lineWidth(1)
            .stroke();

          doc.y = currentY + 10;
        }

        doc.moveDown(0.4);
      });

      // --- Number all pages in Footer without triggering new pages ---
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);

        const oldBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0; // Prevent PDFKit auto-page creation in footer

        // Footer divider
        doc
          .strokeColor("#e2e8f0")
          .lineWidth(0.8)
          .moveTo(50, doc.page.height - 38)
          .lineTo(pageWidth - 50, doc.page.height - 38)
          .stroke();

        // Footer text
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#94a3b8")
          .text(
            "AgentMesh AI Multi-Agent Platform • Confidential & Automated",
            50,
            doc.page.height - 28,
            { lineBreak: false, align: "left" }
          );

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#94a3b8")
          .text(`Page ${i + 1} of ${totalPages}`, 50, doc.page.height - 28, {
            lineBreak: false,
            align: "right",
            width: contentWidth,
          });

        doc.page.margins.bottom = oldBottomMargin;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export default generatePdfBuffer;
