
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  priority?: 'Low' | 'Medium' | 'High';
  tags?: string[];
  project?: string;
  timeSpent?: number; // In minutes
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  location: string;
  timezone: string; // IANA timezone string e.g., 'America/New_York'
  avatarUrl: string;
  workStartHour: number; // 0-23
  workEndHour: number; // 0-23
  statusOverride?: 'online' | 'offline';
  tasks: Task[];
  // Rich Profile
  bio?: string;
  skills?: string[];
  email?: string;
  githubHandle?: string;
  linkedinHandle?: string;
  lat?: number;
  lng?: number;
  isTracking?: boolean;
  trackingStartTime?: number;
  timeLogs?: { startTime: number; endTime: number; duration: number }[];
}

export interface User {
    id: string;
    email: string;
}

export interface TimezoneResponse {
  timezone: string;
  city: string;
  country: string;
  utcOffset: string;
  lat?: number;
  lng?: number;
}

export interface Meeting {
    id: string;
    title: string;
    date: string; // ISO string
    contentHtml: string;
}
