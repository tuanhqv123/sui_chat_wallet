import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <ScrollArea className="flex-1 p-0">
      <div className="p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <Avatar className="h-8 w-8 flex-shrink-0 overflow-hidden bg-bw border-2 border-border">
              <img
                src={
                  message.type === "user"
                    ? "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Emery"
                    : "https://api.dicebear.com/9.x/bottts/svg?seed=Felix&backgroundColor=transparent"
                }
                alt={message.type === "user" ? "user avatar" : "ai avatar"}
                className="h-full w-full object-cover"
              />
              <AvatarFallback>
                {message.type === "user" ? "U" : "AI"}
              </AvatarFallback>
            </Avatar>
            <div
              className={`max-w-[80%] rounded-base border-2 border-border p-3 shadow-shadow ${
                message.isError
                  ? "bg-destructive text-destructive-foreground"
                  : message.type === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-main text-main-foreground"
              }`}
            >
              <div className="text-sm markdown-content text-left">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
              <p className="text-xs opacity-70 mt-2 text-right">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 ">
            <Avatar className="h-8 w-8 overflow-hidden border-2 border-border">
              <img
                src="https://api.dicebear.com/9.x/bottts/svg?seed=Felix&backgroundColor=transparent"
                alt="ai avatar"
                className="h-full w-full object-cover"
              />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="border-2 border-border rounded-base p-3 ">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
