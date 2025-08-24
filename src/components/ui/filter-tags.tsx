"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FilterTag {
  id: string;
  label: string;
  value: string;
  category: string;
  icon?: React.ComponentType<{ className?: string }>;
  flag?: string;
  color?: "default" | "secondary" | "destructive" | "outline";
}

interface FilterTagsProps {
  tags: FilterTag[];
  onRemove: (tag: FilterTag) => void;
  onClearAll?: () => void;
  className?: string;
}

export function FilterTags({
  tags,
  onRemove,
  onClearAll,
  className,
}: FilterTagsProps) {
  if (tags.length === 0) {
    return null;
  }

  const getCategoryColor = (category: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (category) {
      case "Country":
        return "default";
      case "Source":
        return "secondary";
      case "Period":
        return "outline";
      case "Amount":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <AnimatePresence mode="wait">
      {tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className={cn("flex flex-wrap items-center gap-2", className)}
        >
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {tags.map((tag) => (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <Badge
                    variant={getCategoryColor(tag.category)}
                    className="gap-1 pr-1 text-xs hover:bg-opacity-80 transition-all duration-200 cursor-pointer"
                  >
                    {tag.flag ? (
                      <span className="text-xs">{tag.flag}</span>
                    ) : (
                      tag.icon && <tag.icon className="h-3 w-3" />
                    )}
                    <span className="max-w-24 truncate">
                      <span className="font-medium opacity-75">{tag.category}:</span> {tag.label}
                    </span>
                    <span
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-background/20 transition-colors cursor-pointer inline-flex items-center justify-center"
                      onClick={() => onRemove(tag)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Remove ${tag.label} filter`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRemove(tag);
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {onClearAll && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear All
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
