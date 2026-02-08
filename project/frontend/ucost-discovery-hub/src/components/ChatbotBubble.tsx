import { useState, useRef, useEffect } from "react";
import { X, Send, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getChatbotApiUrl } from "@/lib/desktop-config";

interface Message {
  role: "user" | "bot";
  content: string;
  timestamp: Date;
}

// Chatbot backend service - now uses centralized config
const CHATBOT_API_URL = getChatbotApiUrl();

export function ChatbotBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content: "Hello! I'm here to help answer your questions about the Regional Science Centre. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);

  // Check service health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${CHATBOT_API_URL}/health`);
        if (response.ok) {
          const data = await response.json();
          setServiceStatus(data.gemma === 'online' && data.api === 'online' ? 'online' : 'offline');
        } else {
          setServiceStatus('offline');
        }
      } catch {
        setServiceStatus('offline');
      }
    };

    if (isOpen) {
      checkHealth();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle click outside to close (optional)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        chatPanelRef.current &&
        !chatPanelRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(".chatbot-button")
      ) {
        // Don't close if clicking inside panel or button
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    const question = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    try {
      // Call the chatbot backend service
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

      const response = await fetch(`${CHATBOT_API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: question }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chatbot service returned error ${response.status}: ${errorText || 'Unknown error'}`);
      }

      const data = await response.json();

      const botMessage: Message = {
        role: "bot",
        content: data.answer || "I'm sorry, I couldn't generate a response. Please try again.",
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);

      let errorMessage = "Sorry, I'm having trouble processing your question right now.";

      const errorMsg = error?.message || error?.toString() || '';

      if (error.name === 'TimeoutError' || error.name === 'AbortError' || errorMsg.includes("timeout")) {
        errorMessage = `The chatbot service is taking too long to respond.\n\nPlease try:\n1. Check if all services are running\n2. Try your question again\n3. Make sure the chatbot service is running on port 4321`;
      } else if (errorMsg.includes("Failed to fetch") || errorMsg.includes("NetworkError") || errorMsg.includes("ECONNREFUSED")) {
        errorMessage = `I couldn't connect to the chatbot service.\n\nPlease make sure:\n\n✅ Chatbot service is running:\n   cd project/chatbot-mini\n   npm run dev\n   (Should be on http://localhost:4321)\n\n✅ Gemma AI service is running:\n   npm run dev:gemma\n   (Should be on http://127.0.0.1:8011)\n\n✅ Backend API is running:\n   npm run dev:backend\n   (Should be on http://localhost:5000)\n\n✅ Or start everything together:\n   npm run dev:all\n\n💡 Check the console (F12) for detailed error messages.`;
      } else {
        errorMessage = `Error: ${errorMsg || 'Unknown error'}\n\nPlease check:\n• All services are running (npm run dev:all)\n• Browser console (F12) for detailed errors\n• Try refreshing the page`;
      }

      const errorMsgFinal: Message = {
        role: "bot",
        content: errorMessage,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsgFinal]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Helper function to render text with basic markdown-like formatting
  const renderMessageContent = (content: string) => {
    // Replace **text** with bold (using CSS)
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={index}>{boldText}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <>
      {/* Floating Chatbot Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Animated Ripple Effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 animate-ping opacity-20"></div>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 animate-pulse opacity-30" style={{ animationDelay: '1s' }}></div>

        {/* Glow Ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 blur-xl opacity-60 animate-pulse" style={{ animationDelay: '0.5s' }}></div>

        {/* Main Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="chatbot-button relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 via-pink-500 to-orange-500 shadow-2xl hover:shadow-purple-500/70 transition-all duration-500 hover:scale-110 flex items-center justify-center group animate-float border-4 border-white/20 backdrop-blur-sm"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 25%, #ec4899 50%, #f97316 100%)',
            backgroundSize: '200% 200%',
            animation: 'float 6s ease-in-out infinite, gradient-shift 3s ease infinite',
            boxShadow: '0 10px 40px rgba(139, 92, 246, 0.4), 0 0 60px rgba(236, 72, 153, 0.3)',
          }}
          aria-label="Open chatbot"
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 15px 50px rgba(139, 92, 246, 0.6), 0 0 80px rgba(236, 72, 153, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 10px 40px rgba(139, 92, 246, 0.4), 0 0 60px rgba(236, 72, 153, 0.3)';
          }}
        >
          {/* Sparkle Effects */}
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-yellow-300 rounded-full animate-pulse shadow-lg" style={{ animationDelay: '0s', boxShadow: '0 0 8px rgba(252, 211, 77, 0.8)' }}></div>
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-cyan-300 rounded-full animate-pulse shadow-lg" style={{ animationDelay: '1s', boxShadow: '0 0 8px rgba(103, 232, 249, 0.8)' }}></div>
          <div className="absolute top-0 right-0 w-2 h-2 md:w-2.5 md:h-2.5 bg-pink-300 rounded-full animate-pulse shadow-lg" style={{ animationDelay: '0.5s', boxShadow: '0 0 8px rgba(249, 168, 212, 0.8)' }}></div>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.75s', boxShadow: '0 0 6px rgba(255, 255, 255, 0.9)' }}></div>

          {/* Icon */}
          <div className="relative z-10">
            {!isOpen ? (
              <Bot
                className="w-8 h-8 md:w-10 md:h-10 text-white animate-pulse group-hover:scale-110 transition-transform duration-300 drop-shadow-lg"
                style={{ animationDuration: "2.5s" }}
              />
            ) : (
              <X className="w-8 h-8 md:w-10 md:h-10 text-white group-hover:rotate-90 transition-transform duration-300 drop-shadow-lg" />
            )}
          </div>

          {/* Online Status Badge */}
          <span className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-4 border-white shadow-lg animate-pulse flex items-center justify-center">
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-white rounded-full"></span>
          </span>
        </button>
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <Card
          ref={chatPanelRef}
          className="fixed bottom-24 right-6 z-40 w-[95vw] md:w-[700px] h-[80vh] md:h-[750px] flex flex-col bg-card/95 backdrop-blur-md border-2 border-primary/20 shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300"
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Science Assistant</h3>
                <p className="text-[10px] text-muted-foreground">
                  RSC AI • {
                    serviceStatus === 'online' ? 'Ready to help' :
                      serviceStatus === 'offline' ? 'Service offline' :
                        'Checking...'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="hover:bg-destructive/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3 bg-gradient-to-b from-background to-background/50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-3 py-2 md:px-4 md:py-2.5 ${message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none"
                    }`}
                >
                  <div className="text-xs md:text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {renderMessageContent(message.content)}
                  </div>
                  <p className="text-[10px] mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-2xl rounded-bl-none px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce"></span>
                    <span
                      className="w-2 h-2 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 md:p-4 border-t bg-background/95">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1 text-xs md:text-sm"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="shrink-0 h-8 w-8 md:h-9 md:w-9"
              >
                <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Powered by RSC AI • UCOST Dehradun
            </p>
          </div>
        </Card>
      )}
    </>
  );
}

