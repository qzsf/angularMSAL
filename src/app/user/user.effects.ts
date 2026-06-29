import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of } from 'rxjs';

import * as UserActions from './user.actions';
import { UserService } from './user.service';

@Injectable()
export class UserEffects {
  private readonly actions$ = inject(Actions);
  private readonly userService = inject(UserService);

  loadProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.loadProfile),
      exhaustMap(() =>
        this.userService.loadProfile().pipe(
          map((profile) => UserActions.loadProfileSuccess({ profile })),
          catchError((error: unknown) =>
            of(UserActions.loadProfileFailure({ error: getErrorMessage(error) }))
          )
        )
      )
    )
  );

}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }

  return 'Unable to load user profile.';
}
