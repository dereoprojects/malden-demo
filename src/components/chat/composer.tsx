"use client";
import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Composer({
  onSend,
  isStreaming = false,
  onStop,
  isImageSupported = false,
}: {
  onSend: (text: string, imageDataUrl?: string) => Promise<void> | void;
  isStreaming?: boolean;
  onStop?: () => Promise<void> | void;
  isImageSupported?: boolean;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const canSend = (text.trim().length > 0 || !!image) && !isStreaming;

  const onFile = (f: File) =>
    new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        resolve();
      };
      reader.readAsDataURL(f);
    });

  const handleSend = async () => {
    if (!canSend) return;
    await onSend(text.trim(), image);
    setText("");
    setImage(undefined);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {isImageSupported && (
        <div className="flex items-center gap-2">
          <Input
            ref={fileRef}
            type="file"
            accept="image/*"
            disabled={isStreaming}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <Button
            variant="secondary"
            onClick={() => {
              setImage(undefined);
              if (fileRef.current) fileRef.current.value = "";
            }}
            disabled={!image || isStreaming}
          >
            Clear image
          </Button>
        </div>
      )}

      {image && (
        <div className="rounded border p-2">
          <img src={image} alt="preview" className="max-h-40 rounded" />
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          className="flex-1 min-h-[90px]"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isStreaming}
        />
        {!isStreaming ? (
          <Button onClick={handleSend} disabled={!canSend}>
            Send
          </Button>
        ) : (
          <Button variant="destructive" onClick={onStop}>
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}
