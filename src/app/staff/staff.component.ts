import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { StaffActions } from './staff.actions';
import { CalendarEntryType, Staff, StaffCalendarEntry, StaffGroup, StaffStatus } from './staff.models';
import { selectAllStaff, selectSelectedStaff, selectStaffGroups } from './staff.reducer';

interface CalendarDay { date: string; day: string; label: string }
interface MonthDay { date: string; dayNumber: number; inCurrentMonth: boolean }
interface SkillStaffGroup { keySkill: string; members: Staff[] }
type StaffSortKey = 'manual' | 'name' | 'role' | 'status' | 'location';

@Component({
  selector: 'app-staff',
  imports: [CommonModule, DragDropModule, ReactiveFormsModule],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.css',
})
export class StaffComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);

  readonly staff = this.store.selectSignal(selectAllStaff);
  readonly groups = this.store.selectSignal(selectStaffGroups);
  readonly selectedStaff = this.store.selectSignal(selectSelectedStaff);
  readonly searchTerm = signal('');
  readonly workspaceView = signal<'calendar' | 'skills'>('calendar');
  readonly staffSortKey = signal<StaffSortKey>('manual');
  readonly staffSortDirection = signal<'asc' | 'desc'>('asc');
  readonly calendarView = signal<'week' | 'month'>('week');
  readonly calendarScope = signal<'all' | 'personal'>('all');
  readonly calendarDate = signal(new Date());
  readonly calendarEditorOpen = signal(false);
  readonly dateRangeError = signal<string | null>(null);
  readonly editingEntry = signal<StaffCalendarEntry | null>(null);
  readonly calendarDays = computed(() => this.createCalendarDays(this.calendarDate()));
  readonly monthDays = computed(() =>
    this.createMonthDays(this.calendarDate().getFullYear(), this.calendarDate().getMonth())
  );
  readonly federalHolidays = computed(() => {
    const year = this.calendarDate().getFullYear();
    return this.createFederalHolidays([year - 1, year, year + 1]);
  });
  readonly calendarPeriodTitle = computed(() => {
    const date = this.calendarDate();
    if (this.calendarView() === 'month') {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    const days = this.calendarDays();
    const start = this.parseLocalDate(days[0].date);
    const end = this.parseLocalDate(days[6].date);
    const startLabel = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: start.getFullYear() === end.getFullYear() ? undefined : 'numeric',
    });
    const endLabel = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startLabel} - ${endLabel}`;
  });
  readonly connectedGroupIds = computed(() => this.groups().map((group) => group.id));
  readonly filteredStaff = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    return query
      ? this.staff().filter((member) =>
          `${member.firstName} ${member.lastName} ${member.role}`.toLowerCase().includes(query))
      : this.staff();
  });
  readonly skillStaffGroups = computed<SkillStaffGroup[]>(() => {
    const grouped = new Map<string, Staff[]>();
    for (const member of this.filteredStaff()) {
      grouped.set(member.keySkill, [...(grouped.get(member.keySkill) ?? []), member]);
    }

    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([keySkill, members]) => ({
        keySkill,
        members: this.sortSkillMembers(members),
      }));
  });

  readonly detailsForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    location: ['', Validators.required],
    status: this.fb.nonNullable.control<StaffStatus>('Available'),
  });

  readonly calendarForm = this.fb.nonNullable.group({
    date: [this.calendarDays()[0].date, Validators.required],
    endDate: [this.calendarDays()[0].date, Validators.required],
    staffId: ['', Validators.required],
    type: this.fb.nonNullable.control<CalendarEntryType>('availability'),
    title: ['', Validators.required],
    startTime: ['09:00'],
    endTime: ['17:00'],
    notes: [''],
  });

  ngOnInit(): void {
    this.store.dispatch(StaffActions.loadStaff());
    queueMicrotask(() => {
      const member = this.selectedStaff();
      if (member) this.populateDetails(member);
    });
  }

  staffForGroup(groupId: string): Staff[] {
    return this.filteredStaff().filter((member) => member.groupId === groupId);
  }

  selectStaff(member: Staff): void {
    this.store.dispatch(StaffActions.selectStaff({ staffId: member.id }));
    this.calendarScope.set('personal');
    this.populateDetails(member);
    this.clearCalendarForm();
  }

  drop(event: CdkDragDrop<Staff[]>, group: StaffGroup): void {
    const member = event.item.data as Staff;
    this.store.dispatch(StaffActions.moveStaff({
      staffId: member.id, targetGroupId: group.id, targetIndex: event.currentIndex,
    }));
  }

  dropSkillStaff(event: CdkDragDrop<Staff[]>, keySkill: string): void {
    const orderedIds = event.container.data.map((member) => member.id);
    const [movingId] = orderedIds.splice(event.previousIndex, 1);
    orderedIds.splice(event.currentIndex, 0, movingId);
    this.staffSortKey.set('manual');
    this.store.dispatch(StaffActions.reorderSkillStaff({ keySkill, orderedIds }));
  }

  sortStaffBy(key: Exclude<StaffSortKey, 'manual'>): void {
    if (this.staffSortKey() === key) {
      this.staffSortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc');
    } else {
      this.staffSortKey.set(key);
      this.staffSortDirection.set('asc');
    }
  }

  sortIcon(key: Exclude<StaffSortKey, 'manual'>): string {
    if (this.staffSortKey() !== key) return 'bi bi-arrow-down-up';
    return this.staffSortDirection() === 'asc' ? 'bi bi-sort-up' : 'bi bi-sort-down';
  }

  saveDetails(): void {
    const member = this.selectedStaff();
    if (!member || this.detailsForm.invalid) return this.detailsForm.markAllAsTouched();
    this.store.dispatch(StaffActions.updateStaffDetails({
      staffId: member.id, changes: this.detailsForm.getRawValue(),
    }));
  }

  entriesForDay(date: string): StaffCalendarEntry[] {
    return this.selectedStaff()?.calendar.filter((entry) => this.entryOccursOnDate(entry, date)) ?? [];
  }

  staffEntriesForDay(date: string): Array<{ member: Staff; entry: StaffCalendarEntry }> {
    return this.staff().flatMap((member) =>
      member.calendar
        .filter((entry) => this.entryOccursOnDate(entry, date))
        .map((entry) => ({ member, entry }))
    );
  }

  visibleStaffEntriesForDay(date: string): Array<{ member: Staff; entry: StaffCalendarEntry }> {
    const entries = this.staffEntriesForDay(date);
    return this.calendarScope() === 'personal'
      ? entries.filter((item) => item.member.id === this.selectedStaff()?.id)
      : entries;
  }

  holidayForDate(date: string): string | null {
    return this.federalHolidays().get(date) ?? null;
  }

  startEntryForDay(date: string): void {
    this.calendarEditorOpen.set(true);
    this.dateRangeError.set(null);
    this.editingEntry.set(null);
    this.calendarForm.reset({
      date,
      endDate: date,
      staffId: this.selectedStaff()?.id ?? this.staff()[0]?.id ?? '',
      type: 'availability',
      title: '',
      startTime: '09:00',
      endTime: '17:00',
      notes: '',
    });
  }

  editCalendarEntry(entry: StaffCalendarEntry): void {
    this.calendarEditorOpen.set(true);
    this.dateRangeError.set(null);
    this.editingEntry.set(entry);
    this.calendarForm.reset({
      date: entry.date,
      endDate: entry.endDate ?? entry.date,
      staffId: this.selectedStaff()?.id ?? '',
      type: entry.type,
      title: entry.title,
      startTime: entry.startTime ?? '', endTime: entry.endTime ?? '', notes: entry.notes ?? '',
    });
  }

  saveCalendarEntry(): void {
    if (this.calendarForm.invalid) return this.calendarForm.markAllAsTouched();
    const current = this.editingEntry();
    const formValue = this.calendarForm.getRawValue();
    if (formValue.endDate < formValue.date) {
      this.dateRangeError.set('End date must be on or after the start date.');
      return;
    }
    if (!this.rangeIncludesWeekday(formValue.date, formValue.endDate)) {
      this.dateRangeError.set('The selected range contains only weekend days.');
      return;
    }
    this.dateRangeError.set(null);
    const member = this.staff().find((item) => item.id === formValue.staffId);
    if (!member) return;
    const entry: StaffCalendarEntry = {
      id: current?.id ?? `event-${Date.now()}`,
      date: formValue.date,
      endDate: formValue.endDate,
      type: formValue.type,
      title: formValue.title,
      startTime: formValue.startTime,
      endTime: formValue.endTime,
      notes: formValue.notes,
    };
    this.store.dispatch(current
      ? StaffActions.updateCalendarEntry({ staffId: member.id, entry })
      : StaffActions.addCalendarEntry({ staffId: member.id, entry }));

    if (current) {
      this.clearCalendarForm();
    } else {
      this.editingEntry.set(null);
      this.calendarForm.reset({
        ...formValue,
        title: '',
        startTime: '09:00',
        endTime: '17:00',
        notes: '',
      });
    }
  }

  deleteCalendarEntry(entryId: string): void {
    const member = this.selectedStaff();
    if (!member) return;
    this.removeCalendarEntry(member.id, entryId);
    this.clearCalendarForm();
  }

  removeCalendarEntry(staffId: string, entryId: string): void {
    this.store.dispatch(StaffActions.deleteCalendarEntry({ staffId, entryId }));
    if (this.editingEntry()?.id === entryId) {
      this.clearCalendarForm();
    }
  }

  clearCalendarForm(): void {
    this.calendarEditorOpen.set(false);
    this.dateRangeError.set(null);
    this.editingEntry.set(null);
    const date = this.calendarDays()[0].date;
    this.calendarForm.reset({
      date,
      endDate: date,
      staffId: this.selectedStaff()?.id ?? this.staff()[0]?.id ?? '',
      type: 'availability',
      title: '',
      startTime: '09:00',
      endTime: '17:00',
      notes: '',
    });
  }

  previousPeriod(): void {
    this.shiftPeriod(-1);
  }

  nextPeriod(): void {
    this.shiftPeriod(1);
  }

  goToToday(): void {
    this.calendarDate.set(new Date());
  }

  private populateDetails(member: Staff): void {
    this.detailsForm.reset({
      email: member.email, phone: member.phone, location: member.location, status: member.status,
    });
  }

  private createCalendarDays(reference: Date): CalendarDay[] {
    const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
    start.setDate(start.getDate() - start.getDay());

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return {
        date: localDate,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    });
  }

  private createMonthDays(year: number, month: number): MonthDay[] {
    const firstDay = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - firstDay.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return {
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        dayNumber: date.getDate(),
        inCurrentMonth: date.getMonth() === month,
      };
    });
  }

  private shiftPeriod(direction: -1 | 1): void {
    const current = this.calendarDate();
    const next = new Date(current);
    if (this.calendarView() === 'week') {
      next.setDate(next.getDate() + direction * 7);
    } else {
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
    }
    this.calendarDate.set(next);
  }

  private parseLocalDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private createFederalHolidays(years: number[]): Map<string, string> {
    const holidays = new Map<string, string>();

    for (const year of years) {
      this.addFixedHoliday(holidays, year, 0, 1, "New Year's Day");
      this.addHoliday(holidays, this.nthWeekday(year, 0, 1, 3), 'Martin Luther King Jr. Day');
      this.addHoliday(holidays, this.nthWeekday(year, 1, 1, 3), "Washington's Birthday");
      this.addHoliday(holidays, this.lastWeekday(year, 4, 1), 'Memorial Day');
      this.addFixedHoliday(holidays, year, 5, 19, 'Juneteenth National Independence Day');
      this.addFixedHoliday(holidays, year, 6, 4, 'Independence Day');
      this.addHoliday(holidays, this.nthWeekday(year, 8, 1, 1), 'Labor Day');
      this.addHoliday(holidays, this.nthWeekday(year, 9, 1, 2), 'Columbus Day');
      this.addFixedHoliday(holidays, year, 10, 11, 'Veterans Day');
      this.addHoliday(holidays, this.nthWeekday(year, 10, 4, 4), 'Thanksgiving Day');
      this.addFixedHoliday(holidays, year, 11, 25, 'Christmas Day');
    }

    return holidays;
  }

  private addFixedHoliday(
    holidays: Map<string, string>,
    year: number,
    month: number,
    day: number,
    name: string
  ): void {
    const date = new Date(year, month, day);
    this.addHoliday(holidays, date, name);

    if (date.getDay() === 6) {
      const observed = new Date(year, month, day - 1);
      this.addHoliday(holidays, observed, `${name} (observed)`);
    } else if (date.getDay() === 0) {
      const observed = new Date(year, month, day + 1);
      this.addHoliday(holidays, observed, `${name} (observed)`);
    }
  }

  private addHoliday(holidays: Map<string, string>, date: Date, name: string): void {
    holidays.set(this.formatLocalDate(date), name);
  }

  private nthWeekday(
    year: number,
    month: number,
    weekday: number,
    occurrence: number
  ): Date {
    const date = new Date(year, month, 1);
    date.setDate(1 + ((7 + weekday - date.getDay()) % 7) + (occurrence - 1) * 7);
    return date;
  }

  private lastWeekday(year: number, month: number, weekday: number): Date {
    const date = new Date(year, month + 1, 0);
    date.setDate(date.getDate() - ((7 + date.getDay() - weekday) % 7));
    return date;
  }

  private formatLocalDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private entryOccursOnDate(entry: StaffCalendarEntry, date: string): boolean {
    const current = this.parseLocalDate(date);
    if (current.getDay() === 0 || current.getDay() === 6) {
      return false;
    }

    return date >= entry.date && date <= (entry.endDate ?? entry.date);
  }

  private rangeIncludesWeekday(startDate: string, endDate: string): boolean {
    const current = this.parseLocalDate(startDate);
    const end = this.parseLocalDate(endDate);
    while (current <= end) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        return true;
      }
      current.setDate(current.getDate() + 1);
    }
    return false;
  }

  private sortSkillMembers(members: Staff[]): Staff[] {
    const key = this.staffSortKey();
    if (key === 'manual') return members;
    const direction = this.staffSortDirection() === 'asc' ? 1 : -1;
    return [...members].sort((left, right) => {
      const leftValue = key === 'name'
        ? `${left.lastName} ${left.firstName}`
        : left[key];
      const rightValue = key === 'name'
        ? `${right.lastName} ${right.firstName}`
        : right[key];
      return leftValue.localeCompare(rightValue) * direction;
    });
  }
}
