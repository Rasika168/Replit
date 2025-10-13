import { useRef, useEffect, useState, useCallback } from 'react';
import { Plus, Minus, Grid3x3, Download, Undo2, Redo2, Eye, EyeOff, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import ColorPicker from './ColorPicker';

export interface GradientPoint {
  id: string;
  x: number;
  y: number;
  color: string;
  opacity: number;
  radius: number;
  edgeType: 'soft' | 'hard';
}

interface GradientCanvasProps {
  onPointsChange?: (points: GradientPoint[]) => void;
}

export default function GradientCanvas({ onPointsChange }: GradientCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<GradientPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null);
  const [draggingRadius, setDraggingRadius] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [gridOpacity, setGridOpacity] = useState(0.5);
  const [showOverlays, setShowOverlays] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#333333');
  const [history, setHistory] = useState<GradientPoint[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = useCallback((newPoints: GradientPoint[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newPoints)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setPoints(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setPoints(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [history, historyIndex]);

  const addPoint = useCallback((x: number, y: number) => {
    const newPoint: GradientPoint = {
      id: `point-${Date.now()}`,
      x,
      y,
      color: '#3b82f6',
      opacity: 1,
      radius: 150,
      edgeType: 'soft',
    };
    const newPoints = [...points, newPoint];
    setPoints(newPoints);
    saveToHistory(newPoints);
    setSelectedPoint(newPoint.id);
  }, [points, saveToHistory]);

  const duplicatePoint = useCallback((pointId: string) => {
    const point = points.find(p => p.id === pointId);
    if (point) {
      const newPoint = {
        ...point,
        id: `point-${Date.now()}`,
        x: point.x + 20,
        y: point.y + 20,
      };
      const newPoints = [...points, newPoint];
      setPoints(newPoints);
      saveToHistory(newPoints);
      setSelectedPoint(newPoint.id);
    }
  }, [points, saveToHistory]);

  const deletePoint = useCallback((pointId: string) => {
    const newPoints = points.filter(p => p.id !== pointId);
    setPoints(newPoints);
    saveToHistory(newPoints);
    if (selectedPoint === pointId) {
      setSelectedPoint(null);
    }
  }, [points, selectedPoint, saveToHistory]);

  const updatePoint = useCallback((pointId: string, updates: Partial<GradientPoint>) => {
    const newPoints = points.map(p => p.id === pointId ? { ...p, ...updates } : p);
    setPoints(newPoints);
  }, [points]);

  const renderGradient = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (showGrid) {
      ctx.strokeStyle = `rgba(64, 64, 64, ${gridOpacity})`;
      ctx.lineWidth = 1;
      
      const gridSpacing = gridSize * zoom;
      const offsetX = pan.x % gridSpacing;
      const offsetY = pan.y % gridSpacing;
      
      for (let x = offsetX; x <= width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      for (let y = offsetY; y <= height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    points.forEach(point => {
      const gradient = ctx.createRadialGradient(
        point.x + pan.x, point.y + pan.y, 0,
        point.x + pan.x, point.y + pan.y, point.radius * zoom
      );
      
      const color = hexToRgb(point.color);
      if (color) {
        if (point.edgeType === 'soft') {
          gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${point.opacity})`);
          gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        } else {
          gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${point.opacity})`);
          gradient.addColorStop(0.8, `rgba(${color.r}, ${color.g}, ${color.b}, ${point.opacity})`);
          gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        }
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
      }
    });

    if (showOverlays) {
      points.forEach(point => {
        const screenX = point.x + pan.x;
        const screenY = point.y + pan.y;
        
        ctx.strokeStyle = point.id === selectedPoint ? '#3b82f6' : '#ffffff';
        ctx.lineWidth = point.id === selectedPoint ? 3 : 2;
        ctx.fillStyle = point.color;
        
        ctx.beginPath();
        ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (point.id === selectedPoint) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(screenX, screenY, point.radius * zoom, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(screenX + point.radius * zoom, screenY, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }, [points, selectedPoint, zoom, pan, showGrid, gridSize, gridOpacity, showOverlays, backgroundColor]);

  useEffect(() => {
    renderGradient();
  }, [renderGradient]);

  useEffect(() => {
    if (onPointsChange) {
      onPointsChange(points);
    }
  }, [points, onPointsChange]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.shiftKey) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - pan.x;
    const y = e.clientY - rect.top - pan.y;

    const clickedPoint = points.find(p => {
      const distance = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      return distance <= 8;
    });

    if (clickedPoint) {
      setSelectedPoint(clickedPoint.id);
    } else {
      const clickedRadius = points.find(p => {
        if (p.id !== selectedPoint) return false;
        const distance = Math.sqrt((p.x + p.radius * zoom - x) ** 2 + (p.y - y) ** 2);
        return distance <= 6;
      });

      if (!clickedRadius) {
        addPoint(x, y);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - pan.x;
    const y = e.clientY - rect.top - pan.y;

    const clickedPoint = points.find(p => {
      const distance = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      return distance <= 8;
    });

    if (clickedPoint) {
      setDraggingPoint(clickedPoint.id);
      return;
    }

    const clickedRadius = points.find(p => {
      if (p.id !== selectedPoint) return false;
      const distance = Math.sqrt((p.x + p.radius * zoom - x) ** 2 + (p.y - y) ** 2);
      return distance <= 6;
    });

    if (clickedRadius) {
      setDraggingRadius(clickedRadius.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - pan.x;
    const y = e.clientY - rect.top - pan.y;

    if (draggingPoint) {
      updatePoint(draggingPoint, { x, y });
    } else if (draggingRadius) {
      const point = points.find(p => p.id === draggingRadius);
      if (point) {
        const newRadius = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2) / zoom;
        updatePoint(draggingRadius, { radius: Math.max(20, newRadius) });
      }
    }
  };

  const handleMouseUp = () => {
    if (draggingPoint || draggingRadius) {
      saveToHistory(points);
    }
    setDraggingPoint(null);
    setDraggingRadius(null);
    setIsPanning(false);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'gradient.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const selectedPointData = points.find(p => p.id === selectedPoint);

  return (
    <div className="flex h-screen w-full bg-background">
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-card">
          <h1 className="text-sm font-semibold">Gradient Canvas</h1>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  data-testid="button-undo"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  data-testid="button-redo"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleExport}
                  data-testid="button-export"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export PNG</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div className="relative flex-1 overflow-hidden" ref={containerRef}>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <canvas
                ref={canvasRef}
                width={1200}
                height={800}
                className="w-full h-full cursor-crosshair"
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                data-testid="canvas-gradient"
              />
            </ContextMenuTrigger>
            <ContextMenuContent>
              {selectedPoint && (
                <>
                  <ContextMenuItem onClick={() => duplicatePoint(selectedPoint)} data-testid="menu-duplicate">
                    Duplicate Point
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => deletePoint(selectedPoint)} data-testid="menu-delete">
                    Delete Point
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>

          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-md px-3 py-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              data-testid="button-zoom-out"
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-xs text-white font-mono w-12 text-center" data-testid="text-zoom">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              data-testid="button-zoom-in"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="w-80 border-l border-border bg-card flex flex-col">
        <Tabs defaultValue="points" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-border bg-transparent h-12">
            <TabsTrigger value="points" data-testid="tab-points">Points</TabsTrigger>
            <TabsTrigger value="canvas" data-testid="tab-canvas">Canvas</TabsTrigger>
            <TabsTrigger value="export" data-testid="tab-export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="points" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3">Gradient Points</h3>
              {points.length === 0 ? (
                <p className="text-sm text-muted-foreground">Click on canvas to add points</p>
              ) : (
                <div className="space-y-2">
                  {points.map((point, index) => (
                    <div
                      key={point.id}
                      className={`flex items-center justify-between p-3 rounded-md border hover-elevate cursor-pointer ${
                        selectedPoint === point.id ? 'border-primary' : 'border-border'
                      }`}
                      onClick={() => setSelectedPoint(point.id)}
                      data-testid={`point-item-${point.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-md border border-border"
                          style={{ backgroundColor: point.color }}
                        />
                        <div>
                          <div className="text-sm font-medium">Point {index + 1}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {Math.round(point.x)}, {Math.round(point.y)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicatePoint(point.id);
                          }}
                          data-testid={`button-duplicate-${point.id}`}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePoint(point.id);
                          }}
                          data-testid={`button-delete-${point.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedPointData && (
              <div className="pt-4 border-t border-border">
                <ColorPicker
                  point={selectedPointData}
                  onUpdate={(updates) => {
                    updatePoint(selectedPointData.id, updates);
                    saveToHistory(points.map(p => p.id === selectedPointData.id ? { ...p, ...updates } : p));
                  }}
                  hideClose={true}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="canvas" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3">Canvas Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bg-color" className="text-xs uppercase tracking-wide">Background Color</Label>
                  <Input
                    id="bg-color"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-10 mt-1"
                    data-testid="input-bg-color"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-overlays" className="text-xs uppercase tracking-wide">Show Overlays</Label>
                  <Switch
                    id="show-overlays"
                    checked={showOverlays}
                    onCheckedChange={setShowOverlays}
                    data-testid="switch-overlays"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3">Grid Customization</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-grid" className="text-xs uppercase tracking-wide">Show Grid</Label>
                  <Switch
                    id="show-grid"
                    checked={showGrid}
                    onCheckedChange={setShowGrid}
                    data-testid="switch-grid"
                  />
                </div>

                {showGrid && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs uppercase tracking-wide">Grid Size</Label>
                        <span className="text-xs text-muted-foreground font-mono" data-testid="text-grid-size">
                          {gridSize}px
                        </span>
                      </div>
                      <Slider
                        value={[gridSize]}
                        onValueChange={([v]) => setGridSize(v)}
                        min={10}
                        max={50}
                        step={5}
                        data-testid="slider-grid-size"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs uppercase tracking-wide">Grid Opacity</Label>
                        <span className="text-xs text-muted-foreground font-mono" data-testid="text-grid-opacity">
                          {Math.round(gridOpacity * 100)}%
                        </span>
                      </div>
                      <Slider
                        value={[gridOpacity * 100]}
                        onValueChange={([v]) => setGridOpacity(v / 100)}
                        max={100}
                        step={5}
                        data-testid="slider-grid-opacity"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3">Pan & Zoom</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Hold Shift or Middle Mouse to pan. Use zoom controls or scroll wheel.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setPan({ x: 0, y: 0 });
                  setZoom(1);
                }}
                data-testid="button-reset-view"
              >
                Reset View
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="export" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3">Export Options</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide">Include Grid</Label>
                  <Switch checked={showGrid} onCheckedChange={setShowGrid} data-testid="switch-export-grid" />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide">Include Overlays</Label>
                  <Switch checked={showOverlays} onCheckedChange={setShowOverlays} data-testid="switch-export-overlays" />
                </div>

                <Button
                  className="w-full"
                  onClick={handleExport}
                  data-testid="button-export-png"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export as PNG
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3">Gradient Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Points:</span>
                  <span className="font-mono" data-testid="text-point-count">{points.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Canvas Size:</span>
                  <span className="font-mono">1200 × 800</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zoom Level:</span>
                  <span className="font-mono">{Math.round(zoom * 100)}%</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
