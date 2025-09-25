import React, { useState } from "react";
import { useCurrentWallet } from "@mysten/dapp-kit";
// Icons removed to avoid missing types, using text-only per app style
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";

interface Session {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

interface SidebarProps {
  currentSession: string;
  onSessionChange: (sessionId: string) => void;
  onShowDashboard?: () => void;
}

export function Sidebar({
  currentSession,
  onSessionChange,
  onShowDashboard,
}: SidebarProps) {
  const { currentWallet } = useCurrentWallet();
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: "main",
      title: "Welcome Chat",
      lastMessage: "Hello! I'm your AI assistant...",
      timestamp: new Date(),
      messageCount: 1,
    },
  ]);

  const createNewSession = () => {
    const newSession: Session = {
      id: `session-${Date.now()}`,
      title: `Chat ${sessions.length + 1}`,
      lastMessage: "New conversation started",
      timestamp: new Date(),
      messageCount: 0,
    };
    setSessions([newSession, ...sessions]);
    onSessionChange(newSession.id);
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) return; // Don't delete the last session

    setSessions(sessions.filter((s) => s.id !== sessionId));
    if (currentSession === sessionId) {
      onSessionChange(sessions[0].id);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <div className="w-80 bg-bg border-r-2 border-border flex flex-col h-full ">
      {/* Logo/Brand Section */}
      <div className="p-6 border-b-2 border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-bg rounded-base border-2 border-border  flex items-center justify-center font-heading text-sm">
            SUI
          </div>
          <div>
            <h1 className="text-lg text-text">SUI AI</h1>
            <p className="text-xs text-muted-foreground font-base">
              Blockchain Assistant
            </p>
          </div>
        </div>

        <Button
          onClick={createNewSession}
          className="w-full bg-bg border-2 border-border hover:bg-main-accent  text-main-foreground font-base"
          size="sm"
        >
          New Chat
        </Button>
      </div>

      {/* Chat Sessions */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
            Recent Chats
          </h3>

          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSessionChange(session.id)}
              className={`group relative p-3 rounded-base border-2 cursor-pointer transition-all font-base ${
                currentSession === session.id
                  ? "bg-primary text-primary-foreground border-border "
                  : "bg-main text-main-foreground border-border hover:bg-main-accent hover:"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm truncate">
                    {session.title}
                  </h4>
                </div>

                {sessions.length > 1 && (
                  <Button
                    onClick={(e) => deleteSession(session.id, e)}
                    size="sm"
                    className={`opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2 py-0 hover:bg-destructive hover:text-destructive-foreground ${
                      currentSession === session.id
                        ? "text-primary-foreground hover:bg-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    Delete
                  </Button>
                )}
              </div>

              <p className="text-xs opacity-80 truncate mb-2">
                {session.lastMessage}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs opacity-70">
                  <span>{formatTimestamp(session.timestamp)}</span>
                </div>

                {session.messageCount > 0 && (
                  <Badge
                    variant="outline"
                    className={`text-xs h-5 px-2 ${
                      currentSession === session.id
                        ? "border-primary-foreground text-primary-foreground"
                        : "border-muted-foreground text-muted-foreground"
                    }`}
                  >
                    {session.messageCount}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Settings/Footer */}
      <div className="p-4 border-t-2 border-border ">
        {onShowDashboard && (
          <Button
            onClick={onShowDashboard}
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-main-foreground hover:-main-accent border-2 border-transparent hover:border-border hover: font-base mb-2"
          >
            Wallet Dashboard
          </Button>
        )}

        <Button
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-main-foreground hover:-main-accent border-2 border-transparent hover:border-border hover: font-base"
        >
          Settings
        </Button>

        {currentWallet && (
          <div className="mt-3 p-2 bg-bg rounded-base border-2 border-border">
            <p className="text-xs text-muted-foreground font-base">
              Connected Wallet
            </p>
            <p className="text-xs font-mono text-main-foreground truncate">
              {currentWallet.accounts[0]?.address}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
