'use client';

import { useCallback, useRef, useState } from 'react';
import { LIMITS } from '../types';

interface DropZoneProps {
  onText: (text: string) => void;
  onRejected: (reason: string) => void;
}

const ACCEPTED_EXTENSION = '.txt';

export function DropZone({ onText, onRejected }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptText = useCallback(
    (text: string) => {
      if (text.length > LIMITS.MAX_SOURCE_CHARS) {
        onRejected(
          `That text is too long (${text.length.toLocaleString()} characters). The limit is ${LIMITS.MAX_SOURCE_CHARS.toLocaleString()}.`
        );
        return;
      }
      onText(text);
    },
    [onText, onRejected]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      const isPlainText = file.type === 'text/plain' || file.name.toLowerCase().endsWith(ACCEPTED_EXTENSION);
      if (!isPlainText) {
        onRejected('Only plain .txt files are supported. PDF and Word files are not extracted.');
        return;
      }
      const text = await file.text();
      acceptText(text);
    },
    [acceptText, onRejected]
  );

  return (
    <div
      className="unline-dropzone"
      data-active={isDragOver || undefined}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files.length > 0) {
          handleFiles(e.dataTransfer.files);
        } else {
          const text = e.dataTransfer.getData('text/plain');
          if (text) acceptText(text);
        }
      }}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text/plain');
        if (text) {
          e.preventDefault();
          acceptText(text);
        }
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <input
        ref={inputRef}
        className="unline-dropzone__paste-target"
        aria-label="Paste text here to clean it up, or use the file picker below"
        placeholder="Click here and paste (Ctrl/Cmd+V) — or drag a .txt file in"
        onPaste={(e) => {
          const text = e.clipboardData.getData('text/plain');
          if (text) {
            e.preventDefault();
            acceptText(text);
          }
        }}
      />
      <div className="unline-dropzone__copy">
        <strong>Drop text here or paste to Unline</strong>
        <span>We&apos;ll remove line breaks and clean it up for you.</span>
      </div>
      <label className="unline-dropzone__file">
        or choose a .txt file
        <input
          type="file"
          accept=".txt,text/plain"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
    </div>
  );
}
