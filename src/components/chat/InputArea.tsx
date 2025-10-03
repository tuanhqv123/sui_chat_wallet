import { useRef } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface InputAreaProps {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
}

export function InputArea({
  input,
  onInputChange,
  onSendMessage,
  isLoading,
}: InputAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="p-4 border-t-2 border-border bg-bg h-20">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1"
        />
        <Button onClick={onSendMessage} disabled={!input.trim() || isLoading}>
          Send
        </Button>
      </div>
    </div>
  );
}
