export type StaffStatus = 'Available' | 'Busy' | 'On leave';
export type CalendarEntryType = 'availability' | 'leave' | 'remark' | 'comment';

export interface StaffCalendarEntry {
  id: string;
  date: string;
  type: CalendarEntryType;
  title: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  groupId: string;
  status: StaffStatus;
  initials: string;
  accent: string;
  calendar: StaffCalendarEntry[];
}

export interface StaffGroup {
  id: string;
  name: string;
  color: string;
}
