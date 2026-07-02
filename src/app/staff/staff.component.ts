import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';

import { StaffCalendarComponent } from './staff-calendar/staff-calendar.component';
import { StaffActions } from './staff.actions';
import { Staff } from './staff.models';
import { selectAllStaff } from './staff.reducer';

interface SkillStaffGroup {
  keySkill: string;
  members: Staff[];
}

type StaffSortKey = 'manual' | 'name' | 'role' | 'status' | 'location';

@Component({
  selector: 'app-staff',
  imports: [CommonModule, DragDropModule, StaffCalendarComponent],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.css',
})
export class StaffComponent implements OnInit {
  private readonly store = inject(Store);

  readonly staff = this.store.selectSignal(selectAllStaff);
  readonly workspaceView = signal<'calendar' | 'skills'>('calendar');
  readonly searchTerm = signal('');
  readonly staffSortKey = signal<StaffSortKey>('manual');
  readonly staffSortDirection = signal<'asc' | 'desc'>('asc');

  readonly filteredStaff = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    return query
      ? this.staff().filter((member) =>
          `${member.firstName} ${member.lastName} ${member.role} ${member.keySkill} ${member.skills.join(' ')}`
            .toLowerCase()
            .includes(query)
        )
      : this.staff();
  });

  readonly skillStaffGroups = computed<SkillStaffGroup[]>(() => {
    const grouped = new Map<string, Staff[]>();
    for (const member of this.filteredStaff()) {
      grouped.set(member.keySkill, [...(grouped.get(member.keySkill) ?? []), member]);
    }

    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([keySkill, members]) => ({ keySkill, members: this.sortMembers(members) }));
  });

  ngOnInit(): void {
    this.store.dispatch(StaffActions.loadStaff());
  }

  openStaffCalendar(member: Staff): void {
    this.store.dispatch(StaffActions.selectStaff({ staffPin: member['staff-pin'] }));
    this.workspaceView.set('calendar');
  }

  dropSkillStaff(event: CdkDragDrop<Staff[]>, keySkill: string): void {
    const orderedPins = event.container.data.map((member) => member['staff-pin']);
    const [movingPin] = orderedPins.splice(event.previousIndex, 1);
    orderedPins.splice(event.currentIndex, 0, movingPin);
    this.staffSortKey.set('manual');
    this.store.dispatch(StaffActions.reorderSkillStaff({ keySkill, orderedPins }));
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

  private sortMembers(members: Staff[]): Staff[] {
    const key = this.staffSortKey();
    if (key === 'manual') return members;
    const direction = this.staffSortDirection() === 'asc' ? 1 : -1;
    return [...members].sort((left, right) => {
      const leftValue = key === 'name' ? `${left.lastName} ${left.firstName}` : left[key];
      const rightValue = key === 'name' ? `${right.lastName} ${right.firstName}` : right[key];
      return leftValue.localeCompare(rightValue) * direction;
    });
  }
}
