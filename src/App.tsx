import { useState, useEffect } from 'react';
import { User, Connection } from './types';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import StudentDashboard from './components/StudentDashboard';
import MentorDashboard from './components/MentorDashboard';
import ChatRoom from './components/ChatRoom';
import { io, Socket } from 'socket.io-client';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'chat'>('dashboard');
  const [activeChat, setActiveChat] = useState<Connection | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      initSocket(parsedUser.id);
    }
  }, []);

  const initSocket = (userId: number) => {
    const s = io('http://localhost:3000');
    s.emit('identify', userId);
    setSocket(s);
  };

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
    initSocket(u.id);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    socket?.disconnect();
    setSocket(null);
  };

  const openChat = (conn: Connection) => {
    setActiveChat(conn);
    setView('chat');
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onHome={() => setView('dashboard')}
      />

      <main className="container mx-auto py-8 px-4">
        {view === 'dashboard' ? (
          user.role === 'student' ? (
            <StudentDashboard user={user} onOpenChat={openChat} />
          ) : (
            <MentorDashboard user={user} onOpenChat={openChat} socket={socket} />
          )
        ) : (
          activeChat && (
            <ChatRoom
              connection={activeChat}
              onBack={() => setView('dashboard')}
              socket={socket}
              currentUserId={user.id}
            />
          )
        )}
      </main>
    </div>
  );
}
