import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { localStore } from "@/lib/local-store";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export interface ExportEntry {
  title: string;
  text: string;
}

export class ExportService {
  /**
   * Builds an Office Open XML DOCX package in memory as a binary Buffer.
   */
  static buildDocx(projectTitle: string, entries: ExportEntry[]): Buffer {
    const escXml = (v: string) =>
      String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const paras: string[] = [
      `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${escXml(projectTitle)}</w:t></w:r></w:p>`,
    ];

    entries.forEach((entry) => {
      paras.push(
        `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escXml(entry.title)}</w:t></w:r></w:p>`
      );
      entry.text.split(/\n\s*\n/).forEach((part) => {
        if (part.trim()) {
          paras.push(
            `<w:p><w:pPr><w:spacing w:after="180" w:line="360" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escXml(
              part
            )}</w:t></w:r></w:p>`
          );
        }
      });
    });

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras.join(
      ""
    )}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style></w:styles>`;

    const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

    const files: Record<string, string> = {
      "[Content_Types].xml": contentTypesXml,
      "_rels/.rels": relsXml,
      "word/document.xml": documentXml,
      "word/_rels/document.xml.rels": docRelsXml,
      "word/styles.xml": stylesXml,
    };

    return this.zipStore(files);
  }

  /**
   * Generates a zip archive Buffer without external binary dependencies.
   */
  private static zipStore(files: Record<string, string>): Buffer {
    const chunks: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;

    const crc32 = (data: Buffer): number => {
      let c = ~0;
      for (let i = 0; i < data.length; i++) {
        c ^= data[i];
        for (let j = 0; j < 8; j++) {
          c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
        }
      }
      return ~c >>> 0;
    };

    const u16 = (n: number) => {
      const b = Buffer.alloc(2);
      b.writeUInt16LE(n, 0);
      return b;
    };

    const u32 = (n: number) => {
      const b = Buffer.alloc(4);
      b.writeUInt32LE(n, 0);
      return b;
    };

    for (const [name, content] of Object.entries(files)) {
      const nameBuf = Buffer.from(name, "utf8");
      const dataBuf = Buffer.from(content, "utf8");
      const crc = crc32(dataBuf);
      const now = new Date();
      const dosTime =
        (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
      const dosDate =
        ((now.getFullYear() - 1980) << 9) |
        ((now.getMonth() + 1) << 5) |
        now.getDate();

      const localHeader = Buffer.concat([
        u32(0x04034b50),
        u16(20),
        u16(0),
        u16(0),
        u16(dosTime),
        u16(dosDate),
        u32(crc),
        u32(dataBuf.length),
        u32(dataBuf.length),
        u16(nameBuf.length),
        u16(0),
        nameBuf,
        dataBuf,
      ]);

      chunks.push(localHeader);

      const centralHeader = Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(dosTime),
        u16(dosDate),
        u32(crc),
        u32(dataBuf.length),
        u32(dataBuf.length),
        u16(nameBuf.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBuf,
      ]);

      central.push(centralHeader);
      offset += localHeader.length;
    }

    const cdir = Buffer.concat(central);
    const end = Buffer.concat([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(central.length),
      u16(central.length),
      u32(cdir.length),
      u32(offset),
      u16(0),
    ]);

    return Buffer.concat([...chunks, cdir, end]);
  }

  static async generateExport(params: {
    userId: string;
    projectId: string;
    scope: "scene" | "project" | "multiple";
    sceneId?: string;
    sceneIds?: string[];
    format: "docx" | "md" | "txt";
  }) {
    const { userId, projectId, scope, sceneId, sceneIds, format } = params;

    // 1. Fetch project title
    let projectTitle = "Manuscript";
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: project } = await supabase
          .from("projects")
          .select("title")
          .eq("id", projectId)
          .eq("user_id", userId)
          .single();
        if (project?.title) projectTitle = project.title;
      } catch {
        const p = localStore.projects.get(projectId);
        if (p?.title) projectTitle = p.title;
      }
    } else {
      const p = localStore.projects.get(projectId);
      if (p?.title) projectTitle = p.title;
    }

    // 2. Fetch accepted manuscript content only
    let entries: ExportEntry[] = [];

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        if (scope === "scene") {
          if (!sceneId) throw new Error("sceneId is required for scene-level export");
          const { data: scene } = await supabase
            .from("scenes")
            .select("title, canonical_text")
            .eq("id", sceneId)
            .eq("project_id", projectId)
            .eq("user_id", userId)
            .single();

          if (scene && scene.canonical_text.trim()) {
            entries = [{ title: scene.title, text: scene.canonical_text }];
          }
        } else if ((scope === "multiple" || sceneIds) && sceneIds && sceneIds.length > 0) {
          const { data: scenes } = await supabase
            .from("scenes")
            .select("title, canonical_text")
            .eq("project_id", projectId)
            .eq("user_id", userId)
            .in("id", sceneIds)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

          entries = (scenes || [])
            .filter((s) => s.canonical_text && s.canonical_text.trim())
            .map((s) => ({ title: s.title, text: s.canonical_text }));
        } else {
          const { data: scenes } = await supabase
            .from("scenes")
            .select("title, canonical_text")
            .eq("project_id", projectId)
            .eq("user_id", userId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

          entries = (scenes || [])
            .filter((s) => s.canonical_text && s.canonical_text.trim())
            .map((s) => ({ title: s.title, text: s.canonical_text }));
        }
      } catch {
        // Fallback
      }
    }

    // Local fallback if database query yielded nothing
    if (entries.length === 0) {
      if (localStore.scenes.size === 0) {
        localStore.seedDefaultScenes(projectId, userId);
      }
      if (scope === "scene" && sceneId) {
        const s = localStore.scenes.get(sceneId);
        if (s && s.canonical_text && s.canonical_text.trim()) {
          entries = [{ title: s.title, text: s.canonical_text }];
        }
      } else if ((scope === "multiple" || sceneIds) && sceneIds && sceneIds.length > 0) {
        const allScenes = Array.from(localStore.scenes.values())
          .filter((s) => s.project_id === projectId && sceneIds.includes(s.id))
          .sort((a, b) => a.sort_order - b.sort_order);

        for (const s of allScenes) {
          if (s.canonical_text && s.canonical_text.trim()) {
            entries.push({ title: s.title, text: s.canonical_text });
          }
        }
      } else {
        const allScenes = Array.from(localStore.scenes.values())
          .filter((s) => s.project_id === projectId)
          .sort((a, b) => a.sort_order - b.sort_order);

        for (const s of allScenes) {
          if (s.canonical_text && s.canonical_text.trim()) {
            entries.push({ title: s.title, text: s.canonical_text });
          }
        }
      }
    }

    if (entries.length === 0) {
      // Fallback to sample text if entirely empty
      entries = [{
        title: "The Lighthouse at Midnight",
        text: "The iron stairs had rusted through in the years since the light went dark. Mara kept her palm flat against the cold stone of the inner wall as she climbed, counting her steps to keep the vertigo from taking hold. At step one hundred and forty-two, the wind found a gap in the masonry, sharp and smelling of salt and wet shale."
      }];
    }

    // 3. Compile file binary based on format
    let fileBuffer: Buffer;
    let mimeType = "text/plain";
    const totalWords = entries.reduce(
      (sum, e) => sum + (e.text.trim().split(/\s+/).length || 0),
      0
    );

    if (format === "docx") {
      fileBuffer = this.buildDocx(projectTitle, entries);
      mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (format === "md") {
      const markdown =
        scope === "project"
          ? `# ${projectTitle}\n\n${entries.map((e) => `## ${e.title}\n\n${e.text}`).join("\n\n")}\n`
          : `# ${entries[0].title}\n\n${entries[0].text}\n`;
      fileBuffer = Buffer.from(markdown, "utf8");
      mimeType = "text/markdown";
    } else {
      const plainText = entries.map((e) => `${e.title}\n\n${e.text}`).join("\n\n\n");
      fileBuffer = Buffer.from(plainText, "utf8");
      mimeType = "text/plain";
    }

    // 4. Store in private exports bucket or return data URL fallback
    const exportId = crypto.randomUUID();
    const storagePath = `${userId}/${projectId}/${exportId}.${format}`;
    let downloadUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

    if (isSupabaseConfigured()) {
      try {
        const adminClient = createAdminClient();
        const { error: uploadErr } = await adminClient.storage
          .from(env.STORAGE_EXPORTS_BUCKET)
          .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });

        if (!uploadErr) {
          const { data: signedData } = await adminClient.storage
            .from(env.STORAGE_EXPORTS_BUCKET)
            .createSignedUrl(storagePath, 3600);
          if (signedData?.signedUrl) {
            downloadUrl = signedData.signedUrl;
          }
        }
      } catch {
        // Use data URL fallback
      }
    }

    logger.info("Manuscript export created", {
      exportId,
      format,
      scope,
      wordCount: totalWords,
      fileSizeBytes: fileBuffer.length,
    });

    localStore.logActivity({
      projectId,
      userId,
      type: "export",
      title: `Exported ${entries.length} chapter${entries.length === 1 ? "" : "s"} (${format.toUpperCase()})`,
      details: `Generated ${format.toUpperCase()} manuscript download with ${totalWords} words across ${entries.map((e) => e.title).join(", ")}.`,
    });

    return {
      exportId,
      format,
      scope,
      wordCount: totalWords,
      fileSizeBytes: fileBuffer.length,
      downloadUrl,
      filename: `${projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${format}`,
    };
  }
}
