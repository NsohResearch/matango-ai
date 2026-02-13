import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Maximize2,
  ZoomIn,
  ZoomOut,
  GripVertical,
  Scissors,
  Copy,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Film,
  Music,
  Mic,
  Type,
  Image,
  Square,
} from "lucide-react";

interface TimelineScene {
  id: number;
  title: string;
  order: number;
  duration: number; // in milliseconds
  backgroundType: string;
  backgroundValue: string | null;
  script: string | null;
  elements: TimelineElement[];
}

interface TimelineElement {
  id: number;
  elementType: "text" | "image" | "shape" | "video" | "audio";
  startTime: number;
  endTime: number | null;
  content: string | null;
  style: Record<string, unknown> | null;
}

interface VideoTimelineProps {
  scenes: TimelineScene[];
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  selectedSceneIndex: number;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onSceneSelect: (index: number) => void;
  onSceneReorder: (fromIndex: number, toIndex: number) => void;
  onSceneAdd: () => void;
  onSceneDuplicate: (sceneId: number) => void;
  onSceneDelete: (sceneId: number) => void;
  onSceneSplit: (sceneId: number, splitTime: number) => void;
}

export default function VideoTimeline({
  scenes,
  currentTime,
  totalDuration,
  isPlaying,
  selectedSceneIndex,
  onTimeChange,
  onPlayPause,
  onSceneSelect,
  onSceneReorder,
  onSceneAdd,
  onSceneDuplicate,
  onSceneDelete,
  onSceneSplit,
}: VideoTimelineProps) {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedSceneIndex, setDraggedSceneIndex] = useState<number | null>(null);
  const [showTracks, setShowTracks] = useState({
    video: true,
    audio: true,
    voiceover: true,
    text: true,
  });
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  // Calculate pixel width per millisecond based on zoom
  const pixelsPerMs = 0.1 * zoom;
  const timelineWidth = totalDuration * pixelsPerMs;

  // Format time as MM:SS.ms
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  // Handle timeline click to seek
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const newTime = Math.max(0, Math.min(totalDuration, x / pixelsPerMs));
    onTimeChange(newTime);
  }, [totalDuration, pixelsPerMs, onTimeChange]);

  // Handle playhead drag
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const newTime = Math.max(0, Math.min(totalDuration, x / pixelsPerMs));
      onTimeChange(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, totalDuration, pixelsPerMs, onTimeChange]);

  // Handle scene drag and drop
  const handleSceneDragStart = (index: number) => {
    setDraggedSceneIndex(index);
  };

  const handleSceneDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedSceneIndex !== null && draggedSceneIndex !== targetIndex) {
      onSceneReorder(draggedSceneIndex, targetIndex);
      setDraggedSceneIndex(targetIndex);
    }
  };

  const handleSceneDragEnd = () => {
    setDraggedSceneIndex(null);
  };

  // Calculate scene start times
  const sceneStartTimes = scenes.reduce<number[]>((acc, scene, index) => {
    if (index === 0) return [0];
    return [...acc, acc[index - 1] + scenes[index - 1].duration];
  }, []);

  // Generate time markers
  const generateTimeMarkers = () => {
    const markers: { time: number; label: string; major: boolean }[] = [];
    const interval = zoom >= 2 ? 1000 : zoom >= 1 ? 2000 : 5000; // ms between markers
    
    for (let t = 0; t <= totalDuration; t += interval) {
      markers.push({
        time: t,
        label: formatTime(t),
        major: t % (interval * 5) === 0,
      });
    }
    return markers;
  };

  const timeMarkers = generateTimeMarkers();

  return (
    <div className="flex flex-col bg-card border-t">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onTimeChange(0)}>
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onPlayPause}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onTimeChange(totalDuration)}>
            <SkipForward className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-2" />
          <span className="text-sm font-mono">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onSceneAdd}>
            <Plus className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-2" />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            disabled={zoom <= 0.25}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            disabled={zoom >= 4}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Track Headers + Timeline */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Headers */}
        <div className="w-48 flex-shrink-0 border-r bg-muted/20">
          <div className="h-8 border-b flex items-center px-3 text-xs text-muted-foreground">
            Tracks
          </div>
          
          {/* Video Track Header */}
          <div 
            className="h-16 border-b flex items-center px-3 gap-2 cursor-pointer hover:bg-muted/50"
            onClick={() => setShowTracks(prev => ({ ...prev, video: !prev.video }))}
          >
            {showTracks.video ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Film className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Video</span>
          </div>

          {/* Audio Track Header */}
          <div 
            className="h-12 border-b flex items-center px-3 gap-2 cursor-pointer hover:bg-muted/50"
            onClick={() => setShowTracks(prev => ({ ...prev, audio: !prev.audio }))}
          >
            {showTracks.audio ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Music className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Music</span>
          </div>

          {/* Voiceover Track Header */}
          <div 
            className="h-12 border-b flex items-center px-3 gap-2 cursor-pointer hover:bg-muted/50"
            onClick={() => setShowTracks(prev => ({ ...prev, voiceover: !prev.voiceover }))}
          >
            {showTracks.voiceover ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Mic className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium">Voiceover</span>
          </div>

          {/* Text Track Header */}
          <div 
            className="h-12 border-b flex items-center px-3 gap-2 cursor-pointer hover:bg-muted/50"
            onClick={() => setShowTracks(prev => ({ ...prev, text: !prev.text }))}
          >
            {showTracks.text ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Type className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Text</span>
          </div>
        </div>

        {/* Timeline Area */}
        <div 
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative"
          onClick={handleTimelineClick}
        >
          {/* Time Ruler */}
          <div 
            className="h-8 border-b bg-muted/30 relative"
            style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
          >
            {timeMarkers.map((marker, i) => (
              <div
                key={i}
                className="absolute top-0 h-full flex flex-col items-center"
                style={{ left: `${marker.time * pixelsPerMs}px` }}
              >
                <div 
                  className={`w-px ${marker.major ? 'h-4 bg-foreground/50' : 'h-2 bg-foreground/20'}`}
                />
                {marker.major && (
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {marker.label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Video Track */}
          {showTracks.video && (
            <div 
              className="h-16 border-b relative"
              style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
            >
              {scenes.map((scene, index) => {
                const startX = sceneStartTimes[index] * pixelsPerMs;
                const width = scene.duration * pixelsPerMs;
                
                return (
                  <div
                    key={scene.id}
                    draggable
                    onDragStart={() => handleSceneDragStart(index)}
                    onDragOver={(e) => handleSceneDragOver(e, index)}
                    onDragEnd={handleSceneDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSceneSelect(index);
                    }}
                    className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all group ${
                      selectedSceneIndex === index 
                        ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' 
                        : 'hover:ring-1 hover:ring-primary/50'
                    } ${draggedSceneIndex === index ? 'opacity-50' : ''}`}
                    style={{
                      left: `${startX}px`,
                      width: `${width}px`,
                      backgroundColor: scene.backgroundValue || '#1a1a2e',
                    }}
                  >
                    {/* Scene Content */}
                    <div className="absolute inset-0 p-2 overflow-hidden">
                      <div className="flex items-center gap-1 mb-1">
                        <GripVertical className="w-3 h-3 text-white/50 cursor-grab" />
                        <span className="text-xs font-medium text-white truncate">
                          {scene.title}
                        </span>
                      </div>
                      {scene.script && (
                        <p className="text-[10px] text-white/70 line-clamp-2">
                          {scene.script}
                        </p>
                      )}
                    </div>

                    {/* Resize Handle */}
                    <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Scene Actions (on hover) */}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSceneDuplicate(scene.id);
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          const splitTime = scene.duration / 2;
                          onSceneSplit(scene.id, splitTime);
                        }}
                      >
                        <Scissors className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSceneDelete(scene.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Audio Track */}
          {showTracks.audio && (
            <div 
              className="h-12 border-b relative bg-green-500/5"
              style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
            >
              {/* Placeholder for audio waveform */}
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                <Music className="w-4 h-4 mr-2 text-green-500/50" />
                Drop audio file here
              </div>
            </div>
          )}

          {/* Voiceover Track */}
          {showTracks.voiceover && (
            <div 
              className="h-12 border-b relative bg-orange-500/5"
              style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
            >
              {/* Show voiceover segments based on scene scripts */}
              {scenes.map((scene, index) => {
                if (!scene.script) return null;
                const startX = sceneStartTimes[index] * pixelsPerMs;
                const width = scene.duration * pixelsPerMs;
                
                return (
                  <div
                    key={`vo-${scene.id}`}
                    className="absolute top-1 bottom-1 rounded bg-orange-500/30 border border-orange-500/50"
                    style={{ left: `${startX}px`, width: `${width}px` }}
                  >
                    <div className="p-1 text-[10px] text-orange-200 truncate">
                      {scene.script}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Text Track */}
          {showTracks.text && (
            <div 
              className="h-12 border-b relative bg-blue-500/5"
              style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
            >
              {/* Placeholder for text overlays */}
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                <Type className="w-4 h-4 mr-2 text-blue-500/50" />
                Add text overlays
              </div>
            </div>
          )}

          {/* Playhead */}
          <div
            ref={playheadRef}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 cursor-ew-resize z-10"
            style={{ left: `${currentTime * pixelsPerMs}px` }}
            onMouseDown={handlePlayheadMouseDown}
          >
            {/* Playhead handle */}
            <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
