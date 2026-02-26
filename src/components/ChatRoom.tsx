import { useState, useEffect, useRef } from 'react';
import { Connection, Message } from '../types';
import { Send, ArrowLeft, MoreVertical, Phone, Video, ShieldCheck } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface ChatRoomProps {
  connection: Connection;
  onBack: () => void;
  socket: Socket | null;
  currentUserId: number;
}

export default function ChatRoom({ connection, onBack, socket, currentUserId }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    socket?.emit('join_room', connection.roomId);

    socket?.on('message', (msg: Message) => {
      if (msg.roomId === connection.roomId) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => {
      socket?.off('message');
    };
  }, [connection.roomId, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const res = await fetch(`/api/messages/${connection.roomId}`);
    const data = await res.json();
    setMessages(data);
  };

  const handleSend = async (e: any) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = {
      roomId: connection.roomId,
      senderId: currentUserId,
      text: newMessage,
      type: 'text' as const,
    };

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[600px] flex flex-col bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
      {/* Chat Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {connection.otherName[0]}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 leading-none">{connection.otherName}</h3>
              <p className="text-xs text-green-500 mt-1">Online</p>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-4">
            <ShieldCheck size={14} className="text-green-500" />
            End-to-end encrypted
          </div>
          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Phone size={20} /></button>
          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Video size={20} /></button>
          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.map((msg, i) => {
          const isOwn = msg.senderId === currentUserId;
          return (
            <div key={i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-2xl ${isOwn ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-none'
                }`}>
                <p className="text-sm">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Message MentorBridge..."
          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
        />
        <button
          type="submit"
          className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
