/*
 * Copyright (c) 2019, Seqera Labs.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This Source Code Form is "Incompatible With Secondary Licenses", as
 * defined by the Mozilla Public License, v. 2.0.
 */
import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable, of, Subject} from "rxjs";
import {map, tap} from "rxjs/operators";
import {User} from "../entity/user/user";
import {HttpClient} from "@angular/common/http";
import {environment} from "src/environments/environment";
import {UserData} from "../entity/user/user-data";
import {AccessGateResponse} from "../entity/gate";

const authEndpointUrl: string = `${environment.apiUrl}/login`;
const userEndpointUrl: string = `${environment.apiUrl}/user`;
const gateEndpointUrl: string = `${environment.apiUrl}/gate`;

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  user$: Observable<User>;

  private userSubject: BehaviorSubject<User>;

  constructor(private http: HttpClient) {
    this.userSubject = new BehaviorSubject(this.getPersistedUser());
    this.user$ = this.userSubject.asObservable();
  }

  get isUserAuthenticated(): boolean {
    return (this.currentUser != null);
  }

  get currentUser(): User {
    return this.userSubject.value
  }


  auth(email: string, authToken: string): Observable<User> {
    return this.http.post(authEndpointUrl, {username: email, password: authToken}).pipe(
      map((authData: any) => this.retrieveUserFromAuthResponse(authData)),
      tap((user: User) => this.setAuthUser(user))
    );
  }

  private retrieveUserFromAuthResponse(authData: any) {
    let userData: UserData = <UserData> {email: authData.username, jwtAccessToken: authData['access_token'], roles: authData.roles};

    let attributes: any = this.parseJwt(userData.jwtAccessToken);
    userData.id = attributes.id;
    userData.userName = attributes.userName;
    userData.firstName = attributes.firstName;
    userData.lastName = attributes.lastName;
    userData.organization = attributes.organization;
    userData.description = attributes.description;
    userData.avatar = attributes.avatar;
    userData.nfAccessToken = attributes.accessToken;

    return new User(userData);
  }

  private setAuthUser(user: User): void {
    this.persistUser(user);
    this.userSubject.next(user);
  }

  access(email: string): Observable<AccessGateResponse> {
    return this.http.post<AccessGateResponse>(`${gateEndpointUrl}/access`, {email: email})
  }

  update(user: User): Observable<string> {
    return this.http.post(`${userEndpointUrl}/update`, user.data, {responseType: "text"}).pipe(
      map((message: string) => message),
      tap( () => this.setAuthUser(user)),
    );
  }

  delete(): Observable<string> {
    return this.http.delete(`${userEndpointUrl}/delete`, {responseType: "text"}).pipe(
      map((message: string) => message)
    );
  }

  logout(): void {
    this.removeUser();
    this.userSubject.next(null);
  }

  private parseJwt(token: string): any {
    let base64Url = token.split('.')[1];
    let decodedBase64 = decodeURIComponent(atob(base64Url).split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''));

    return JSON.parse(decodedBase64);
  };

  private persistUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user.data));
  }

  private getPersistedUser(): User {
    const userData: UserData = <UserData> JSON.parse(localStorage.getItem('user'));

    return (userData ? new User(userData) : null);
  }

  private removeUser(): void {
    localStorage.removeItem('user');
  }
}
