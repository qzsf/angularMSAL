import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  BrowserCacheLocation,
  InteractionType,
  IPublicClientApplication,
  PublicClientApplication,
} from '@azure/msal-browser';
import {
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalBroadcastService,
  MsalGuard,
  MsalGuardConfiguration,
  MsalInterceptor,
  MsalInterceptorConfiguration,
  MsalService,
} from '@azure/msal-angular';
import { provideEffects } from '@ngrx/effects';
import { provideStore, Store } from '@ngrx/store';
import { catchError, concatMap, firstValueFrom, map, of } from 'rxjs';

import { routes } from './app.routes';
import * as UserActions from './user/user.actions';
import { UserEffects } from './user/user.effects';
import { userFeatureKey, userReducer } from './user/user.reducer';

const graphMeEndpoint = 'https://graph.microsoft.com/v1.0/me';
const graphScopes = ['User.Read'];

export function msalInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: 'YOUR_AZURE_AD_CLIENT_ID',
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: getBrowserOrigin(),
      postLogoutRedirectUri: getBrowserOrigin(),
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
    },
  });
}

export function msalGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: graphScopes,
    },
  };
}

export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  protectedResourceMap.set(graphMeEndpoint, graphScopes);

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
  };
}

export function initializeUserProfile(): Promise<void> {
  const msalService = inject(MsalService);
  const store = inject(Store);

  return firstValueFrom(
    msalService.initialize().pipe(
      concatMap(() => msalService.handleRedirectObservable()),
      concatMap((result) => {
        const account =
          result?.account ??
          msalService.instance.getActiveAccount() ??
          msalService.instance.getAllAccounts()[0] ??
          null;

        if (account) {
          msalService.instance.setActiveAccount(account);
          store.dispatch(UserActions.loadProfile());
          return of(undefined);
        }

        return msalService.loginRedirect({ scopes: graphScopes }).pipe(map(() => undefined));
      }),
      catchError((error: unknown) => {
        store.dispatch(UserActions.loadProfileFailure({ error: getErrorMessage(error) }));
        return of(undefined);
      })
    )
  );
}

function getBrowserOrigin(): string {
  return typeof window === 'undefined' ? '/' : window.location.origin;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }

  return 'Unable to initialize authentication.';
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideStore({ [userFeatureKey]: userReducer }),
    provideEffects(UserEffects),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true,
    },
    {
      provide: MSAL_INSTANCE,
      useFactory: msalInstanceFactory,
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: msalGuardConfigFactory,
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: msalInterceptorConfigFactory,
    },
    MsalService,
    MsalGuard,
    MsalBroadcastService,
    provideAppInitializer(initializeUserProfile),
  ],
};
