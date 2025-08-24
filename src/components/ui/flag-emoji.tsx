"use client";

import * as React from "react";

interface FlagEmojiProps {
  flag: string;
  className?: string;
}

export function FlagEmoji({ flag, className = "h-4 w-4" }: FlagEmojiProps) {
  return (
    <span 
      className={`inline-flex items-center justify-center text-sm ${className}`}
      style={{ fontSize: '16px', lineHeight: '1' }}
    >
      {flag}
    </span>
  );
}
