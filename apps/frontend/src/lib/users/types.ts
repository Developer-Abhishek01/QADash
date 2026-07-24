export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface UpdateProfileData {
  name?: string;
  avatar?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export interface UpdateUserData {
  name?: string;
  role?: string;
  avatar?: string;
}

export interface AppSettings {
  emailNotify: boolean;
  pushNotify: boolean;
  darkMode: boolean;
  autoReport: boolean;
  publicProfile: boolean;
}
