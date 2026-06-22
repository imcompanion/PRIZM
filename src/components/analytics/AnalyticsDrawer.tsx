import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Trash2 } from "lucide-react";
import { useAnalyticsContext } from "@/contexts/AnalyticsContext";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-analytics`;

async function streamChat({
  messages,
  pageContext,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  pageContext: any;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      question: messages[messages.length - 1].content,
      pageContext,
      conversationHistory: messages.slice(0, -1),
    }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || `Error: ${resp.status}`);
    return;
  }

  if (!resp.body) {
    onError("No response body");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

export function AnalyticsDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { pageContext, pageName } = useAnalyticsContext();
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = sessionStorage.getItem("analytics-chat");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { sessionStorage.setItem("analytics-chat", JSON.stringify(messages)); } catch {}
  }, [messages]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: allMessages,
        pageContext,
        onDelta: upsertAssistant,
        onDone: () => setIsLoading(false),
        onError: (err) => {
          setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err}` }]);
          setIsLoading(false);
        },
      });
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Failed to connect. Please try again." }]);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] flex flex-col p-0">
        <SheetHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Ask Analytics
            </SheetTitle>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setMessages([])} className="h-7 px-2 text-xs text-muted-foreground">
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          {pageName && (
            <p className="text-[10px] text-muted-foreground">
              Context: <span className="font-medium">{pageName}</span>
            </p>
          )}
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm font-medium">Ask a question about your data</p>
              <p className="text-xs mt-1 max-w-[280px]">
                e.g. "Which projects have the worst margin?" or "Why did Feb profit drop?"
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                <span className="animate-pulse">Thinking…</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              disabled={isLoading}
              className="text-sm"
            />
            <Button size="icon" onClick={send} disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
