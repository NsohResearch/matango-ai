import { motion } from "framer-motion";
import { Brain, Sparkles, Mic, Video, Palette, Target, Zap } from "lucide-react";

interface RoadmapStep {
  icon: React.ElementType;
  title: string;
  description: string;
}

const steps: RoadmapStep[] = [
  {
    icon: Target,
    title: "Define Brand Brain",
    description: "ICP, voice, claims & proof",
  },
  {
    icon: Brain,
    title: "Build Personality",
    description: "Traits, tone & messaging",
  },
  {
    icon: Palette,
    title: "Generate Visuals",
    description: "AI image generation",
  },
  {
    icon: Mic,
    title: "Craft the Voice",
    description: "AI voice synthesis",
  },
  {
    icon: Sparkles,
    title: "Refine & Iterate",
    description: "Perfect the character",
  },
  {
    icon: Video,
    title: "Create Content",
    description: "Videos, images & scripts",
  },
  {
    icon: Zap,
    title: "Deploy & Scale",
    description: "Launch across channels",
  },
];

export default function KahCreationRoadmap() {
  return (
    <div className="relative w-full py-8">
      {/* Desktop Layout - Serpentine Path */}
      <div className="hidden lg:block relative">
        {/* SVG Serpentine Path */}
        <svg
          className="absolute left-0 top-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 400"
          preserveAspectRatio="xMidYMid meet"
          fill="none"
          style={{ minHeight: "400px" }}
        >
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00D4AA" />
              <stop offset="50%" stopColor="#00B4D8" />
              <stop offset="100%" stopColor="#00D4AA" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Main serpentine path - S-curve shape */}
          <motion.path
            d="M 80 80 
               H 450 
               C 520 80, 560 80, 580 120 
               C 600 160, 600 200, 580 240 
               C 560 280, 520 280, 450 280 
               H 200
               C 130 280, 90 280, 70 320
               C 50 360, 90 380, 150 380
               H 920"
            stroke="url(#pathGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            filter="url(#glow)"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
          />
        </svg>

        {/* Row 1: Steps 1-3 */}
        <div className="relative flex justify-between items-start px-12 pb-12" style={{ minHeight: "120px" }}>
          {steps.slice(0, 3).map((step, index) => {
            const StepIcon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="flex flex-col items-center text-center z-10"
                style={{ width: "180px" }}
              >
                <div className="relative mb-3">
                  <div className="absolute -inset-2 bg-primary/30 rounded-full blur-md" />
                  <div className="relative w-14 h-14 rounded-full border-2 border-primary bg-background flex items-center justify-center shadow-lg shadow-primary/20">
                    <StepIcon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h4 className="text-sm font-bold text-foreground mb-1">{step.title}</h4>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Row 2: Step 4 (right side turn) */}
        <div className="relative flex justify-end px-12 pb-12" style={{ minHeight: "120px" }}>
          {(() => {
            const StepIcon = steps[3].icon;
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="flex flex-col items-center text-center z-10 mr-8"
                style={{ width: "180px" }}
              >
                <div className="relative mb-3">
                  <div className="absolute -inset-2 bg-primary/30 rounded-full blur-md" />
                  <div className="relative w-14 h-14 rounded-full border-2 border-primary bg-background flex items-center justify-center shadow-lg shadow-primary/20">
                    <StepIcon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h4 className="text-sm font-bold text-foreground mb-1">{steps[3].title}</h4>
                <p className="text-xs text-muted-foreground">{steps[3].description}</p>
              </motion.div>
            );
          })()}
        </div>

        {/* Row 3: Steps 5-7 (left to right on bottom) */}
        <div className="relative flex justify-between items-start px-12" style={{ minHeight: "120px" }}>
          {steps.slice(4).map((step, index) => {
            const StepIcon = step.icon;
            return (
              <motion.div
                key={index + 4}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (index + 4) * 0.2 }}
                className="flex flex-col items-center text-center z-10"
                style={{ width: "180px" }}
              >
                <div className="relative mb-3">
                  <div className="absolute -inset-2 bg-primary/30 rounded-full blur-md" />
                  <div className="relative w-14 h-14 rounded-full border-2 border-primary bg-background flex items-center justify-center shadow-lg shadow-primary/20">
                    <StepIcon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h4 className="text-sm font-bold text-foreground mb-1">{step.title}</h4>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Tablet Layout - 2 rows */}
      <div className="hidden md:block lg:hidden relative px-4">
        <div className="grid grid-cols-4 gap-6">
          {steps.slice(0, 4).map((step, index) => {
            const StepIcon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-3">
                  <div className="absolute -inset-2 bg-primary/30 rounded-full blur-md" />
                  <div className="relative w-12 h-12 rounded-full border-2 border-primary bg-background flex items-center justify-center">
                    <StepIcon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <h4 className="text-xs font-bold text-foreground mb-1">{step.title}</h4>
                <p className="text-[10px] text-muted-foreground">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-6 mt-8 max-w-3xl mx-auto">
          {steps.slice(4).map((step, index) => {
            const StepIcon = step.icon;
            return (
              <motion.div
                key={index + 4}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (index + 4) * 0.1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-3">
                  <div className="absolute -inset-2 bg-primary/30 rounded-full blur-md" />
                  <div className="relative w-12 h-12 rounded-full border-2 border-primary bg-background flex items-center justify-center">
                    <StepIcon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <h4 className="text-xs font-bold text-foreground mb-1">{step.title}</h4>
                <p className="text-[10px] text-muted-foreground">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile Layout - Vertical Timeline */}
      <div className="md:hidden relative px-4">
        {/* Vertical line */}
        <div className="absolute left-10 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-primary rounded-full" />
        
        <div className="space-y-6">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 pl-2"
              >
                <div className="relative flex-shrink-0">
                  <div className="absolute -inset-1 bg-primary/20 rounded-full blur-sm" />
                  <div className="relative w-10 h-10 rounded-full border-2 border-primary bg-background flex items-center justify-center z-10">
                    <StepIcon className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="pt-1">
                  <h4 className="text-sm font-bold text-foreground mb-0.5">{step.title}</h4>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
