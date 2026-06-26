import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface UserProfile {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  mobilePhone?: string;
  officeLocation?: string;
  preferredLanguage?: string;
}

const GRAPH_ME_ENDPOINT = 'https://graph.microsoft.com/v1.0/me';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private readonly http: HttpClient) {}

  loadProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(GRAPH_ME_ENDPOINT);
  }
}
