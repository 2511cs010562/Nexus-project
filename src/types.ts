export type Role = 'student' | 'mentor';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  profilePic?: string;
  rating: number;
  skills: string[];
  branch: string;
  bio?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  cvUrl?: string;
  systemRating?: number;
}

export interface Connection {
  id: number;
  otherId: number;
  otherName: string;
  otherRole: Role;
  roomId: string;
}

export interface Message {
  id?: number;
  roomId: string;
  senderId: number;
  text?: string;
  voiceUrl?: string;
  type: 'text' | 'video' | 'roadmap' | 'voice' | 'video_call';
  timestamp: number;
}

export interface PendingRequest {
  id: number;
  studentId: number;
  studentName: string;
  studentBranch: string;
}
