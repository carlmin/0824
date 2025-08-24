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
import { CheckIcon, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SingleSelectOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  flag?: string;
}

interface SingleSelectProps {
  options: SingleSelectOption[];
  selected: string | null;
  onChange: (selected: string | null) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
  clearable?: boolean;
  label?: string; // 카테고리 라벨 추가
}

export function SingleSelect({
  options,
  selected,
  onChange,
  placeholder = "Select an item...",
  className,
  icon: Icon,
  clearable = true,
  label,
}: SingleSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find(option => option.value === selected);

  const handleSelect = (value: string) => {
    onChange(value === selected ? null : value);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(null);
  };

  // 트리거 텍스트 포맷팅
  const formatTriggerText = () => {
    if (!label) {
      return placeholder;
    }
    
    if (!selectedOption || selectedOption.value === 'ALL') {
      return (
        <span className="flex items-center gap-2">
          <span className="text-gray-500">{label}</span>
          <span className="text-gray-400">· All</span>
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-2">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-900">· {selectedOption.label}</span>
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
            "min-w-[180px] justify-between h-11 px-4 text-sm rounded-xl border-gray-200 bg-white",
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
      <PopoverContent className="w-[280px] p-0 animate-in fade-in-0 zoom-in-95 duration-200" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
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
