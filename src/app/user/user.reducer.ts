import { createReducer, on } from '@ngrx/store';

import * as UserActions from './user.actions';
import { UserProfile } from './user.service';

export const userFeatureKey = 'user';

export interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export const initialUserState: UserState = {
  profile: null,
  loading: false,
  error: null,
};

export const userReducer = createReducer(
  initialUserState,
  on(UserActions.loadProfile, (state): UserState => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(UserActions.loadProfileSuccess, (state, { profile }): UserState => ({
    ...state,
    profile,
    loading: false,
    error: null,
  })),
  on(UserActions.loadProfileFailure, (state, { error }): UserState => ({
    ...state,
    loading: false,
    error,
  }))
);
