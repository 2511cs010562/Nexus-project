import { useState, useEffect } from 'react';
import { User, Connection } from '../types';
import TinderCard from 'react-tinder-card';
import { Filter, Star, MapPin, MessageSquare, ChevronRight, X, Heart } from 'lucide-react';

interface StudentDashboardProps {
  user: User;
  onOpenChat: (conn: Connection) => void;
}

export default function StudentDashboard({ user, onOpenChat }: StudentDashboardProps) {
  const [mentors, setMentors] = useState<User[]>([]);
  const [activeConnections, setActiveConnections] = useState<Connection[]>([]);
  const [filters, setFilters] = useState({
    branch: '',
    skill: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMentors();
    fetchActiveConnections();
  }, []);

  const fetchMentors = async () => {
    try {
      const res = await fetch(`/api/mentors?studentId=${user.id}`);
      const data = await res.json();
      setMentors(data);
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

  const onSwipe = async (direction: string, mentorId: number) => {
    setMentors(prev => prev.filter(m => m.id !== mentorId));
    try {
      await fetch('/api/swipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.id, mentorId, direction })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMentors = mentors.filter(m => {
    const branchMatch = !filters.branch || m.branch === filters.branch;
    const skillMatch = !filters.skill || (m.skills && m.skills.includes(filters.skill));
    const alreadyConnected = activeConnections.some(c => c.otherId === m.id);
    return branchMatch && skillMatch && !alreadyConnected;
  });

  const allSkills = Array.from(new Set(mentors.flatMap(m => m.skills)));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters & Connections */}
        <div className="w-full md:w-80 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Filter size={20} className="text-blue-600" /> Filters
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Branch</label>
                <select
                  value={filters.branch}
                  onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">All Branches</option>
                  <option value="CSE">Computer Science</option>
                  <option value="ECE">Electronics</option>
                  <option value="Civil">Civil Engineering</option>
                  <option value="ME">Mechanical</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Skill Focus</label>
                <select
                  value={filters.skill}
                  onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">All Skills</option>
                  {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-green-600" /> Active Mentors
            </h3>
            <div className="space-y-3">
              {activeConnections.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No active connections yet.</p>
              ) : (
                activeConnections.map(conn => (
                  <button
                    key={conn.id}
                    onClick={() => onOpenChat(conn)}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{conn.otherName}</p>
                      <p className="text-xs text-gray-500">{conn.otherRole}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Swipe Area */}
        <div className="flex-1">
          <div className="relative h-[550px] w-full max-w-[400px] mx-auto">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredMentors.length > 0 ? (
              <div className="relative w-full h-full">
                {filteredMentors.map((mentor) => (
                  <TinderCard
                    key={mentor.id}
                    className="absolute"
                    onSwipe={(dir) => onSwipe(dir, mentor.id)}
                    preventSwipe={['up', 'down']}
                  >
                    <div className="relative bg-white w-[400px] h-[550px] rounded-2xl shadow-xl border border-gray-200 overflow-hidden cursor-grab active:cursor-grabbing">
                      <div className="relative h-2/3">
                        <img
                          src={mentor.profilePic || `https://picsum.photos/seed/${mentor.id}/400/600`}
                          alt={mentor.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                          <h2 className="text-3xl font-bold">{mentor.name}, {mentor.branch}</h2>
                          <div className="flex items-center gap-1 mt-1">
                            <Star size={18} className="fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{mentor.rating}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {mentor.skills.map(skill => (
                            <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                              {skill}
                            </span>
                          ))}
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-3">{mentor.bio || "Industry expert ready to guide you in engineering excellence and career growth."}</p>
                      </div>

                      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-12 pointer-events-none px-6">
                        <div className="w-16 h-16 rounded-full bg-white shadow-lg border border-red-100 flex items-center justify-center text-red-500">
                          <X size={32} />
                        </div>
                        <div className="w-16 h-16 rounded-full bg-white shadow-lg border border-green-100 flex items-center justify-center text-green-500">
                          <Heart size={32} className="fill-current" />
                        </div>
                      </div>
                    </div>
                  </TinderCard>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Star size={40} className="text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No More Mentors</h3>
                <p className="text-gray-500">Try adjusting your filters or check back later for more mentors.</p>
                <button
                  onClick={() => setFilters({ branch: '', skill: '' })}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
