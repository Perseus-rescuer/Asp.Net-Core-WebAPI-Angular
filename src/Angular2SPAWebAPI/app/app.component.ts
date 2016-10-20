﻿import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { tokenNotExpired } from 'angular2-jwt';

import { AuthenticationService } from './services/authentication.service'

@Component({
    selector: 'app-component',
    templateUrl: 'app.component.html'
})

export class AppComponent {

    constructor(public authenticationService: AuthenticationService, private router: Router) { }

    // Checks if user is signed in (token in not expired).
    get signedIn(): boolean {

        return tokenNotExpired();

    }

    // The user's name.
    get name(): string {

        let user: any = this.authenticationService.getUser();
        return user != null ? user.given_name : "";

    }

    // Checks for administrator user.
    get isAdmin(): boolean {

        let user: any = this.authenticationService.getUser();

        if (user != null) {

            let roles: string[] = user.role;
            return roles.indexOf("administrator") != -1;

        }

        return false;

    }

    signout(): void {

        this.authenticationService.signout();

        this.router.navigate(['/home']);

    }

}
