import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Type, PenTool, Check } from 'lucide-react';
import { Button } from './Button';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onClear?: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear }) => {
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Initialize canvas
  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a'; // Slate 900
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [mode]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (hasSignature) {
      saveSignature();
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
    setTypedName('');
    if (onClear) onClear();
  };

  const saveSignature = () => {
    if (mode === 'draw' && canvasRef.current && hasSignature) {
      onSave(canvasRef.current.toDataURL());
    } else if (mode === 'type' && typedName.trim()) {
      // Create a canvas to render the typed text as an image
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'italic 48px "Dancing Script", cursive, "Apple Chancery", "Marker Felt", serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
        onSave(canvas.toDataURL());
      }
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              mode === 'draw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <PenTool size={14} />
            <span>Draw</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('type')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              mode === 'type' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Type size={14} />
            <span>Type</span>
          </button>
        </div>
        
        <button
          type="button"
          onClick={clear}
          className="flex items-center space-x-1 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
        >
          <Eraser size={14} />
          <span>Clear</span>
        </button>
      </div>

      <div className="relative border-2 border-slate-200 rounded-xl bg-white overflow-hidden group hover:border-jade-400 transition-colors">
        {mode === 'draw' ? (
          <canvas
            ref={canvasRef}
            width={600}
            height={150}
            className="w-full h-32 cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        ) : (
          <div className="h-32 flex flex-col items-center justify-center p-4">
            <input
              type="text"
              value={typedName}
              onChange={(e) => {
                setTypedName(e.target.value);
                setHasSignature(!!e.target.value);
              }}
              onBlur={saveSignature}
              placeholder="Type your full name"
              className="w-full text-center text-3xl italic bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-200"
              style={{ fontFamily: '"Dancing Script", cursive, serif' }}
            />
            <div className="w-48 h-px bg-slate-100 mt-2"></div>
          </div>
        )}
        
        {!hasSignature && mode === 'draw' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-300 text-sm italic">Sign here with your mouse or finger</p>
          </div>
        )}
      </div>
      
      {hasSignature && (
        <div className="flex items-center justify-center text-jade-600 animate-in fade-in slide-in-from-bottom-2">
          <Check size={14} className="mr-1" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Signature Captured</span>
        </div>
      )}
    </div>
  );
};
