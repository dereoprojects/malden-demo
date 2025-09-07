'use client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Session } from '@/lib/db/dexie';

export function SessionList({
  sessions, activeId, onNew, onPick,
}: {
  sessions: Session[];
  activeId?: string | null;
  onNew?: () => void;
  onPick: (s: Session | 'new') => void;
}) {
  const isNewSessionActive = activeId === 'new';
  
  return (
    <Card className="h-full min-w-[280px]">
      <CardHeader>
        <CardTitle className="text-base">Sessions</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ScrollArea className="max-h-[75vh] pr-2">
          <div className="space-y-0">
            <Button
              variant="outline"
              className={`w-full justify-start h-auto p-3 mb-3 min-w-0 ${isNewSessionActive ? 'bg-accent text-accent-foreground' : ''}`}
              onClick={() => onPick('new')}
            >
              <div className="flex flex-col items-start w-full min-w-0">
                <span className="text-sm font-medium truncate w-full">New Session</span>
                <span className="text-xs opacity-70 truncate w-full">Start a new conversation</span>
              </div>
            </Button>
            {sessions.map((s, index) => {
              const active = activeId === s.id;
              return (
                <div key={s.id}>
                  {index > 0 && <div className="border-t border-border/50 my-2" />}
                  <Button
                    variant="ghost"
                    className={`w-full justify-start h-auto p-3 min-w-0 ${active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50'}`}
                    onClick={() => onPick(s)}
                  >
                    <div className="flex flex-col items-start w-full min-w-0">
                      <span className="text-sm font-medium truncate w-full">{s.title}</span>
                      <span className="text-xs opacity-70 truncate w-full">{new Date(s.updatedAt).toLocaleString()}</span>
                    </div>
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
