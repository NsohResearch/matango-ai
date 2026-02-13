import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Type,
  Image,
  Square,
  Circle,
  Triangle,
  Move,
  RotateCw,
  Maximize2,
  Trash2,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Layers,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Plus,
  Palette,
} from "lucide-react";

interface CanvasElement {
  id: number;
  elementType: "text" | "image" | "shape" | "video";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content: string | null;
  style: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    opacity?: number;
    shapeType?: "rectangle" | "circle" | "triangle";
  } | null;
  locked?: boolean;
  visible?: boolean;
}

interface SceneCanvasProps {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage?: string;
  elements: CanvasElement[];
  selectedElementId: number | null;
  onElementSelect: (id: number | null) => void;
  onElementUpdate: (id: number, updates: Partial<CanvasElement>) => void;
  onElementAdd: (element: Omit<CanvasElement, "id">) => void;
  onElementDelete: (id: number) => void;
  onElementDuplicate: (id: number) => void;
}

export default function SceneCanvas({
  width,
  height,
  backgroundColor,
  backgroundImage,
  elements,
  selectedElementId,
  onElementSelect,
  onElementUpdate,
  onElementAdd,
  onElementDelete,
  onElementDuplicate,
}: SceneCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({ x: 0, y: 0, width: 0, height: 0, rotation: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(true);
  const [activeTool, setActiveTool] = useState<"select" | "text" | "image" | "shape">("select");

  const selectedElement = elements.find(el => el.id === selectedElementId);

  // Calculate scale factor for canvas display
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32; // padding
        const containerHeight = containerRef.current.clientHeight - 32;
        const scaleX = containerWidth / width;
        const scaleY = containerHeight / height;
        setScale(Math.min(scaleX, scaleY, 1));
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [width, height]);

  // Handle canvas click (deselect)
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onElementSelect(null);
    }
  };

  // Handle element mouse down (start drag)
  const handleElementMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation();
    if (element.locked) return;
    
    onElementSelect(element.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: element.x, y: element.y, width: element.width, height: element.height, rotation: element.rotation });
  };

  // Handle resize handle mouse down
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    if (!selectedElement || selectedElement.locked) return;
    
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ 
      x: selectedElement.x, 
      y: selectedElement.y, 
      width: selectedElement.width, 
      height: selectedElement.height,
      rotation: selectedElement.rotation,
    });
  };

  // Handle rotation handle mouse down
  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedElement || selectedElement.locked) return;
    
    setIsRotating(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ 
      x: selectedElement.x, 
      y: selectedElement.y, 
      width: selectedElement.width, 
      height: selectedElement.height,
      rotation: selectedElement.rotation,
    });
  };

  // Handle mouse move
  useEffect(() => {
    if (!isDragging && !isResizing && !isRotating) return;
    if (!selectedElement) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;

      if (isDragging) {
        onElementUpdate(selectedElement.id, {
          x: Math.max(0, Math.min(width - selectedElement.width, elementStart.x + dx)),
          y: Math.max(0, Math.min(height - selectedElement.height, elementStart.y + dy)),
        });
      } else if (isResizing && resizeHandle) {
        let newWidth = elementStart.width;
        let newHeight = elementStart.height;
        let newX = elementStart.x;
        let newY = elementStart.y;

        if (resizeHandle.includes('e')) newWidth = Math.max(20, elementStart.width + dx);
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(20, elementStart.width - dx);
          newX = elementStart.x + dx;
        }
        if (resizeHandle.includes('s')) newHeight = Math.max(20, elementStart.height + dy);
        if (resizeHandle.includes('n')) {
          newHeight = Math.max(20, elementStart.height - dy);
          newY = elementStart.y + dy;
        }

        onElementUpdate(selectedElement.id, { x: newX, y: newY, width: newWidth, height: newHeight });
      } else if (isRotating && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = rect.left + (elementStart.x + elementStart.width / 2) * scale;
        const centerY = rect.top + (elementStart.y + elementStart.height / 2) * scale;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
        onElementUpdate(selectedElement.id, { rotation: Math.round(angle) });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setIsRotating(false);
      setResizeHandle(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, isRotating, selectedElement, dragStart, elementStart, resizeHandle, scale, width, height, onElementUpdate]);

  // Add new element
  const addElement = (type: "text" | "image" | "shape") => {
    const baseElement = {
      elementType: type,
      x: width / 2 - 100,
      y: height / 2 - 50,
      width: 200,
      height: 100,
      rotation: 0,
      zIndex: elements.length,
      content: type === "text" ? "Double-click to edit" : null,
      style: type === "text" 
        ? { fontSize: 24, fontFamily: "Inter", color: "#ffffff", textAlign: "center" as const }
        : type === "shape"
        ? { backgroundColor: "#3b82f6", borderRadius: 0, shapeType: "rectangle" as const }
        : null,
    };
    onElementAdd(baseElement);
  };

  // Render element based on type
  const renderElement = (element: CanvasElement) => {
    const isSelected = element.id === selectedElementId;
    const style = element.style || {};

    const commonStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      transform: `rotate(${element.rotation}deg)`,
      zIndex: element.zIndex,
      opacity: element.visible === false ? 0.3 : (style.opacity ?? 1),
      cursor: element.locked ? 'not-allowed' : 'move',
    };

    let content: React.ReactNode = null;

    switch (element.elementType) {
      case 'text':
        content = (
          <div
            style={{
              ...commonStyle,
              fontSize: style.fontSize || 24,
              fontFamily: style.fontFamily || 'Inter',
              fontWeight: style.fontWeight || 'normal',
              fontStyle: style.fontStyle || 'normal',
              textDecoration: style.textDecoration || 'none',
              textAlign: (style.textAlign as React.CSSProperties['textAlign']) || 'center',
              color: style.color || '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: style.textAlign === 'left' ? 'flex-start' : style.textAlign === 'right' ? 'flex-end' : 'center',
              padding: '8px',
              overflow: 'hidden',
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element)}
            onDoubleClick={() => {
              if (element.locked) return;
              const newContent = prompt('Edit text:', element.content || '');
              if (newContent !== null) {
                onElementUpdate(element.id, { content: newContent });
              }
            }}
          >
            {element.content}
          </div>
        );
        break;

      case 'shape':
        const shapeStyle: React.CSSProperties = {
          ...commonStyle,
          backgroundColor: style.backgroundColor || '#3b82f6',
          borderRadius: style.shapeType === 'circle' ? '50%' : (style.borderRadius || 0),
          borderWidth: style.borderWidth || 0,
          borderColor: style.borderColor || 'transparent',
          borderStyle: 'solid',
        };

        if (style.shapeType === 'triangle') {
          content = (
            <div
              style={{
                ...commonStyle,
                width: 0,
                height: 0,
                borderLeft: `${element.width / 2}px solid transparent`,
                borderRight: `${element.width / 2}px solid transparent`,
                borderBottom: `${element.height}px solid ${style.backgroundColor || '#3b82f6'}`,
                backgroundColor: 'transparent',
              }}
              onMouseDown={(e) => handleElementMouseDown(e, element)}
            />
          );
        } else {
          content = (
            <div
              style={shapeStyle}
              onMouseDown={(e) => handleElementMouseDown(e, element)}
            />
          );
        }
        break;

      case 'image':
        content = (
          <div
            style={{
              ...commonStyle,
              backgroundImage: element.content ? `url(${element.content})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element)}
          >
            {!element.content && <Image className="w-8 h-8 text-gray-500" />}
          </div>
        );
        break;
    }

    return (
      <div key={element.id}>
        {content}
        {/* Selection handles */}
        {isSelected && !element.locked && (
          <>
            {/* Resize handles */}
            {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(handle => {
              const positions: Record<string, React.CSSProperties> = {
                nw: { left: element.x - 4, top: element.y - 4, cursor: 'nw-resize' },
                n: { left: element.x + element.width / 2 - 4, top: element.y - 4, cursor: 'n-resize' },
                ne: { left: element.x + element.width - 4, top: element.y - 4, cursor: 'ne-resize' },
                e: { left: element.x + element.width - 4, top: element.y + element.height / 2 - 4, cursor: 'e-resize' },
                se: { left: element.x + element.width - 4, top: element.y + element.height - 4, cursor: 'se-resize' },
                s: { left: element.x + element.width / 2 - 4, top: element.y + element.height - 4, cursor: 's-resize' },
                sw: { left: element.x - 4, top: element.y + element.height - 4, cursor: 'sw-resize' },
                w: { left: element.x - 4, top: element.y + element.height / 2 - 4, cursor: 'w-resize' },
              };
              return (
                <div
                  key={handle}
                  className="absolute w-2 h-2 bg-white border border-primary rounded-sm z-50"
                  style={{
                    ...positions[handle],
                    transform: `rotate(${element.rotation}deg)`,
                  }}
                  onMouseDown={(e) => handleResizeMouseDown(e, handle)}
                />
              );
            })}
            {/* Rotation handle */}
            <div
              className="absolute w-4 h-4 bg-primary rounded-full z-50 cursor-grab flex items-center justify-center"
              style={{
                left: element.x + element.width / 2 - 8,
                top: element.y - 24,
                transform: `rotate(${element.rotation}deg)`,
              }}
              onMouseDown={handleRotateMouseDown}
            >
              <RotateCw className="w-3 h-3 text-white" />
            </div>
            {/* Selection border */}
            <div
              className="absolute border-2 border-primary border-dashed pointer-events-none z-40"
              style={{
                left: element.x - 1,
                top: element.y - 1,
                width: element.width + 2,
                height: element.height + 2,
                transform: `rotate(${element.rotation}deg)`,
              }}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
          <div className="flex items-center gap-1 border-r pr-2">
            <Button
              variant={activeTool === "select" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setActiveTool("select")}
            >
              <Move className="w-4 h-4" />
            </Button>
            <Button
              variant={activeTool === "text" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => {
                setActiveTool("text");
                addElement("text");
              }}
            >
              <Type className="w-4 h-4" />
            </Button>
            <Button
              variant={activeTool === "image" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => {
                setActiveTool("image");
                addElement("image");
              }}
            >
              <Image className="w-4 h-4" />
            </Button>
            <Button
              variant={activeTool === "shape" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => {
                setActiveTool("shape");
                addElement("shape");
              }}
            >
              <Square className="w-4 h-4" />
            </Button>
          </div>

          {/* Element-specific controls */}
          {selectedElement && (
            <>
              {selectedElement.elementType === "text" && (
                <div className="flex items-center gap-1 border-r pr-2">
                  <Button
                    variant={selectedElement.style?.fontWeight === "bold" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => onElementUpdate(selectedElement.id, {
                      style: { ...selectedElement.style, fontWeight: selectedElement.style?.fontWeight === "bold" ? "normal" : "bold" }
                    })}
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={selectedElement.style?.fontStyle === "italic" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => onElementUpdate(selectedElement.id, {
                      style: { ...selectedElement.style, fontStyle: selectedElement.style?.fontStyle === "italic" ? "normal" : "italic" }
                    })}
                  >
                    <Italic className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant={selectedElement.style?.textAlign === "left" ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => onElementUpdate(selectedElement.id, {
                        style: { ...selectedElement.style, textAlign: "left" }
                      })}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={selectedElement.style?.textAlign === "center" ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => onElementUpdate(selectedElement.id, {
                        style: { ...selectedElement.style, textAlign: "center" }
                      })}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={selectedElement.style?.textAlign === "right" ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => onElementUpdate(selectedElement.id, {
                        style: { ...selectedElement.style, textAlign: "right" }
                      })}
                    >
                      <AlignRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: selectedElement.style?.color || "#ffffff" }}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48">
                      <Label>Text Color</Label>
                      <Input
                        type="color"
                        value={selectedElement.style?.color || "#ffffff"}
                        onChange={(e) => onElementUpdate(selectedElement.id, {
                          style: { ...selectedElement.style, color: e.target.value }
                        })}
                        className="w-full h-8 mt-2"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {selectedElement.elementType === "shape" && (
                <div className="flex items-center gap-1 border-r pr-2">
                  <Button
                    variant={selectedElement.style?.shapeType === "rectangle" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => onElementUpdate(selectedElement.id, {
                      style: { ...selectedElement.style, shapeType: "rectangle" }
                    })}
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={selectedElement.style?.shapeType === "circle" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => onElementUpdate(selectedElement.id, {
                      style: { ...selectedElement.style, shapeType: "circle" }
                    })}
                  >
                    <Circle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={selectedElement.style?.shapeType === "triangle" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => onElementUpdate(selectedElement.id, {
                      style: { ...selectedElement.style, shapeType: "triangle" }
                    })}
                  >
                    <Triangle className="w-4 h-4" />
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: selectedElement.style?.backgroundColor || "#3b82f6" }}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48">
                      <Label>Fill Color</Label>
                      <Input
                        type="color"
                        value={selectedElement.style?.backgroundColor || "#3b82f6"}
                        onChange={(e) => onElementUpdate(selectedElement.id, {
                          style: { ...selectedElement.style, backgroundColor: e.target.value }
                        })}
                        className="w-full h-8 mt-2"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Common element controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onElementUpdate(selectedElement.id, { zIndex: selectedElement.zIndex + 1 })}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onElementUpdate(selectedElement.id, { zIndex: Math.max(0, selectedElement.zIndex - 1) })}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onElementUpdate(selectedElement.id, { locked: !selectedElement.locked })}
                >
                  {selectedElement.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onElementUpdate(selectedElement.id, { visible: selectedElement.visible === false ? true : false })}
                >
                  {selectedElement.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onElementDuplicate(selectedElement.id)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onElementDelete(selectedElement.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 bg-black/20 flex items-center justify-center"
      >
        <div
          ref={canvasRef}
          className="relative shadow-2xl"
          style={{
            width: width * scale,
            height: height * scale,
            backgroundColor,
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
          onClick={handleCanvasClick}
        >
          {elements
            .sort((a, b) => a.zIndex - b.zIndex)
            .map(element => renderElement(element))}
        </div>
      </div>
    </div>
  );
}
