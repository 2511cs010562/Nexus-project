import { LogOut, Home, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onHome: () => void;
}

export default function Navbar({ user, onLogout, onHome }: NavbarProps) {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onHome}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <UserIcon size={20} />
          </div>
          <span className="font-bold text-xl text-gray-900">MentorBridge</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              {user.name[0]}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onHome}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Home"
            >
              <Home size={20} />
            </button>
            <button
              onClick={onLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
