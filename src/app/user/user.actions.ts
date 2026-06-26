import { createAction, props } from '@ngrx/store';

import { UserProfile } from './user.service';

export const loadProfile = createAction('[User] Load Profile');

export const loadProfileSuccess = createAction(
  '[User] Load Profile Success',
  props<{ profile: UserProfile }>()
);

export const loadProfileFailure = createAction(
  '[User] Load Profile Failure',
  props<{ error: string }>()
);
