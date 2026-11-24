import { describe, it, expect } from "vitest";
import { ExportService } from "@/services/export";

describe("Manuscript Export Engine (Server-Side)", () => {
  const sampleEntries = [
    {
      title: "Chapter 1: The Lighthouse",
      text: "I went back to the lighthouse that night.\n\nThe road was almost gone, and the wind made it difficult to hear anything.",
    },
    {
      title: "Chapter 2: The Door",
      text: "A sound came from somewhere within the building. A door, perhaps.",
    },
  ];

  it("builds a valid Office Open XML DOCX binary buffer", () => {
    const docxBuffer = ExportService.buildDocx("The Last Light", sampleEntries);

    expect(docxBuffer).toBeDefined();
    expect(docxBuffer.length).toBeGreaterThan(500);

    // Verify standard PK ZIP header magic bytes (0x50, 0x4B, 0x03, 0x04)
    expect(docxBuffer[0]).toBe(0x50);
    expect(docxBuffer[1]).toBe(0x4b);
    expect(docxBuffer[2]).toBe(0x03);
    expect(docxBuffer[3]).toBe(0x04);

    // Convert to string and inspect embedded Open XML structures
    const docxString = docxBuffer.toString("utf8");
    expect(docxString).toContain("word/document.xml");
    expect(docxString).toContain("[Content_Types].xml");
    expect(docxString).toContain("word/styles.xml");
    expect(docxString).toContain("The Last Light");
    expect(docxString).toContain("Chapter 1: The Lighthouse");
  });

  it("escapes XML special characters in DOCX exports", () => {
    const dangerousEntries = [
      {
        title: "Salt & Light <Passage 1>",
        text: "He whispered, \"Look at the sea,\" & then stepped away.",
      },
    ];

    const buffer = ExportService.buildDocx("Title & Test", dangerousEntries);
    const content = buffer.toString("utf8");

    // Must be escaped into XML entities
    expect(content).toContain("Salt &amp; Light &lt;Passage 1&gt;");
    expect(content).toContain("&quot;Look at the sea,&quot; &amp; then");
  });

  it("exports multiple selected chapters and logs activity", async () => {
    const result = await ExportService.generateExport({
      projectId: "demo-project-1",
      userId: "00000000-0000-0000-0000-000000000001",
      scope: "multiple",
      sceneIds: ["demo-scene-1", "demo-scene-2"],
      format: "docx",
    });

    expect(result.exportId).toBeDefined();
    expect(result.format).toBe("docx");
    expect(result.scope).toBe("multiple");
    expect(result.wordCount).toBe(62); // 34 + 28
    expect(result.downloadUrl).toBeDefined();

    // Verify activity logged
    const { ActivityService } = await import("@/services/activity");
    const activities = await ActivityService.listActivities("demo-project-1");
    const latestExportAct = activities.find((a) => a.type === "export");
    expect(latestExportAct).toBeDefined();
    expect(latestExportAct?.title).toContain("Exported 2 chapters (DOCX)");
  });
});
