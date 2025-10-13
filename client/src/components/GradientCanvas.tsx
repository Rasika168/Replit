import { useRef, useEffect, useState, useCallback } from 'react';
import { Plus, Minus, Grid3x3, Download, Undo2, Redo2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
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
  const [points, setPoints] = useState<GradientPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null);
  const [draggingRadius, setDraggingRadius] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true);
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

    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, width, height);

    if (showGrid) {
      ctx.strokeStyle = '#404040';
      ctx.lineWidth = 0.5;
      
      for (let x = 0; x <= width; x += 20 * zoom) {
        ctx.beginPath();
        ctx.moveTo(x + pan.x % (20 * zoom), 0);
        ctx.lineTo(x + pan.x % (20 * zoom), height);
        ctx.stroke();
      }
      
      for (let y = 0; y <= height; y += 20 * zoom) {
        ctx.beginPath();
        ctx.moveTo(0, y + pan.y % (20 * zoom));
        ctx.lineTo(width, y + pan.y % (20 * zoom));
        ctx.stroke();
      }
    }

    points.forEach(point => {
      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, point.radius
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
        ctx.strokeStyle = point.id === selectedPoint ? '#3b82f6' : '#ffffff';
        ctx.lineWidth = point.id === selectedPoint ? 3 : 2;
        ctx.fillStyle = point.color;
        
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (point.id === selectedPoint) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(point.x + point.radius, point.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }, [points, selectedPoint, zoom, pan, showGrid, showOverlays]);

  useEffect(() => {
    renderGradient();
  }, [renderGradient]);

  useEffect(() => {
    if (onPointsChange) {
      onPointsChange(points);
    }
  }, [points, onPointsChange]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedPoint = points.find(p => {
      const distance = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      return distance <= 8;
    });

    if (clickedPoint) {
      setSelectedPoint(clickedPoint.id);
    } else {
      const clickedRadius = points.find(p => {
        if (p.id !== selectedPoint) return false;
        const distance = Math.sqrt((p.x + p.radius - x) ** 2 + (p.y - y) ** 2);
        return distance <= 6;
      });

      if (!clickedRadius) {
        addPoint(x, y);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
      const distance = Math.sqrt((p.x + p.radius - x) ** 2 + (p.y - y) ** 2);
      return distance <= 6;
    });

    if (clickedRadius) {
      setDraggingRadius(clickedRadius.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingPoint) {
      updatePoint(draggingPoint, { x, y });
    } else if (draggingRadius) {
      const point = points.find(p => p.id === draggingRadius);
      if (point) {
        const newRadius = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
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
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowGrid(!showGrid)}
                  data-testid="button-toggle-grid"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Grid</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowOverlays(!showOverlays)}
                  data-testid="button-toggle-overlays"
                >
                  {showOverlays ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Overlays</TooltipContent>
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

        <div className="relative flex-1 overflow-hidden">
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

      {selectedPointData && (
        <div className="w-80 border-l border-border bg-card p-4 overflow-y-auto">
          <ColorPicker
            point={selectedPointData}
            onUpdate={(updates) => {
              updatePoint(selectedPointData.id, updates);
              saveToHistory(points.map(p => p.id === selectedPointData.id ? { ...p, ...updates } : p));
            }}
            onClose={() => setSelectedPoint(null)}
          />
        </div>
      )}
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
