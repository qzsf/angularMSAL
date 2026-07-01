import { Routes } from '@angular/router';
import { StaffComponent } from './staff/staff.component';
import { StaffCalendarComponent } from './staff/staff-calendar/staff-calendar.component';

export const routes: Routes = [
  { path: '', component: StaffComponent },
  { path: 'staff-calendar', component: StaffCalendarComponent },
];
