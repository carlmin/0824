"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { CheckIcon, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  flag?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
  maxDisplay?: number;
  label?: string; // 카테고리 라벨 추가
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
  icon: Icon,
  maxDisplay = 2,
  label,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item));
  };

  const handleToggle = (item: string) => {
    if (item === 'ALL') {
      // ALL 선택 시 다른 모든 선택 해제하고 ALL만 선택
      onChange(['ALL']);
    } else {
      // 개별 항목 선택 시
      if (selected.includes(item)) {
        // 이미 선택된 항목을 해제
        const newSelected = selected.filter(i => i !== item);
        // 모든 개별 항목이 해제되면 ALL 선택
        onChange(newSelected.length === 0 ? ['ALL'] : newSelected);
      } else {
        // 새 항목 선택 시 ALL 해제하고 개별 항목들만 선택
        const newSelected = selected.filter(i => i !== 'ALL');
        onChange([...newSelected, item]);
      }
    }
  };

  const handleClearAll = () => {
    onChange(['ALL']);
  };

  const selectedItems = options.filter((option) => selected.includes(option.value));
  const nonAllSelected = selectedItems.filter(item => item.value !== 'ALL');
  
  // 트리거 텍스트 포맷팅
  const formatTriggerText = () => {
    if (!label) {
      return placeholder;
    }
    
    if (selected.includes('ALL') || nonAllSelected.length === 0) {
      return (
        <span className="flex items-center gap-2">
          <span className="text-gray-500">{label}</span>
          <span className="text-gray-400">· All</span>
        </span>
      );
    }
    
    if (nonAllSelected.length === 1) {
      return (
        <span className="flex items-center gap-2">
          <span className="text-gray-500">{label}</span>
          <span className="text-gray-900">· {nonAllSelected[0].label}</span>
        </span>
      );
    }
    
    if (nonAllSelected.length === 2) {
      return (
        <span className="flex items-center gap-2">
          <span className="text-gray-500">{label}</span>
          <span className="text-gray-900">· {nonAllSelected[0].label}, {nonAllSelected[1].label}</span>
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-2">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-900">· {nonAllSelected[0].label} 외 +{nonAllSelected.length - 1}</span>
      </span>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`${label || placeholder} filter`}
          className={cn(
            "min-w-[200px] justify-between h-11 px-4 text-sm rounded-xl border-gray-200 bg-white",
            className
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {Icon && <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />}
            <div className="flex-1 truncate text-left">
              {formatTriggerText()}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 animate-in fade-in-0 zoom-in-95 duration-200" align="start">
        <Command className="w-full">
          <CommandList>
            <CommandGroup>
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4 text-gray-500" />}
                  <span className="text-sm font-medium text-gray-700">
                    All {label?.toLowerCase() || 'items'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-gray-400 hover:text-red-500"
                  onClick={handleClearAll}
                >
                  Clear all
                </Button>
              </div>
            </CommandGroup>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleToggle(option.value)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {option.flag ? (
                        <span className="text-base">{option.flag}</span>
                      ) : (
                        option.icon && <option.icon className="h-4 w-4" />
                      )}
                      <span className="flex-1">{option.label}</span>
                    </div>
                    <CheckIcon
                      className={cn(
                        "ml-auto h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
