"use client";

import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";

interface NotesEditorProps {
  notes: string;
  onSave: (notes: string) => void;
}

export function NotesEditor({ notes, onSave }: NotesEditorProps) {
  const [value, setValue] = useState(notes);

  useEffect(() => {
    setValue(notes);
  }, [notes]);

  const handleSave = useCallback(() => {
    if (value !== notes) {
      onSave(value);
    }
  }, [value, notes, onSave]);

  return (
    <Textarea
      placeholder="Add notes..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      className="min-h-[60px] text-sm"
    />
  );
}
