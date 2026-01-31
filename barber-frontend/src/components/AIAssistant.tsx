import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Upload, Send, X, Loader2, BrainCircuit, Image as ImageIcon } from 'lucide-react';
import { analyzeImage, askBusinessAdvisor } from '../services/geminiService';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'chat' | 'vision'>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string; image?: string }[]>([
    { role: 'ai', content: "Hello! I'm your Treservi AI Manager. I can help analyze trends, optimize pricing, or review haircut photos. What's on your mind?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Strip prefix for API usage later, but keep full for display
        setSelectedImage(base64);
        setMode('vision');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = { role: 'user' as const, content: input, image: selectedImage || undefined };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      let responseText = '';

      if (mode === 'vision' && selectedImage) {
        // Use Vision Model
        const base64Data = selectedImage.split(',')[1];
        responseText = await analyzeImage(base64Data, input || "Analyze this image and give me professional feedback.");
      } else {
        // Use Thinking Model
        responseText = await askBusinessAdvisor(input);
      }

      setMessages(prev => [...prev, { role: 'ai', content: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "I encountered an error processing your request." }]);
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
      if (mode === 'vision') setMode('chat'); // Reset to chat after vision task
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-treservi-card-dark w-full max-w-2xl h-[80vh] rounded-pill shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#151515]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI Studio</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                Powered by Gemini 3.0 Pro <span className="w-2 h-2 bg-green-500 rounded-full ml-1 animate-pulse"></span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-treservi-bg-light dark:bg-treservi-bg-dark">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`
                max-w-[80%] p-4 rounded-pill shadow-sm relative
                ${msg.role === 'user' 
                  ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-none' 
                  : 'bg-white text-gray-800 dark:bg-treservi-card-dark dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700'}
              `}>
                {msg.image && (
                  <img src={msg.image} alt="Upload" className="w-full h-48 object-cover rounded-3xl mb-3 border-2 border-white/20" />
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex justify-start">
               <div className="bg-white dark:bg-treservi-card-dark p-4 rounded-pill rounded-tl-none shadow-sm flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                 {mode === 'vision' ? <ImageIcon className="animate-bounce w-5 h-5 text-purple-500" /> : <BrainCircuit className="animate-pulse w-5 h-5 text-blue-500" />}
                 <span className="text-sm text-gray-500 font-medium">
                    {mode === 'vision' ? 'Analyzing visual data...' : 'Thinking deeply...'}
                 </span>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-[#151515] border-t border-gray-100 dark:border-gray-800">
          
          {selectedImage && (
            <div className="mb-4 flex items-center gap-3 bg-gray-100 dark:bg-gray-800 p-2 rounded-2xl w-fit pr-4">
              <img src={selectedImage} alt="Selected" className="w-12 h-12 rounded-xl object-cover" />
              <span className="text-xs font-medium truncate max-w-[150px]">Image selected</span>
              <button onClick={() => setSelectedImage(null)} className="ml-2 text-gray-500 hover:text-red-500"><X size={16}/></button>
            </div>
          )}

          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-full transition-all focus-within:ring-2 focus-within:ring-treservi-accent/50">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-white dark:bg-gray-700 rounded-full text-gray-500 hover:text-treservi-accent shadow-sm transition-colors"
              title="Upload Image for Analysis"
            >
              <Upload size={20} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload}
            />
            
            <input 
              type="text" 
              className="flex-1 bg-transparent border-none outline-none px-2 text-sm dark:text-white"
              placeholder={selectedImage ? "Ask about this image..." : "Ask for advice (e.g., 'How to increase retention?')"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />

            <button 
              onClick={handleSend}
              disabled={isLoading || (!input && !selectedImage)}
              className={`
                p-3 rounded-full text-white shadow-neon-glow transition-all transform hover:scale-105
                ${isLoading || (!input && !selectedImage) ? 'bg-gray-400 cursor-not-allowed' : 'bg-treservi-accent'}
              `}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
