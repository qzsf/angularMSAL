import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { StaffCalendarEntry, StaffStatus } from './staff.models';

export const StaffActions = createActionGroup({
  source: 'Staff',
  events: {
    'Load Staff': emptyProps(),
    'Select Staff': props<{ staffId: string }>(),
    'Move Staff': props<{ staffId: string; targetGroupId: string; targetIndex: number }>(),
    'Reorder Staff List': props<{ orderedIds: string[] }>(),
    'Reorder Skill Staff': props<{ keySkill: string; orderedIds: string[] }>(),
    'Update Staff Details': props<{
      staffId: string;
      changes: { email: string; phone: string; location: string; status: StaffStatus };
    }>(),
    'Add Calendar Entry': props<{ staffId: string; entry: StaffCalendarEntry }>(),
    'Update Calendar Entry': props<{ staffId: string; entry: StaffCalendarEntry }>(),
    'Delete Calendar Entry': props<{ staffId: string; entryId: string }>(),
  },
});
