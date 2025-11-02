'use client';

import { useState } from 'react';
import { Send, Mic } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Message } from '@/modules/conversations/domain/message';

export default function Conversation1({ messages }: { messages: Message[] }) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    // const userMessage = {
    //   id: Date.now().toString(),
    //   content: input,
    //   sender: 'user',
    //   timestamp: new Date().toISOString(),
    // };

    // setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content:
          "Thanks for your message! I'm here to help with any other questions you might have about our services or features.",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };

      // setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex h-[calc(100vh-132px)] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message.message}
            direction={message.direction}
            timestamp={new Date(message.created_at)}
          />
        ))}

        {isTyping && (
          <div className="text-muted-foreground flex items-center space-x-2 text-sm">
            <div className="flex space-x-1">
              <div
                className="bg-muted-foreground/70 h-2 w-2 animate-bounce rounded-full"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="bg-muted-foreground/70 h-2 w-2 animate-bounce rounded-full"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="bg-muted-foreground/70 h-2 w-2 animate-bounce rounded-full"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
            <span>AI is typing...</span>
          </div>
        )}
      </div>

      <div className="border-border border-t p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="outline">
            <Mic className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
