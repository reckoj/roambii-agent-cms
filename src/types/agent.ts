export interface AgentProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  yearsOfExperience: number;
  region: string;
  languages: string[];
  bio: string;
  specialties: string[];
  phoneNumber?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
  certifications?: string[];
  rating?: number;
  reviewCount?: number;
  isProfileComplete: boolean;
  createdAt: any;
  updatedAt: any;
} 