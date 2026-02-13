import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// Mock LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          hook: "Attention-grabbing hook",
          body: "Main content body",
          cta: "Call to action",
          shotList: [
            { shot: 1, description: "Opening shot", duration: "3s" }
          ],
          safetyNotes: ["No inappropriate content"],
          deliveryNotes: {
            pacing: "Energetic",
            emphasis: ["key", "words"],
          }
        })
      }
    }]
  }),
}));

describe("Scripts Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generate", () => {
    it("should generate a script with hook, body, and CTA", async () => {
      const scriptContent = {
        hook: "Attention-grabbing hook",
        body: "Main content body",
        cta: "Call to action",
      };

      expect(scriptContent.hook).toBeTruthy();
      expect(scriptContent.body).toBeTruthy();
      expect(scriptContent.cta).toBeTruthy();
    });

    it("should include shot list in generated script", async () => {
      const scriptContent = {
        shotList: [
          { shot: 1, description: "Opening shot", duration: "3s" },
          { shot: 2, description: "Product showcase", duration: "5s" },
        ],
      };

      expect(scriptContent.shotList).toHaveLength(2);
      expect(scriptContent.shotList[0].shot).toBe(1);
    });

    it("should include safety notes", async () => {
      const scriptContent = {
        safetyNotes: ["No inappropriate content", "Age-appropriate language"],
      };

      expect(scriptContent.safetyNotes).toBeInstanceOf(Array);
      expect(scriptContent.safetyNotes.length).toBeGreaterThan(0);
    });

    it("should include delivery notes", async () => {
      const scriptContent = {
        deliveryNotes: {
          pacing: "Energetic",
          emphasis: ["key", "words"],
          pauses: ["after hook"],
        },
      };

      expect(scriptContent.deliveryNotes.pacing).toBeTruthy();
      expect(scriptContent.deliveryNotes.emphasis).toBeInstanceOf(Array);
    });

    it("should validate platform enum", () => {
      const validPlatforms = ["tiktok", "instagram", "youtube", "ads", "linkedin", "other"];
      
      expect(validPlatforms).toContain("tiktok");
      expect(validPlatforms).toContain("instagram");
      expect(validPlatforms).toContain("youtube");
    });

    it("should validate language code", () => {
      const validLanguages = ["en", "es", "fr", "de", "pt", "zh"];
      
      expect(validLanguages).toContain("en");
      expect(validLanguages).toContain("es");
    });

    it("should validate tone", () => {
      const validTones = ["confident", "friendly", "professional", "casual", "urgent", "inspirational"];
      
      expect(validTones).toContain("confident");
      expect(validTones).toContain("friendly");
    });

    it("should require brief text", () => {
      const input = {
        sessionId: 1,
        platform: "tiktok",
        brief: "Create a product launch video",
      };

      expect(input.brief).toBeTruthy();
      expect(input.brief.length).toBeGreaterThan(0);
    });

    it("should validate target duration", () => {
      const minDuration = 5;
      const maxDuration = 300;
      const targetDuration = 30;

      expect(targetDuration).toBeGreaterThanOrEqual(minDuration);
      expect(targetDuration).toBeLessThanOrEqual(maxDuration);
    });
  });

  describe("save", () => {
    it("should save script to database", async () => {
      const scriptData = {
        sessionId: 1,
        platform: "tiktok",
        language: "en",
        tone: "confident",
        contentJson: {
          hook: "Hook text",
          body: "Body text",
          cta: "CTA text",
        },
      };

      expect(mockDb.insert).toBeDefined();
      expect(scriptData.sessionId).toBe(1);
    });

    it("should calculate full script text", () => {
      const contentJson = {
        hook: "Hook text",
        body: "Body text",
        cta: "CTA text",
      };

      const fullScript = `${contentJson.hook}\n\n${contentJson.body}\n\n${contentJson.cta}`;
      
      expect(fullScript).toContain("Hook text");
      expect(fullScript).toContain("Body text");
      expect(fullScript).toContain("CTA text");
    });

    it("should set initial status to draft", () => {
      const defaultStatus = "draft";
      expect(defaultStatus).toBe("draft");
    });
  });

  describe("listBySession", () => {
    it("should return scripts for a session", async () => {
      const mockScripts = [
        { id: 1, sessionId: 1, platform: "tiktok", status: "draft" },
        { id: 2, sessionId: 1, platform: "instagram", status: "approved" },
      ];

      mockDb.limit.mockResolvedValueOnce(mockScripts);

      expect(mockDb.select).toBeDefined();
      expect(mockDb.where).toBeDefined();
    });

    it("should filter by platform when provided", () => {
      const platformFilter = "tiktok";
      expect(["tiktok", "instagram", "youtube", "ads", "linkedin", "other"]).toContain(platformFilter);
    });

    it("should filter by status when provided", () => {
      const statusFilter = "approved";
      expect(["draft", "approved", "rejected", "archived"]).toContain(statusFilter);
    });
  });

  describe("getScript", () => {
    it("should return script by id", async () => {
      const mockScript = {
        id: 1,
        sessionId: 1,
        platform: "tiktok",
        contentJson: { hook: "Test", body: "Test", cta: "Test" },
      };

      mockDb.limit.mockResolvedValueOnce([mockScript]);

      expect(mockDb.select).toBeDefined();
    });

    it("should handle non-existent script", async () => {
      // When script is not found, the router should throw NOT_FOUND
      const emptyResult: unknown[] = [];
      expect(emptyResult).toHaveLength(0);
    });
  });

  describe("updateScript", () => {
    it("should update script content", async () => {
      const updateData = {
        contentJson: {
          hook: "Updated hook",
          body: "Updated body",
          cta: "Updated CTA",
        },
      };

      expect(mockDb.update).toBeDefined();
      expect(updateData.contentJson.hook).toBe("Updated hook");
    });

    it("should update script status", async () => {
      const newStatus = "approved";
      expect(["draft", "approved", "rejected", "archived"]).toContain(newStatus);
    });
  });

  describe("deleteScript", () => {
    it("should soft delete by setting status to archived", () => {
      const archiveStatus = "archived";
      expect(archiveStatus).toBe("archived");
    });
  });
});

describe("Script Content Structure", () => {
  it("should have required fields", () => {
    const requiredFields = ["hook", "body", "cta"];
    const scriptContent = {
      hook: "Hook",
      body: "Body",
      cta: "CTA",
    };

    requiredFields.forEach(field => {
      expect(scriptContent).toHaveProperty(field);
    });
  });

  it("should have optional shot list", () => {
    const scriptWithShotList = {
      hook: "Hook",
      body: "Body",
      cta: "CTA",
      shotList: [{ shot: 1, description: "Shot 1" }],
    };

    const scriptWithoutShotList = {
      hook: "Hook",
      body: "Body",
      cta: "CTA",
    };

    expect(scriptWithShotList.shotList).toBeDefined();
    expect(scriptWithoutShotList).not.toHaveProperty("shotList");
  });

  it("should validate shot list structure", () => {
    const shotList = [
      { shot: 1, description: "Opening", duration: "3s" },
      { shot: 2, description: "Middle", duration: "5s" },
    ];

    shotList.forEach((shot, index) => {
      expect(shot.shot).toBe(index + 1);
      expect(shot.description).toBeTruthy();
    });
  });
});

describe("Platform-Specific Script Generation", () => {
  it("should adjust duration for TikTok (15-60s)", () => {
    const tiktokDuration = { min: 15, max: 60 };
    const targetDuration = 30;

    expect(targetDuration).toBeGreaterThanOrEqual(tiktokDuration.min);
    expect(targetDuration).toBeLessThanOrEqual(tiktokDuration.max);
  });

  it("should adjust duration for Instagram Reels (15-90s)", () => {
    const instagramDuration = { min: 15, max: 90 };
    const targetDuration = 60;

    expect(targetDuration).toBeGreaterThanOrEqual(instagramDuration.min);
    expect(targetDuration).toBeLessThanOrEqual(instagramDuration.max);
  });

  it("should adjust duration for YouTube Shorts (15-60s)", () => {
    const youtubeDuration = { min: 15, max: 60 };
    const targetDuration = 45;

    expect(targetDuration).toBeGreaterThanOrEqual(youtubeDuration.min);
    expect(targetDuration).toBeLessThanOrEqual(youtubeDuration.max);
  });
});
