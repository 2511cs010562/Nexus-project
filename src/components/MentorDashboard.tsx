import { useState, useEffect } from 'react';
import { User, PendingRequest, Connection } from '../types';
import { Check, X, MessageSquare, User as UserIcon, BookOpen, Clock } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface MentorDashboardProps {
  user: User;
  onOpenChat: (conn: Connection) => void;
  socket: Socket | null;
}

export default function MentorDashboard({ user, onOpenChat, socket }: MentorDashboardProps) {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [activeConnections, setActiveConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
    fetchActiveConnections();

    socket?.on('new_request', () => {
      fetchPendingRequests();
    });

    return () => {
      socket?.off('new_request');
    };
  }, [socket]);

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch(`/api/connections/pending/${user.id}`);
      const data = await res.json();
      setPendingRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveConnections = async () => {
    try {
      const res = await fetch(`/api/connections/active/${user.id}`);
      const data = await res.json();
      setActiveConnections(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResponse = async (connectionId: number, status: 'accepted' | 'rejected') => {
    try {
      await fetch('/api/connections/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, status })
      });
      fetchPendingRequests();
      if (status === 'accepted') fetchActiveConnections();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 border-4 border-blue-50">
                <UserIcon size={48} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-blue-600 font-semibold">{user.branch}</p>
              <div className="flex items-center gap-1 mt-2 bg-yellow-50 px-3 py-1 rounded-full">
                <Clock size={16} className="text-yellow-600" />
                <span className="text-xs font-bold text-yellow-700">Verified Mentor</span>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100 italic text-gray-600 text-sm text-center">
              "{user.bio || "Sharing knowledge to bridge the gap between education and industry."}"
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600" /> My Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.skills.map(skill => (
                <span key={skill} className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-semibold rounded-full border border-gray-100">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Center */}
        <div className="lg:col-span-2 space-y-8">
          {/* Pending Requests */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              Pending Requests <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">{pendingRequests.length}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-500">No new mentorship requests at the moment.</p>
                </div>
              ) : (
                pendingRequests.map(req => (
                  <div key={req.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{req.studentName}</p>
                      <p className="text-sm text-gray-600">{req.studentBranch}</p>
                    </div>
                    <div className="flex gap-2 mt-6">
                      <button
                        onClick={() => handleResponse(req.id, 'accepted')}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Check size={18} /> Accept
                      </button>
                      <button
                        onClick={() => handleResponse(req.id, 'rejected')}
                        className="flex-1 bg-gray-50 text-gray-600 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                      >
                        <X size={18} /> Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Active Chats */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              Active Mentorships <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">{activeConnections.length}</span>
            </h3>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {activeConnections.length === 0 ? (
                <p className="p-12 text-center text-gray-500 italic">No active connections. Start accepting requests to mentor students!</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activeConnections.map(conn => (
                    <div key={conn.id} className="p-4 hover:bg-gray-50 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">
                          {conn.otherName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{conn.otherName}</p>
                          <p className="text-xs text-gray-500">{conn.otherRole}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenChat(conn)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        title="Open Chat"
                      >
                        <MessageSquare size={24} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
