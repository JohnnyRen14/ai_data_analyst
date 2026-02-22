import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatInterface({ sessionId, onComplete }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I'm your AI analytics assistant. To provide the best insights, I'd like to understand your business objectives. What are you hoping to learn from this data?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationComplete, setConversationComplete] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/business-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: [...messages, userMessage],
        }),
      });

      const data = await response.json();

      const replyContent = data.message ||
        (data.error ? `Error: ${data.error}` : 'Sorry, I received an empty response.');

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: replyContent },
      ]);

      // Check if conversation is complete
      if (data.complete && data.message) {
        setConversationComplete(true);
        if (onComplete) {
          onComplete(data.businessPlan);
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[600px] glass-strong rounded-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-6 border-b border-white/10 gradient-primary">
        <h3 className="text-xl font-bold text-white">Business Understanding</h3>
        <p className="text-white/80 text-sm">
          Help me understand your objectives
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'user'
                  ? 'gradient-primary text-white'
                  : 'glass text-gray-200'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="prose prose-invert max-w-none prose-sm whitespace-pre-wrap
                  prose-p:leading-tight prose-p:my-0
                  prose-li:my-0 prose-ul:my-0 prose-ol:my-0
                  prose-headings:text-white prose-headings:font-bold prose-headings:mt-1 prose-headings:mb-0
                  prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.role === 'assistant' ? (msg.content || '').replace(/\n\n+/g, '\n') : (msg.content || '')}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="glass p-4 rounded-2xl">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!conversationComplete && (
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary resize-none"
              rows="2"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="btn-primary self-end disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {conversationComplete && (
        <div className="p-4 border-t border-white/10 bg-green-500/10">
          <p className="text-green-400 text-center">
            ✓ Business objectives captured! Proceeding to analysis...
          </p>
        </div>
      )}
    </div>
  );
}
