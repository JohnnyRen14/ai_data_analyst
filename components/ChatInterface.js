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
    <div className="glass-strong animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 580, borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'linear-gradient(90deg, rgba(124,110,232,0.15) 0%, rgba(177,158,239,0.1) 100%)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(124,110,232,0.4)', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.6">
            <circle cx="8" cy="8" r="6"/>
            <path d="M8 5v4l2 1" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Business Understanding</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Tell the AI your objectives</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
              {msg.role === 'user' ? (
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              ) : (
                <div className="prose prose-invert max-w-none prose-sm"
                  style={{ whiteSpace: 'pre-wrap', margin: 0 }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {(msg.content || '').replace(/\n\n+/g, '\n')}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div className="chat-bubble-assistant" style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '12px 16px' }}>
              {[0, 0.15, 0.3].map((delay, i) => (
                <span key={i} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--accent-lavender)', opacity: 0.7,
                  animation: `pulse 1.2s ease-in-out ${delay}s infinite`,
                  display: 'inline-block',
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!conversationComplete ? (
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your business objectives…"
            className="input-field"
            rows={2}
            disabled={isLoading}
            style={{ flex: 1 }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="btn-primary"
            style={{ alignSelf: 'flex-end', opacity: (isLoading || !input.trim()) ? 0.45 : 1, cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer' }}
          >
            Send
          </button>
        </div>
      ) : (
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid rgba(16,217,146,0.15)',
          background: 'rgba(16,217,146,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--success)', fontSize: '0.87rem', fontWeight: 500,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="6"/>
            <path d="m5 8 2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Business objectives captured &mdash; proceeding to analysis…
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.3);opacity:1} }`}</style>
    </div>
  );
}
