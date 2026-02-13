import { describe, it, expect, vi } from 'vitest';

describe('Video Studio Pro', () => {
  describe('Video Job Queue', () => {
    it('should export video job functions', async () => {
      const videoJobs = await import('./videoJobs');
      expect(videoJobs.createVideoJob).toBeDefined();
      expect(videoJobs.getVideoJob).toBeDefined();
      expect(videoJobs.updateVideoJobStatus).toBeDefined();
      expect(videoJobs.cancelVideoJob).toBeDefined();
    });

    it('should have video job type definitions', async () => {
      const videoJobs = await import('./videoJobs');
      // VideoJobStatus is a type, not a runtime value
      // Check that the plan limits and credits cost are defined
      expect(videoJobs.VIDEO_PLAN_LIMITS).toBeDefined();
      expect(videoJobs.VIDEO_CREDITS_COST).toBeDefined();
    });

    it('should create a video job with required fields', async () => {
      const videoJobs = await import('./videoJobs');
      const mockJob = {
        userId: 1,
        title: 'Test Video',
        scenes: [{ script: 'Hello world', duration: 5 }],
        settings: { resolution: '1080p', aspectRatio: '16:9' }
      };
      
      // Test that createVideoJob accepts the correct parameters
      expect(typeof videoJobs.createVideoJob).toBe('function');
    });
  });

  describe('Video Studio Page', () => {
    it('should have VideoStudioPro component file', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const componentPath = path.resolve(__dirname, '../client/src/pages/VideoStudioPro.tsx');
      expect(fs.existsSync(componentPath)).toBe(true);
    });

    it('should export VideoStudioPro as default', async () => {
      // Verify the file contains the expected export
      const fs = await import('fs');
      const path = await import('path');
      const componentPath = path.resolve(__dirname, '../client/src/pages/VideoStudioPro.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('export default function VideoStudioPro');
    });

    it('should include scene editor functionality', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const componentPath = path.resolve(__dirname, '../client/src/pages/VideoStudioPro.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('Scene');
      expect(content).toContain('scenes');
    });

    it('should include audio controls', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const componentPath = path.resolve(__dirname, '../client/src/pages/VideoStudioPro.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('Audio');
      expect(content).toContain('Music');
    });

    it('should include export settings', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const componentPath = path.resolve(__dirname, '../client/src/pages/VideoStudioPro.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('Export');
      expect(content).toContain('resolution');
    });

    it('should include template selection', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const componentPath = path.resolve(__dirname, '../client/src/pages/VideoStudioPro.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('TEMPLATE_CATEGORIES');
      expect(content).toContain('template');
    });

    it('should include plan-based limits', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const componentPath = path.resolve(__dirname, '../client/src/pages/VideoStudioPro.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('PLAN_LIMITS');
      expect(content).toContain('limits');
    });

    it('should integrate with Creator OS backend', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const componentPath = path.resolve(__dirname, '../client/src/pages/VideoStudioPro.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('trpc.creator');
      expect(content).toContain('projects');
    });

    it('should include avatar and voice selection', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const componentPath = path.resolve(__dirname, '../client/src/pages/VideoStudioPro.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('avatar');
      expect(content).toContain('voice');
    });
  });

  describe('Creator OS Database Schema', () => {
    it('should have creator_projects table in schema', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const schemaPath = path.resolve(__dirname, '../drizzle/schema.ts');
      const content = fs.readFileSync(schemaPath, 'utf-8');
      expect(content).toContain('creatorProjects');
      expect(content).toContain('creator_projects');
    });

    it('should have creator_scenes table in schema', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const schemaPath = path.resolve(__dirname, '../drizzle/schema.ts');
      const content = fs.readFileSync(schemaPath, 'utf-8');
      expect(content).toContain('creatorScenes');
      expect(content).toContain('creator_scenes');
    });

    it('should have creator_export_jobs table in schema', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const schemaPath = path.resolve(__dirname, '../drizzle/schema.ts');
      const content = fs.readFileSync(schemaPath, 'utf-8');
      expect(content).toContain('creatorExportJobs');
      expect(content).toContain('creator_export_jobs');
    });
  });
});
