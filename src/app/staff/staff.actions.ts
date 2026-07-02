import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { StaffCalendarEntry, StaffStatus } from './staff.models';

export const StaffActions = createActionGroup({
  source: 'Staff',
  events: {
    'Load Staff': emptyProps(),
    'Select Staff': props<{ staffPin: string }>(),
    'Move Staff': props<{ staffPin: string; targetGroupId: string; targetIndex: number }>(),
    'Reorder Staff List': props<{ orderedPins: string[] }>(),
    'Reorder Skill Staff': props<{ keySkill: string; orderedPins: string[] }>(),
    'Update Staff Details': props<{
      staffPin: string;
      changes: { email: string; phone: string; location: string; status: StaffStatus };
    }>(),
    'Add Calendar Entry': props<{ staffPin: string; entry: StaffCalendarEntry }>(),
    'Update Calendar Entry': props<{ staffPin: string; entry: StaffCalendarEntry }>(),
    'Delete Calendar Entry': props<{ staffPin: string; entryId: string }>(),
  },
});
