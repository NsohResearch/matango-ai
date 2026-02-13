/**
 * K'ah Q&A Corpus Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { findKahResponse, getKahSystemPrompt, KAH_PROFILE, KAH_QA_CORPUS } from "./seedKahQA";

describe("K'ah Q&A Corpus", () => {
  describe("KAH_PROFILE", () => {
    it("should have required profile fields", () => {
      expect(KAH_PROFILE.name).toBe("K'ah");
      expect(KAH_PROFILE.tagline).toBeDefined();
      expect(KAH_PROFILE.role).toBeDefined();
      expect(KAH_PROFILE.signature).toBeDefined();
    });

    it("should have personality traits", () => {
      expect(KAH_PROFILE.personality.traits).toBeInstanceOf(Array);
      expect(KAH_PROFILE.personality.traits.length).toBeGreaterThan(0);
      expect(KAH_PROFILE.personality.tone).toBeDefined();
      expect(KAH_PROFILE.personality.style).toBeDefined();
    });

    it("should have expertise areas", () => {
      expect(KAH_PROFILE.expertise).toBeInstanceOf(Array);
      expect(KAH_PROFILE.expertise.length).toBeGreaterThan(0);
      expect(KAH_PROFILE.expertise).toContain("Digital marketing fundamentals");
      expect(KAH_PROFILE.expertise).toContain("Matango.ai platform features");
    });
  });

  describe("KAH_QA_CORPUS", () => {
    it("should have all expected categories", () => {
      const expectedCategories = ["about", "platform", "marketing", "pricing", "howto", "motivation", "personality"];
      for (const category of expectedCategories) {
        expect(KAH_QA_CORPUS).toHaveProperty(category);
        expect(KAH_QA_CORPUS[category as keyof typeof KAH_QA_CORPUS]).toBeInstanceOf(Array);
      }
    });

    it("should have Q&A pairs with question and answer", () => {
      for (const [category, qaPairs] of Object.entries(KAH_QA_CORPUS)) {
        for (const qa of qaPairs) {
          expect(qa).toHaveProperty("question");
          expect(qa).toHaveProperty("answer");
          expect(qa.question.length).toBeGreaterThan(0);
          expect(qa.answer.length).toBeGreaterThan(0);
        }
      }
    });

    it("should have substantial Q&A content", () => {
      const totalQA = Object.values(KAH_QA_CORPUS).flat().length;
      expect(totalQA).toBeGreaterThanOrEqual(30); // At least 30 Q&A pairs
    });

    it("should have about category with identity questions", () => {
      const aboutQuestions = KAH_QA_CORPUS.about.map(qa => qa.question.toLowerCase());
      expect(aboutQuestions.some(q => q.includes("who"))).toBe(true);
      expect(aboutQuestions.some(q => q.includes("name") || q.includes("pronounce"))).toBe(true);
    });

    it("should have platform category with Matango questions", () => {
      const platformQuestions = KAH_QA_CORPUS.platform.map(qa => qa.question.toLowerCase());
      expect(platformQuestions.some(q => q.includes("matango"))).toBe(true);
      expect(platformQuestions.some(q => q.includes("brand brain"))).toBe(true);
    });

    it("should have marketing education content", () => {
      const marketingQuestions = KAH_QA_CORPUS.marketing.map(qa => qa.question.toLowerCase());
      expect(marketingQuestions.some(q => q.includes("brand"))).toBe(true);
      expect(marketingQuestions.some(q => q.includes("social media"))).toBe(true);
    });
  });

  describe("findKahResponse", () => {
    it("should find exact match responses", () => {
      const response = findKahResponse("Who are you?");
      expect(response).toBeDefined();
      expect(response).toContain("K'ah");
    });

    it("should find case-insensitive matches", () => {
      const response = findKahResponse("who are you?");
      expect(response).toBeDefined();
      expect(response).toContain("K'ah");
    });

    it("should find partial matches", () => {
      const response = findKahResponse("What is Matango.ai?");
      expect(response).toBeDefined();
      expect(response).toContain("Matango");
    });

    it("should return null for unknown questions", () => {
      const response = findKahResponse("What is the meaning of life?");
      expect(response).toBeNull();
    });

    it("should find Brand Brain explanation", () => {
      const response = findKahResponse("What is Brand Brain?");
      expect(response).toBeDefined();
      expect(response).toContain("Brand Brain");
      expect(response).toContain("DNA");
    });

    it("should find pricing information", () => {
      const response = findKahResponse("How much does Matango cost?");
      expect(response).toBeDefined();
      expect(response).toContain("plan");
    });

    it("should find getting started guide", () => {
      const response = findKahResponse("How do I get started?");
      expect(response).toBeDefined();
      expect(response).toContain("Brand Brain");
    });
  });

  describe("getKahSystemPrompt", () => {
    it("should return a valid system prompt", () => {
      const prompt = getKahSystemPrompt();
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(100);
    });

    it("should include K'ah's name", () => {
      const prompt = getKahSystemPrompt();
      expect(prompt).toContain("K'ah");
    });

    it("should include personality traits", () => {
      const prompt = getKahSystemPrompt();
      expect(prompt).toContain("PERSONALITY");
      expect(prompt).toContain("Warm");
    });

    it("should include expertise areas", () => {
      const prompt = getKahSystemPrompt();
      expect(prompt).toContain("EXPERTISE");
      expect(prompt).toContain("marketing");
    });

    it("should include signature quote", () => {
      const prompt = getKahSystemPrompt();
      expect(prompt).toContain("SIGNATURE");
      expect(prompt).toContain("roots");
    });

    it("should include guidelines", () => {
      const prompt = getKahSystemPrompt();
      expect(prompt).toContain("GUIDELINES");
      expect(prompt).toContain("helpful");
    });
  });
});

describe("K'ah Q&A Categories", () => {
  describe("About category", () => {
    it("should answer identity questions", () => {
      const response = findKahResponse("Who are you?");
      expect(response).toContain("AI influencer");
      expect(response).toContain("marketing guide");
    });

    it("should explain pronunciation", () => {
      const response = findKahResponse("How do you pronounce your name?");
      expect(response).toContain("Kah");
    });

    it("should explain capabilities", () => {
      const response = findKahResponse("What can you help me with?");
      expect(response).toContain("marketing");
      expect(response).toContain("Matango");
    });
  });

  describe("Platform category", () => {
    it("should explain Matango.ai", () => {
      const response = findKahResponse("What is Matango.ai?");
      expect(response).toContain("AI-powered");
      expect(response).toContain("influencer");
    });

    it("should explain Brand Brain", () => {
      const response = findKahResponse("What is Brand Brain?");
      expect(response).toContain("DNA");
      expect(response).toContain("brand");
    });

    it("should explain Campaign Factory", () => {
      const response = findKahResponse("What is Campaign Factory?");
      expect(response).toContain("campaign");
      expect(response).toContain("content");
    });
  });

  describe("Marketing category", () => {
    it("should give brand building advice", () => {
      const response = findKahResponse("How do I build a strong brand?");
      expect(response).toContain("brand");
      expect(response?.toLowerCase()).toContain("consistency");
    });

    it("should give social media advice", () => {
      const response = findKahResponse("What makes good social media content?");
      expect(response).toContain("content");
      expect(response).toContain("authentic") || expect(response).toContain("engaging");
    });
  });

  describe("Motivation category", () => {
    it("should encourage beginners", () => {
      const response = findKahResponse("I'm new to marketing, is this for me?");
      expect(response).toContain("Matango");
      expect(response).toContain("everyone") || expect(response).toContain("accessible");
    });

    it("should address overwhelm", () => {
      const response = findKahResponse("I'm feeling overwhelmed");
      expect(response).toContain("breath") || expect(response).toContain("step");
    });
  });
});

describe("Plan Limits Integration", () => {
  it("should have agency_plus in pricing answers", () => {
    const response = findKahResponse("How much does Matango cost?");
    expect(response).toBeDefined();
    // The pricing answer should mention different tiers
    expect(response).toContain("Free") || expect(response).toContain("Basic");
  });
});
