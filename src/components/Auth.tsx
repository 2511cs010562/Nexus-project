import React, { useState } from 'react';
import { User, Role } from '../types';
import { LogIn, UserPlus, ShieldCheck, Mail, Lock, User as UserIcon, BookOpen, GraduationCap } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'form' | 'otp' | 'verify_mentor'>('form');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as Role,
    branch: '',
    skills: [] as string[]
  });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationData, setVerificationData] = useState({
    linkedinUrl: '',
    githubUrl: '',
    cvUrl: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        onLogin(data.user);
      } else {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.debugOtp) console.log('DEBUG OTP:', data.debugOtp);
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (formData.role === 'mentor') {
        setStep('verify_mentor');
      } else {
        setIsLogin(true);
        setStep('form');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMentorVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // For demo, we just log in the user after they "submit" verification
      setIsLogin(true);
      setStep('form');
      alert("Verification submitted! An admin will review your profile. You can now login.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="text-blue-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verify your email</h2>
            <p className="text-gray-500 mt-2">We've sent a code to {formData.email}</p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest font-bold"
                required
              />
            </div>

            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'verify_mentor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Mentor Verification</h2>
            <p className="text-gray-500 mt-2">Complete your profile to start mentoring</p>
          </div>

          <form onSubmit={handleMentorVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile</label>
              <input
                type="url"
                value={verificationData.linkedinUrl}
                onChange={(e) => setVerificationData({ ...verificationData, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Profile</label>
              <input
                type="url"
                value={verificationData.githubUrl}
                onChange={(e) => setVerificationData({ ...verificationData, githubUrl: e.target.value })}
                placeholder="https://github.com/yourusername"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Submit for Verification
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-xl">
            <BookOpen className="text-white" size={40} />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">MentorBridge</h1>
        <p className="text-gray-500 mt-2 text-lg">Connecting Engineering Minds</p>
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="flex">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all ${isLogin ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
          >
            Create Account
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'student' })}
                    className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${formData.role === 'student' ? 'border-blue-600 bg-blue-50 text-blue-600 font-bold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    <GraduationCap size={18} /> Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'mentor' })}
                    className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${formData.role === 'mentor' ? 'border-blue-600 bg-blue-50 text-blue-600 font-bold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    <ShieldCheck size={18} /> Mentor
                  </button>
                </div>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none appearance-none"
                    required
                  >
                    <option value="">Select Branch</option>
                    <option value="CSE">Computer Science</option>
                    <option value="ECE">Electronics</option>
                    <option value="Civil">Civil Engineering</option>
                    <option value="ME">Mechanical</option>
                  </select>
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                required
              />
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium text-center">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 hover:shadow-lg transition-all transform active:scale-95 disabled:bg-blue-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                'Processing...'
              ) : isLogin ? (
                <><LogIn size={20} /> Sign In</>
              ) : (
                <><UserPlus size={20} /> Create Account</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
