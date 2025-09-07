'use client';
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModelSelect } from './model-select';
import { SessionList } from './session-list';
import { MessageList } from './message-list';
import { Composer } from './composer';
import { useSessions, createSession, touchSession } from '@/lib/chat/use-sessions';
import { useMessages } from '@/lib/chat/use-messages';
import { useStreamTurn } from '@/lib/chat/use-stream-turn';
import { useFreeModels } from '@/lib/llm/use-free-models';
import { toast } from 'sonner';

export function ChatLayout() {
  const [model, setModel] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>('new');
  const { sessions, active, setActive } = useSessions(activeId === 'new' ? null : activeId);
  const messages = useMessages(active?.id);
  const { start, stop } = useStreamTurn();
  const { models: availableModels } = useFreeModels();
  const [isStreaming, setStreaming] = useState(false);
  const [isImageSupported, setIsImageSupported] = useState(false);

  const effectiveModel = model || active?.model || null;
  const isNewSessionActive = activeId === 'new';
  const handleSessionSelect = (session: any) => {
    if (session === 'new') {
      setActiveId('new');
      setActive(null);
    } else {
      setActiveId(session.id);
      setActive(session);
      if (session?.model) {
        setModel(session.model);
        const modelInfo = availableModels.find(m => m.id === session.model);
        setIsImageSupported(modelInfo?.supportsImages ?? false);
      }
    }
  };
  

  const handleSend = async (text: string, imageDataUrl?: string) => {
    if (isStreaming) return;
    if (!effectiveModel){
        toast.error("Please select a model");
        return;
    }

    let currentSession = active;
    
    if (isNewSessionActive) {
      if (!model) {
        toast.error("Please select a model");
        return;
      }
      currentSession = await createSession(model);
      setActiveId(currentSession.id);
      setActive(currentSession);
    }

    if (!currentSession) return;

    setStreaming(true);
    await start({ sessionId: currentSession.id, model: effectiveModel, userText: text, imageDataUrl });
    await touchSession(currentSession.id, effectiveModel);
    setStreaming(false);
  };

  const handleStop = async () => {
    if (!isStreaming) return;
    setStreaming(false);
    await stop();
  };

  return (
    <div className="flex gap-4 h-full min-w-0 overflow-x-auto">
      <div className="h-full min-w-[280px] flex-shrink-0">
        <SessionList
          sessions={sessions}
          activeId={activeId}
          onPick={handleSessionSelect}
        />
      </div>

      <Card className="flex flex-col h-full min-w-[400px] flex-1">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-w-0">
          <CardTitle className="text-base truncate">{active?.title || "Madlen Chat"}</CardTitle>
          <ModelSelect value={effectiveModel} onChange={ (v) => { setModel(v?.id); setIsImageSupported(v?.supportsImages ?? false); } } />
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col p-0 min-w-0">
          <div className="flex-1 overflow-hidden min-w-0">
            <MessageList messages={messages} />
          </div>
          <div className="p-6 pt-0 min-w-0">
            <Composer
              onSend={handleSend}
              isImageSupported={isImageSupported}
              isStreaming={isStreaming}
              onStop={handleStop}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
