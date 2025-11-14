'use client';

import { Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import MessageBubble from './MessageBubble';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { useAutoScroll } from '@/core/hooks/use-auto-scroll';
import { Message } from '@/modules/conversations/domain/message';

export default function Conversation1({ messages }: { messages: Message[] }) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messageCount = messages.length
  const { containerRef, bottomRef } = useAutoScroll<HTMLDivElement>({
    deps: [messageCount],
    thresholdPx: 120,
    stickOnMount: true,
    behavior: 'smooth',
  })

  const spring = useMemo(() => ({
    type: 'spring',
    stiffness: 380,
    damping: 30,
    mass: 0.8,
  }), [])

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
      // const aiMessage = {
      //   id: (Date.now() + 1).toString(),
      //   content:
      //     "Thanks for your message! I'm here to help with any other questions you might have about our services or features.",
      //   sender: 'ai',
      //   timestamp: new Date().toISOString(),
      // };

      // setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex h-[calc(100vh-132px)] flex-col">
      <div ref={containerRef} className="flex-1 space-y-4 overflow-y-auto p-4 sidebar-scroll">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              layout
              key={message.id}
              transition={spring}
              exit={{ opacity: 0, y: -8 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <MessageBubble
                message={message.message}
                direction={message.direction}
                timestamp={new Date(message.created_at)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />

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
            classNameContainer="flex-1"
            placeholder="Type your message..."
            onChange={(e) => setInput(e.target.value)}
          />
          <Button
            size="icon"
            type="submit"
          >
            <Send className="h-4 w-4" />
          </Button>
          {/* <Button type="button" size="icon" variant="outline">
            <Mic className="h-4 w-4" />
          </Button> */}
        </form>
      </div>
    </div>
  );
}
