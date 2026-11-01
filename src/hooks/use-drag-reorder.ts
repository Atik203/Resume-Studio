'use client';

import { useState } from 'react';

export interface SectionDrag {
  draggedIndex: number | null;
  overIndex: number | null;
  onDragStart: (event: React.DragEvent, index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDrop: (event: React.DragEvent, targetIndex: number) => void;
  onDragEnd: () => void;
}

export function useSectionDrag(onReorder: (from: number, to: number) => void): SectionDrag {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const onDragStart = (event: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `section:${index}`);
  };

  const onDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) setOverIndex(index);
  };

  const onDrop = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) onReorder(draggedIndex, targetIndex);
    setDraggedIndex(null);
    setOverIndex(null);
  };

  const onDragEnd = () => {
    setDraggedIndex(null);
    setOverIndex(null);
  };

  return { draggedIndex, overIndex, onDragStart, onDragOver, onDrop, onDragEnd };
}

export interface EntryDrag {
  draggedSectionId: string | null;
  draggedIndex: number | null;
  overIndex: number | null;
  onDragStart: (event: React.DragEvent, sectionId: string, index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDrop: (event: React.DragEvent, sectionId: string, targetIndex: number) => void;
  onDragEnd: () => void;
}

export function useEntryDrag(onReorder: (sectionId: string, from: number, to: number) => void): EntryDrag {
  const [dragged, setDragged] = useState<{ sectionId: string; index: number } | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const onDragStart = (event: React.DragEvent, sectionId: string, index: number) => {
    setDragged({ sectionId, index });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `entry:${sectionId}:${index}`);
  };

  const onDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    if (dragged !== null && dragged.index !== index) setOverIndex(index);
  };

  const onDrop = (event: React.DragEvent, sectionId: string, targetIndex: number) => {
    event.preventDefault();
    if (dragged !== null && dragged.sectionId === sectionId && dragged.index !== targetIndex) {
      onReorder(sectionId, dragged.index, targetIndex);
    }
    setDragged(null);
    setOverIndex(null);
  };

  const onDragEnd = () => {
    setDragged(null);
    setOverIndex(null);
  };

  return {
    draggedSectionId: dragged?.sectionId ?? null,
    draggedIndex: dragged?.index ?? null,
    overIndex,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  };
}
