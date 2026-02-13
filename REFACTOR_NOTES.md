# Canonical Workflow Rebuild - Key Requirements

## Canonical Sequence (must match UI + routing)
- Step 0: Select Plan (done)
- Step 1: Brand Brain `/brand-brain` (done, do not disturb)
- Step 2: Influencer Studio `/influencer-studio` (MUST REBUILD - upload, train, create)
- Step 3: Video Scripts `/video-scripts` (done, do not disturb)
- Step 4: Video Studio `/video-studio` (MUST REBUILD - end-to-end video gen)
- Step 5: AAO Studio `/aao-studio` (done)
- Step 6: Campaign Factory `/campaign-factory` (done)

## Navigation Order (Build & Create menu)
1. Brand Brain (Step 1)
2. Influencer Studio (Step 2) - NEW
3. Video Scripts (Step 3)
4. Video Studio (Step 4) - RENAMED from Video Lab
5. AAO Studio (Step 5)
6. Campaign Factory (Step 6)

## Key Changes Needed
1. Navbar: Reorder systemFeatures to canonical order, add Influencer Studio, rename Video Lab → Video Studio
2. InfluencerStudio page: Wire to V2 router (upload→S3, train, create influencer, gallery)
3. VideoStudio page: Wire to V2 router (select influencer, script, batch gen, music, lip-sync, library)
4. GrowthLoopCard: Update step links to match canonical order
5. App.tsx: Ensure routes are correct

## Existing V2 Routers Already Created
- server/routers/influencerStudioV2.ts
- server/routers/videoStudioV2.ts
- server/services/modelProviders.ts
- DB tables: media_objects, influencer_images, video_gen_jobs_v2

## Do NOT Touch
- Brand Brain, Video Scripts, AAO Studio, Campaign Factory internals
- Stripe integration
- Existing plan limits
