import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Text } from 'react-konva';
import { SketchData, SketchStroke, SketchLabel } from '../types';
import { 
  Pencil, 
  Eraser, 
  Undo2, 
  Trash2,
  AlertCircle,
  Type,
  MapPin
} from 'lucide-react';

interface EstimatorSketchPadProps {
  data: SketchData;
  onChange: (updates: Partial<SketchData>) => void;
}

const EstimatorSketchPad: React.FC<EstimatorSketchPadProps> = ({ data, onChange }) => {
  const [tool, setTool] = useState<'pen' | 'eraser' | 'text' | 'marker'>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [inputPos, setInputPos] = useState({ x: 0, y: 0 });
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: 400
      });
    }
  }, []);

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (tool === 'text' || tool === 'marker') {
      if (tool === 'text') {
        setInputPos(pos);
        setShowInput(true);
      } else {
        // Add marker
        const newLabel: SketchLabel = {
          id: Math.random().toString(36).substr(2, 9),
          text: '📍',
          x: pos.x,
          y: pos.y
        };
        onChange({ labels: [...(data.labels || []), newLabel] });
      }
      return;
    }

    setIsDrawing(true);
    const newStroke: SketchStroke = {
      points: [pos.x, pos.y],
      color: tool === 'eraser' ? '#ffffff' : '#D4AF37',
      width: tool === 'eraser' ? 20 : 3
    };
    onChange({ strokes: [...(data.strokes || []), newStroke] });
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || !data.strokes || tool === 'text' || tool === 'marker') return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastStroke = data.strokes[data.strokes.length - 1];
    
    if (lastStroke) {
      const lastX = lastStroke.points[lastStroke.points.length - 2];
      const lastY = lastStroke.points[lastStroke.points.length - 1];
      // Optimization: Only add point if it's far enough from the last point (5px)
      // This significantly reduces the amount of data stored in localStorage
      const dist = Math.sqrt(Math.pow(point.x - lastX, 2) + Math.pow(point.y - lastY, 2));
      
      if (dist > 5) {
        const updatedStrokes = [...data.strokes];
        updatedStrokes[updatedStrokes.length - 1] = {
          ...lastStroke,
          points: [...lastStroke.points, point.x, point.y]
        };
        onChange({ strokes: updatedStrokes });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleAddLabel = () => {
    if (!inputText.trim()) {
      setShowInput(false);
      return;
    }
    const newLabel: SketchLabel = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      x: inputPos.x,
      y: inputPos.y
    };
    onChange({ labels: [...(data.labels || []), newLabel] });
    setInputText('');
    setShowInput(false);
  };

  const handleUndo = () => {
    if (data.strokes.length > 0) {
      onChange({ strokes: data.strokes.slice(0, -1) });
    } else if (data.labels && data.labels.length > 0) {
      onChange({ labels: data.labels.slice(0, -1) });
    }
  };

  const handleClear = () => {
    onChange({ strokes: [], labels: [] });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
        <div className="flex gap-1">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition-all ${tool === 'pen' ? 'bg-[var(--brand-gold)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--text-primary)]/5'}`}
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-[var(--brand-gold)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--text-primary)]/5'}`}
          >
            <Eraser className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('text')}
            className={`p-2 rounded-lg transition-all ${tool === 'text' ? 'bg-[var(--brand-gold)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--text-primary)]/5'}`}
          >
            <Type className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('marker')}
            className={`p-2 rounded-lg transition-all ${tool === 'marker' ? 'bg-[var(--brand-gold)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--text-primary)]/5'}`}
          >
            <MapPin className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 border-l border-[var(--border-color)] pl-2">
          <button
            onClick={handleUndo}
            disabled={data.strokes.length === 0 && (!data.labels || data.labels.length === 0)}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--text-primary)]/5 rounded-lg disabled:opacity-20"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleClear}
            disabled={data.strokes.length === 0 && (!data.labels || data.labels.length === 0)}
            className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg disabled:opacity-20"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="bg-white rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-inner cursor-crosshair relative"
        style={{ touchAction: 'none' }}
      >
        {showInput && (
          <div 
            className="absolute z-10 bg-white p-2 rounded-lg shadow-xl border border-[var(--brand-gold)] flex gap-2"
            style={{ left: inputPos.x, top: inputPos.y }}
          >
            <input
              autoFocus
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
              className="px-2 py-1 border rounded text-sm focus:outline-none"
              placeholder="Label..."
            />
            <button 
              onClick={handleAddLabel}
              className="px-2 py-1 bg-[var(--brand-gold)] text-white rounded text-xs font-bold"
            >
              Add
            </button>
          </div>
        )}
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          ref={stageRef}
        >
          <Layer>
            {(data.strokes || []).map((stroke, i) => (
              <Line
                key={i}
                points={stroke.points}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  stroke.color === '#ffffff' ? 'destination-out' : 'source-over'
                }
              />
            ))}
            {(data.labels || []).map((label) => (
              <Text
                key={label.id}
                text={label.text}
                x={label.x}
                y={label.y}
                fontSize={16}
                fill="#10b981"
                fontStyle="bold"
              />
            ))}
          </Layer>
        </Stage>
      </div>

      <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest px-2">
        <AlertCircle className="w-3 h-3" />
        <span>Sketch area for project layout and dimensions</span>
      </div>
    </div>
  );
};

export default EstimatorSketchPad;
