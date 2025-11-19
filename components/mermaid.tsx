'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';

export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (ref.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: 16,
        themeVariables: {
          primaryColor: '#e0f2fe',
          primaryTextColor: '#0c4a6e',
          primaryBorderColor: '#0ea5e9',
          lineColor: '#64748b',
          secondaryColor: '#f1f5f9',
          tertiaryColor: '#fef3c7',
          background: '#ffffff',
          mainBkg: '#f8fafc',
          secondBkg: '#f1f5f9',
          labelBackground: '#e0f2fe',
          labelColor: '#0c4a6e',
          edgeLabelBackground: '#ffffff',
          clusterBkg: '#f8fafc',
          clusterBorder: '#cbd5e1',
          defaultLinkColor: '#64748b',
          titleColor: '#1e293b',
          textColor: '#334155',
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          padding: 20,
          curve: 'basis',
        },
        sequence: {
          useMaxWidth: true,
          diagramMarginX: 50,
          diagramMarginY: 20,
          actorMargin: 100,
          width: 200,
          height: 65,
          boxMargin: 10,
          messageMargin: 50,
        },
      });

      // Clear previous content
      ref.current.innerHTML = chart;
      mermaid.run({
        nodes: [ref.current],
      });
    }
  }, [chart]);

  // Reset zoom when opening modal
  useEffect(() => {
    if (isZoomed) {
      setScale(1.5); // Start at 150% for better visibility
      setPosition({ x: 0, y: 0 });
    }
  }, [isZoomed]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isZoomed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          setIsZoomed(false);
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed, scale]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.5, scale + delta), 4);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === modalRef.current || (e.target as HTMLElement).closest('.mermaid')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 4));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const resetZoom = () => {
    setScale(1.5); // Reset to 150%
    setPosition({ x: 0, y: 0 });
  };

  return (
    <>
      <div 
        className="mermaid-container my-8 flex justify-center cursor-pointer hover:shadow-md transition-all duration-200 bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200 group relative"
        onClick={() => setIsZoomed(true)}
        title="Cliquer pour agrandir"
      >
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <Maximize2 className="h-3 w-3" />
          Agrandir
        </div>
        <div ref={ref} className="mermaid min-w-full" style={{ fontSize: '16px' }} />
      </div>
      
      {isZoomed && (
        <div 
          className="mermaid-modal-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/20 backdrop-blur-md"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div 
            ref={modalRef}
            className="relative w-screen h-screen flex items-center justify-center overflow-hidden cursor-move"
          >
            {/* Contrôles de zoom */}
            <div className="absolute top-6 right-6 flex flex-col gap-2 z-[10000]">
              <button
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white hover:bg-blue-50 transition-colors shadow-lg border border-slate-200 text-slate-700 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomIn();
                }}
                title="Zoom avant"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white hover:bg-blue-50 transition-colors shadow-lg border border-slate-200 text-slate-700 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomOut();
                }}
                title="Zoom arrière"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white hover:bg-blue-50 transition-colors shadow-lg border border-slate-200 text-slate-700 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  resetZoom();
                }}
                title="Réinitialiser"
              >
                <Maximize2 className="h-5 w-5" />
              </button>
            </div>

            {/* Bouton fermer */}
            <button
              className="absolute top-6 left-6 w-12 h-12 flex items-center justify-center rounded-full bg-white hover:bg-red-50 transition-colors shadow-lg border border-slate-200 text-slate-700 hover:text-red-600 z-[10000]"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(false);
              }}
              title="Fermer (Échap)"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Indicateur de zoom */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-slate-200 text-sm font-medium text-slate-700 z-[10000]">
              {Math.round(scale * 100)}%
            </div>

            {/* Instructions */}
            <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-slate-200 text-xs text-slate-600 z-[10000] max-w-xs">
              <p className="font-medium mb-1">💡 Contrôles :</p>
              <p>• Molette souris : Zoom in/out</p>
              <p>• Clic + Glisser : Déplacer</p>
              <p>• <kbd className="bg-slate-100 px-1 rounded">+</kbd> / <kbd className="bg-slate-100 px-1 rounded">-</kbd> : Zoomer</p>
              <p>• <kbd className="bg-slate-100 px-1 rounded">0</kbd> : Réinitialiser</p>
              <p>• <kbd className="bg-slate-100 px-1 rounded">Échap</kbd> : Fermer</p>
            </div>

            {/* Diagramme zoomable */}
            <div 
              className="absolute bg-white rounded-2xl shadow-2xl p-16 border border-slate-200"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                cursor: isDragging ? 'grabbing' : 'grab',
                minWidth: '60vw',
                minHeight: '40vh',
              }}
            >
              <div 
                className="mermaid"
                style={{ fontSize: '20px' }}
                dangerouslySetInnerHTML={{ __html: ref.current?.innerHTML || '' }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
