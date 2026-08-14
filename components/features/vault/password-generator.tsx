"use client";

import { useState } from "react";
import { RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import {
  generatePassword,
  DEFAULT_GENERATOR_OPTIONS,
  type GeneratorOptions,
} from "@/lib/generator";

const LENGTH_MIN = 8;
const LENGTH_MAX = 64;

const OPTION_LABELS: Array<{
  key: keyof Pick<GeneratorOptions, "upper" | "lower" | "digits" | "symbols">;
  label: string;
}> = [
  { key: "upper", label: "Uppercase (A–Z)" },
  { key: "lower", label: "Lowercase (a–z)" },
  { key: "digits", label: "Digits (0–9)" },
  { key: "symbols", label: "Symbols (!@#$…)" },
];

interface PasswordGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user wants to use the generated password in a field. */
  onUse?: (password: string) => void;
}

export function PasswordGenerator({ open, onOpenChange, onUse }: PasswordGeneratorProps) {
  const [opts, setOpts] = useState<GeneratorOptions>(DEFAULT_GENERATOR_OPTIONS);
  const [value, setValue] = useState<string>(() => generatePassword());
  const [copied, setCopied] = useState(false);

  function refresh() {
    setValue(generatePassword(opts));
    setCopied(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: "Copy failed",
        description: "Select and copy the password manually.",
        variant: "danger",
      });
    }
  }

  function toggle(key: "upper" | "lower" | "digits" | "symbols", on: boolean) {
    setOpts((o) => {
      const next = { ...o, [key]: on };
      setValue(generatePassword(next));
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate password</DialogTitle>
          <DialogDescription>
            Local only — nothing is saved until you store the item.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={value}
              className="flex-1 font-mono"
              aria-label="Generated password"
            />
            <Button variant="secondary" size="icon" onClick={refresh} aria-label="Regenerate">
              <RefreshCw />
            </Button>
            <Button variant="secondary" size="icon" onClick={copy} aria-label="Copy">
              {copied ? <Check className="text-success" /> : <Copy />}
            </Button>
          </div>

          <div>
            <Label htmlFor="gen-length">Length — {opts.length}</Label>
            <input
              id="gen-length"
              type="range"
              min={LENGTH_MIN}
              max={LENGTH_MAX}
              value={opts.length}
              onChange={(e) => setOpts((o) => ({ ...o, length: Number(e.target.value) }))}
              onMouseUp={refresh}
              onTouchEnd={refresh}
              className="bg-surface-2 h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {OPTION_LABELS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={`gen-${key}`} className="mb-0">
                  {label}
                </Label>
                <Switch
                  id={`gen-${key}`}
                  checked={opts[key]}
                  onCheckedChange={(on) => toggle(key, on)}
                />
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="gen-exclude">Exclude characters</Label>
            <Input
              id="gen-exclude"
              value={opts.exclude}
              onChange={(e) => setOpts((o) => ({ ...o, exclude: e.target.value }))}
              onBlur={refresh}
              placeholder="e.g. Il1O0"
            />
          </div>
        </div>

        <DialogFooter>
          {onUse ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onUse(value);
                  onOpenChange(false);
                }}
              >
                Use password
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={copy}>
              {copied ? "Copied" : "Copy password"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
