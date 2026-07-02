import { createReducer, createSelector, on } from '@ngrx/store';
import { StaffActions } from './staff.actions';
import { Staff, StaffGroup } from './staff.models';

export const staffFeatureKey = 'staff';

export interface StaffState {
  staff: Staff[];
  groups: StaffGroup[];
  selectedStaffPin: string | null;
}

const groups: StaffGroup[] = [
  { id: 'front-office', name: 'Front Office', color: '#1967d2' },
  { id: 'clinical', name: 'Clinical Team', color: '#198754' },
  { id: 'operations', name: 'Operations', color: '#d97706' },
];

const seedStaff: Staff[] = [
  {
    'staff-pin': 'staff-1', firstName: 'Maya', lastName: 'Chen', role: 'Office Manager',
    keySkill: 'Administration',
    skills: ['Team leadership', 'Scheduling', 'Vendor management', 'Office operations'],
    email: 'maya.chen@northstar.example', phone: '(415) 555-0138', location: 'Main Office',
    groupId: 'front-office', status: 'Available', initials: 'MC', accent: '#2563eb',
    calendar: [
      { id: 'event-1', date: '2026-06-29', type: 'availability', title: 'Available', startTime: '09:00', endTime: '17:00', notes: 'Front desk coverage' },
      { id: 'event-2', date: '2026-07-01', type: 'remark', title: 'Vendor meeting', startTime: '11:00', endTime: '12:00' },
    ],
  },
  {
    'staff-pin': 'staff-2', firstName: 'Jordan', lastName: 'Blake', role: 'Reception Coordinator',
    keySkill: 'Administration',
    skills: ['Customer service', 'Phone systems', 'Appointment booking', 'Data entry'],
    email: 'jordan.blake@northstar.example', phone: '(415) 555-0194', location: 'Main Office',
    groupId: 'front-office', status: 'Busy', initials: 'JB', accent: '#7c3aed', calendar: [],
  },
  {
    'staff-pin': 'staff-3', firstName: 'Priya', lastName: 'Shah', role: 'Registered Nurse',
    keySkill: 'Clinical care',
    skills: ['Patient assessment', 'Triage', 'Care planning', 'Clinical documentation'],
    email: 'priya.shah@northstar.example', phone: '(415) 555-0112', location: 'West Clinic',
    groupId: 'clinical', status: 'Available', initials: 'PS', accent: '#0f766e', calendar: [],
  },
  {
    'staff-pin': 'staff-4', firstName: 'Eli', lastName: 'Morgan', role: 'Care Coordinator',
    keySkill: 'Clinical care',
    skills: ['Case management', 'Patient advocacy', 'Referrals', 'Care coordination'],
    email: 'eli.morgan@northstar.example', phone: '(415) 555-0171', location: 'West Clinic',
    groupId: 'clinical', status: 'On leave', initials: 'EM', accent: '#be123c',
    calendar: [{ id: 'event-3', date: '2026-06-30', type: 'leave', title: 'Personal leave', notes: 'Approved' }],
  },
  {
    'staff-pin': 'staff-5', firstName: 'Sofia', lastName: 'Reyes', role: 'Billing Specialist',
    keySkill: 'Business operations',
    skills: ['Medical billing', 'Claims review', 'Insurance verification', 'Accounts receivable'],
    email: 'sofia.reyes@northstar.example', phone: '(415) 555-0145', location: 'Main Office',
    groupId: 'operations', status: 'Available', initials: 'SR', accent: '#c2410c', calendar: [],
  },
  {
    'staff-pin': 'staff-6', firstName: 'Noah', lastName: 'Williams', role: 'Facilities Coordinator',
    keySkill: 'Business operations',
    skills: ['Facilities maintenance', 'Safety compliance', 'Inventory', 'Vendor coordination'],
    email: 'noah.williams@northstar.example', phone: '(415) 555-0166', location: 'Main Office',
    groupId: 'operations', status: 'Available', initials: 'NW', accent: '#475569', calendar: [],
  },
];

export const initialStaffState: StaffState = { staff: [], groups, selectedStaffPin: null };

export const staffReducer = createReducer(
  initialStaffState,
  on(StaffActions.loadStaff, (state): StaffState => ({
    ...state,
    staff: seedStaff,
    selectedStaffPin: state.selectedStaffPin ?? seedStaff[0]['staff-pin'],
  })),
  on(StaffActions.selectStaff, (state, { staffPin }) => ({ ...state, selectedStaffPin: staffPin })),
  on(StaffActions.moveStaff, (state, { staffPin, targetGroupId, targetIndex }) => {
    const moving = state.staff.find((member) => member['staff-pin'] === staffPin);
    if (!moving) return state;
    const remaining = state.staff.filter((member) => member['staff-pin'] !== staffPin);
    const anchor = remaining.filter((member) => member.groupId === targetGroupId)[targetIndex];
    remaining.splice(anchor ? remaining.indexOf(anchor) : remaining.length, 0, { ...moving, groupId: targetGroupId });
    return { ...state, staff: remaining };
  }),
  on(StaffActions.reorderStaffList, (state, { orderedPins }) => {
    const orderedMembers = orderedPins
      .map((pin) => state.staff.find((member) => member['staff-pin'] === pin))
      .filter((member): member is Staff => Boolean(member));
    if (orderedMembers.length !== orderedPins.length) return state;
    const orderedPinSet = new Set(orderedPins);
    let orderedIndex = 0;
    return {
      ...state,
      staff: state.staff.map((member) =>
        orderedPinSet.has(member['staff-pin']) ? orderedMembers[orderedIndex++] : member
      ),
    };
  }),
  on(StaffActions.reorderSkillStaff, (state, { keySkill, orderedPins }) => {
    const skillMembers = orderedPins
      .map((pin) => state.staff.find((member) => member['staff-pin'] === pin))
      .filter((member): member is Staff => member?.keySkill === keySkill);
    if (skillMembers.length !== orderedPins.length) return state;
    let skillIndex = 0;
    return {
      ...state,
      staff: state.staff.map((member) =>
        member.keySkill === keySkill ? skillMembers[skillIndex++] : member
      ),
    };
  }),
  on(StaffActions.updateStaffDetails, (state, { staffPin, changes }) => ({
    ...state, staff: state.staff.map((member) => member['staff-pin'] === staffPin ? { ...member, ...changes } : member),
  })),
  on(StaffActions.addCalendarEntry, (state, { staffPin, entry }) => ({
    ...state, staff: state.staff.map((member) => member['staff-pin'] === staffPin ? { ...member, calendar: [...member.calendar, entry] } : member),
  })),
  on(StaffActions.updateCalendarEntry, (state, { staffPin, entry }) => ({
    ...state, staff: state.staff.map((member) => member['staff-pin'] === staffPin ? { ...member, calendar: member.calendar.map((item) => item.id === entry.id ? entry : item) } : member),
  })),
  on(StaffActions.deleteCalendarEntry, (state, { staffPin, entryId }) => ({
    ...state, staff: state.staff.map((member) => member['staff-pin'] === staffPin ? { ...member, calendar: member.calendar.filter((item) => item.id !== entryId) } : member),
  })),
);

interface RootState { [staffFeatureKey]: StaffState }
const selectStaffState = (state: RootState) => state[staffFeatureKey];
export const selectAllStaff = createSelector(selectStaffState, (state) => state.staff);
export const selectStaffGroups = createSelector(selectStaffState, (state) => state.groups);
export const selectSelectedStaff = createSelector(selectStaffState, (state) =>
  state.staff.find((member) => member['staff-pin'] === state.selectedStaffPin) ?? null
);
