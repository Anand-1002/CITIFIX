import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import { chatApi } from '@/lib/api.js';
import { Send, Bot, User, Sparkles, RotateCcw, MessageSquare } from 'lucide-react';
import citifixLogo from '@/assets/citifix-logo.png';

const TypingIndicator = () => (
  <div className="flex items-end gap-3 animate-fade-in">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
      <Bot className="w-4 h-4 text-white" />
    </div>
    <div className="bg-white/10 border border-white/15 rounded-2xl rounded-bl-sm px-4 py-3">
      <div className="flex gap-1.5 items-center h-4">
        <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

const SUGGESTIONS = [
  "How do I report a pothole?",
  "What does ESCALATED status mean?",
  "How do I earn reward points?",
  "How long until my complaint is resolved?",
];

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (messageText) => {
    const payload = (messageText || text).trim();
    if (!payload || loading) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: payload,
    };

    setMessages(prev => [...prev, userMsg]);
    setText('');
    setLoading(true);

    try {
      // Build history from current messages (exclude the one we just added)
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const reply = await chatApi.sendMessage(payload, history);
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: reply.reply,
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      <Helmet>
        <title>AI Assistant - CITIFIX</title>
        <meta name="description" content="Chat with the CitiFix AI civic assistant powered by Groq." />
      </Helmet>

      <DashboardLayout>
        <div className="flex flex-col h-[calc(100vh-10rem)] max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">CitiFix AI Assistant</h1>
                <p className="text-xs text-white/50 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Powered by Groq · Session only
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New chat
              </button>
            )}
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

            {isEmpty ? (
              /* Welcome state */
              <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-8">
                <div className="mb-6">
                  <img src={citifixLogo} alt="CitiFix" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-xl" />
                  <h2 className="text-2xl font-bold text-white mb-2">How can I help you today?</h2>
                  <p className="text-white/50 text-sm max-w-sm">
                    Ask me anything about reporting civic issues, complaint statuses, or navigating CitiFix.
                  </p>
                </div>
                {/* Suggestion chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 text-white/70 hover:text-white text-sm text-left transition-all duration-200 group"
                    >
                      <MessageSquare className="w-4 h-4 text-orange-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message list */
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg
                      ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-slate-400 to-slate-600'
                        : 'bg-gradient-to-br from-orange-500 to-orange-600'
                      }`}
                    >
                      {msg.role === 'user'
                        ? <User className="w-4 h-4 text-white" />
                        : <Bot className="w-4 h-4 text-white" />
                      }
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                      ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-sm shadow-lg shadow-orange-500/20'
                        : msg.isError
                          ? 'bg-red-500/15 border border-red-500/30 text-red-300 rounded-bl-sm'
                          : 'bg-white/10 border border-white/15 text-white/90 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && <TypingIndicator />}
              </>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 mt-4">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2 p-2 bg-white/5 border border-white/15 rounded-2xl backdrop-blur-sm focus-within:border-orange-500/50 focus-within:bg-white/8 transition-all duration-200"
            >
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask about civic issues, complaint status, or CitiFix features..."
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/35 resize-none outline-none px-2 py-1.5 leading-relaxed max-h-32"
                style={{ scrollbarWidth: 'none' }}
              />
              <button
                type="submit"
                disabled={!text.trim() || loading}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none hover:scale-105 active:scale-95 self-end"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
            <p className="text-center text-white/25 text-xs mt-2">
              Conversation is not saved · Clears on logout
            </p>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default Chatbot;
