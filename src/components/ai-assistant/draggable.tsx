import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Position } from '@/types/ai-assistant';

interface DraggableProps {
  children: ReactNode;
  position: Position;
  onPositionChange: (position: Position) => void;
  className?: string;
}

export function Draggable({
  children,
  position,
  onPositionChange,
  className,
}: DraggableProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const initialMousePosition = useRef<Position>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const dx = e.clientX - initialMousePosition.current.x;
      const dy = e.clientY - initialMousePosition.current.y;

      onPositionChange({
        x: position.x + dx,
        y: position.y + dy,
      });

      initialMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position, onPositionChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.target === dragRef.current ||
      dragRef.current?.contains(e.target as Node)
    ) {
      setIsDragging(true);
      initialMousePosition.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  };

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
      }}
    >
      <div
        ref={dragRef}
        className="flex cursor-move items-center justify-center rounded-t-md border-b bg-background p-1"
        onMouseDown={handleMouseDown}
      >
        <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
      </div>
      {children}
    </div>
  );
}
