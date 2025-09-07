"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Check, Image as ImageIcon, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useFreeModels } from "@/lib/llm/use-free-models";

type Item = { id: string; label: string; supportsImages?: boolean };


export function ModelSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: Item) => void;
}) {
  const { models, loading, error } = useFreeModels();

  const baseList: Item[] =
    !error && !loading && Array.isArray(models) && models.length > 0
      ? models
      : [];

  const list = React.useMemo(
    () =>
      [...baseList].sort((a, b) => {
        const ai = a.supportsImages ? 1 : 0;
        const bi = b.supportsImages ? 1 : 0;
        if (ai !== bi) return bi - ai;
        return a.label.localeCompare(b.label);
      }),
    [baseList]
  );

  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(
    () => list.find((m) => m.id === value),
    [list, value]
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Model</span>

      {loading ? (
        <div className="w-[280px]">
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[280px] justify-between"
            >
              <span className="truncate">
                {selected ? selected.label : "Select a model"}
              </span>
              <span className="ml-2 flex items-center gap-2">
                {selected?.supportsImages && (
                  <ImageIcon className="h-4 w-4 opacity-70" />
                )}
                <ChevronsUpDown className="h-4 w-4 opacity-70" />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search models…" />
              <CommandList>
                <CommandEmpty>No models found.</CommandEmpty>
                <CommandGroup heading="Free models">
                  {list.map((m) => {
                    const isSelected = m.id === value;
                    return (
                      <CommandItem
                        key={m.id}
                        value={`${m.label} ${m.id}`}
                        onSelect={() => {
                          onChange(m);
                          setOpen(false);
                        }}
                        className="flex items-center"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{m.label}</span>
                        <span className="ml-auto pl-2 text-muted-foreground flex items-center">
                          {m.supportsImages && (
                            <ImageIcon className="h-4 w-4" />
                          )}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
