# Angular 2 SPA Web API - Explanation

### Configuring the ASP.NET Core Web API & IdentityServer4
Why should you use a service like IdentityServer4 for _Resource Owner Password Credentials grant_ (ROPC) in ASP.NET Core?
Sure, it would be possible to implement it, as in this very useful guide: [ASP.NET Core Token Authentication Guide](https://stormpath.com/blog/token-authentication-asp-net-core).
Because it allows you to scale your application.

Let's see what the _Config.cs_ file contains for configuring IdentityServer4. The following is the identification of our client app:
```C#
// Clients want to access resources.
public static IEnumerable<Client> GetClients()
{
    // Clients credentials.
    return new List<Client>
    {
        // http://docs.identityserver.io/en/dev/reference/client.html.
        new Client
        {
            ClientId = "Angular2SPA",
            AllowedGrantTypes = GrantTypes.ResourceOwnerPassword, // Resource Owner Password Credential grant.
            AllowAccessTokensViaBrowser = true,
            RequireClientSecret = false, // This client does not need a secret to request tokens from the token endpoint.

            AccessTokenLifetime = 900, // Lifetime of access token in seconds.

            AllowedScopes = new List<string>
            {
                "WebAPI",
                StandardScopes.OfflineAccess.Name, // "offline_access" for refresh tokens.
                StandardScopes.OpenId.Name, // "openid" for UserInfo endpoint.
                StandardScopes.Profile.Name,
                StandardScopes.Roles.Name
            }
        }
    };
}
```
As you can see, you can add other clients with their own configuration.
Our Angular 2 app, identified as _Angular2SPA_:
- uses _ROPC_;
- doesn't use a _secret_ key: in a client application it would be useless because visible;
- has an _access token_ for 15 minutes, then need to refresh the token;
- can access to the _scopes_: in this case our Web API, called with a lot of imagination _WebAPI_, the _OfflineAccess_ for refresh token 
and _OpenId_ to access to the user's info.
```C#
// Scopes define the resources in the system.
public static IEnumerable<Scope> GetScopes()
{
    // Each scope must be in the params when the access token is request. See config.ts in the client app.
    return new List<Scope>
    {
        new Scope
        {
            Name = "WebAPI",
            Description = "Web API for the Angular 2 SPA",

            Type = ScopeType.Resource, // Access token is for APIs.

            // Defines which user claims will be included in the access token
            // when this scope gets requested.
            // We include role claims because we need them to access to the resources.
            Claims = new List<ScopeClaim>
            {
                new ScopeClaim("role")
            }
        },
        StandardScopes.OfflineAccess, // For refresh token.
        StandardScopes.OpenId, // For UserInfo endpoint: https://identityserver4.readthedocs.io/en/release/endpoints/userinfo.html
        StandardScopes.Profile,
        StandardScopes.Roles
    };
}
```
Note that we can define which user claims will be included in the access token.

Because our Web API is in the same project, in _Configure_ method of _Startup.cs_ file, 
we add the authentication middleware:
```C#
// IdentityServer4.AccessTokenValidation: authentication middleware for the API.
app.UseIdentityServerAuthentication(new IdentityServerAuthenticationOptions
{
    Authority = "http://localhost:5000/",
    ScopeName = "WebAPI",

    RequireHttpsMetadata = false
});
```
We complete the configuration by adding IdentityServer in _ConfigureServices_ method:
```C#
// Adds IdentityServer.
services.AddIdentityServer()
	.AddTemporarySigningCredential()
    .AddInMemoryScopes(Config.GetScopes())
    .AddInMemoryClients(Config.GetClients())
    .AddAspNetIdentity<ApplicationUser>(); // IdentityServer4.AspNetIdentity.
```
The extension method _AddAspNetIdentity_ to use the ASP.NET Identity requires another setting:
```C#
// Adds IdentityServer.
app.UseIdentityServer();
```
Now we can add related services: Identity and for simplicity SQLite. 
```C#
// Identity & SQLite.
services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(Configuration.GetConnectionString("DefaultConnection")));

services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();
```
and
```C#
// Adds Identity.
app.UseIdentity();
```
Also we define the policy of access to the Web Api controllers. 
In our sample, we create two policies:
- _Manage Account_ only for _administrator_ role;
- _Access Resources_ for _administrator_ role and for _user_ role.
```C#
// Claims-Based Authorization: role claims.
services.AddAuthorization(options =>
{
    // Policy for dashboard: only administrator role.
    options.AddPolicy("Manage Accounts", policy => policy.RequireClaim("role", "administrator"));
    // Policy for resources: user or administrator role. 
    options.AddPolicy("Access Resources", policyBuilder => policyBuilder.RequireAssertion(
            context => context.User.HasClaim(claim => (claim.Type == "role" && claim.Value == "user")
                || (claim.Type == "role" && claim.Value == "administrator"))
        )
    );
});
```
We add the authorization to the _Identity_ controller, which is used by the dashboard:
```C#
[Route("api/[controller]")]
[Authorize(Policy = "Manage Accounts")] // Authorization policy for this API.
public class IdentityController : Controller
...
```
and to _Values_ controller, that returns the resources for the authenticated users:
```C#
[Route("api/[controller]")]
[Authorize(Policy = "Access Resources")] // Authorization policy for this API.
public class ValuesController : Controller
...
```
Remember: when we have defined our _scope_, we have included the _role_ claim to allow the client application to know the user's role.

Finally, we set the startup on the entry point of the client application:
```C#
// Microsoft.AspNetCore.StaticFiles: API for starting the application from wwwroot.
// Uses default files as index.html.
app.UseDefaultFiles();
// Uses static file for the current path.
app.UseStaticFiles();
```

### Understanding how it works
It's important to understand and observe how the authentication and authorization services work, 
in order to implement the client app.

If you debug the app and navigate the browers to:

`http://localhost:5000/.well-known/openid-configuration`

you should see the so-called discovery document. 
The discovery endpoint can be used to retrieve metadata about IdentityServer.
For an authentication, we need to send the request at the `token_endpoint`:

`http://localhost:5000/connect/token`

For example, you can use [Postman](https://www.getpostman.com/) as client to send this POST request:
```
POST /connect/token HTTP/1.1
Host: localhost:5000
Content-Type: application/x-www-form-urlencoded

client_id=Angular2SPA&grant_type=password&username=admin%40gmail.com&password=Admin01*&scope=WebAPI+offline_access+openid+profile+roles
```
Note the _Content-Type_ as _x-www-form-urlencoded_, and parameters provided in the _body_. This is the response:
```Json
{
    "access_token": "eyJhbGci...",
    "expires_in": 900,
    "token_type": "Bearer",
    "refresh_token": "5007bc4b..."
}
```
The user has been authenticated, and he has an _access token_ that will expire in 900 seconds, but he has also a _refresh token_.
You can use a tool like [JSON Web Token](https://www.jsonwebtoken.io/) to decode the JWT and see the payload (with our _scope claims_):
```Json
{
 "nbf": 1480712377,
 "exp": 1480713277,
 "iss": "http://localhost:5000",
 "aud": "http://localhost:5000/resources",
 "client_id": "Angular2SPA",
 "sub": "c0bb2220-8c99-46dc-ad39-b707f37f047f",
 "auth_time": 1480712377,
 "idp": "local",
 "role": "administrator",
 "scope": [
  "offline_access",
  "openid",
  "profile",
  "roles",
  "WebAPI"
 ],
 "amr": [
  "pwd"
 ]
}
```
Now we can send a GET request to our Web API in this way:
```
GET /api/values HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJhbGci...
```
This request contains a header parameter named _Authorization_ and its value is the bearer token. The response:
```Json
[
    "value1",
    "value2"
]
```
And when, past the 15 minutes, the token expires? The user can no longer access resources. 
You can ask him to sign in again, or handle a refresh token strategy: to get a new access token, 
you can send a POST request, with `grant_type` set to `refresh_token` and `refresh token` as parameters:
```
POST /connect/token HTTP/1.1
Host: localhost:5000
Content-Type: application/x-www-form-urlencoded

client_id=Angular2SPA&grant_type=refresh_token&refresh_token=5007bc4b...
```

### Implementing the Angular 2 SPA
Ok, how do we transform the requests done via Postman in an Angular 2 app?

In this sample, to send unauthenticated requests for signing in and signing up the user, we use the Angular 2 _http_ module, 
as in _AuthenticationService_ class:
```TypeScript
/**
 * Tries to sign in the user.
 *
 * @param username
 * @param password
 * @return The user's data
 */
public signin(username: string, password: string): Observable<any> {

    // Token endpoint & params.
    let tokenEndpoint: string = Config.TOKEN_ENDPOINT;

    let params: any = {
        client_id: Config.CLIENT_ID,
        grant_type: Config.GRANT_TYPE,
        username: username,
        password: password,
        scope: Config.SCOPE
    };

    // Encodes the parameters.
    let body: string = this.encodeParams(params);

    this.authTime = new Date().valueOf();

    return this.http.post(tokenEndpoint, body, this.options)
        .map((res: Response) => {

            let body: any = res.json();

            // Sign in successful if there's an access token in the response.
            if (typeof body.access_token !== 'undefined') {

                // Stores access token & refresh token.
                this.store(body);
                // Gets user info.
                this.userInfo();

            }

        }).catch((error: any) => {

            // Error on post request.
            return Observable.throw(error);

        });

}
```
We send a request to _UserInfo_ endpoint to get the user's data 
using angular2-jwt library, that builds for us the header with the authorization token:
```TypeScript
/**
 * Calls UserInfo endpoint to retrieve user's data.
 */
public userInfo() {

    let token: string = Helpers.getToken('id_token');

    if (token != null && tokenNotExpired()) {
        this.authHttp.get(Config.USERINFO_ENDPOINT)
            .subscribe(
            (res: any) => {

                this.user = res.json();

            },
            (error: any) => {

                console.log(error);

            });
    }

};
```
In this example, we use a scheduler to request a new _access token_ before it expires through the _refresh token_:
```TypeScript
/**
 * Optional strategy for refresh token through a scheduler.
 *
 * It will schedule a refresh at the appropriate time.
 */
public scheduleRefresh() {

    let source = this.authHttp.tokenStream.flatMap(
        (token: string) => {

            let delay: number = this.expiresIn - this.offsetSeconds * 1000;

            return Observable.interval(delay);

        });

    this.refreshSubscription = source.subscribe(() => {
        this.getNewToken().subscribe(
            () => { /*ok*/ },
            (error: any) => { this.unscheduleRefresh(); }
        );
    });

}

/**
 * Case when the user comes back to the app after closing it.
 */
public startupTokenRefresh() {

    // If the user is authenticated, uses the token stream
    // provided by angular2-jwt and flatMap the token.
    if (tokenNotExpired()) {

        let source = this.authHttp.tokenStream.flatMap(
            (token: string) => {
                let now: number = new Date().valueOf();
                let exp: number = Helpers.getExp();
                let delay: number = exp - now - this.offsetSeconds * 1000;

                // Uses the delay in a timer to run the refresh at the proper time. 
                return Observable.timer(delay);
            });

        // Once the delay time from above is reached, gets a new JWT and schedules additional refreshes.
        source.subscribe(() => {
            this.getNewToken().subscribe(
                () => {
                    this.scheduleRefresh();
                },
                (error: any) => { console.log(error); }
            );
        });

    }

}

/**
 * Unsubscribes from the scheduling of the refresh token.
 */
public unscheduleRefresh() {

    if (this.refreshSubscription) {
        this.refreshSubscription.unsubscribe();
    }

}

/**
 * Tries to get a new token using refresh token.
 */
public getNewToken(): Observable<any> {

    let refreshToken: string = Helpers.getToken('refresh_token');

    // Token endpoint & params.
    let tokenEndpoint: string = Config.TOKEN_ENDPOINT;

    let params: any = {
        client_id: Config.CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken
    };

    // Encodes the parameters.
    let body: string = this.encodeParams(params);

    this.authTime = new Date().valueOf();

    return this.http.post(tokenEndpoint, body, this.options)
        .map((res: Response) => {

            let body: any = res.json();

            // Successful if there's an access token in the response.
            if (typeof body.access_token !== 'undefined') {

                // Stores access token & refresh token.
                this.store(body);

            }

        }).catch((error: any) => {

            // Error on post request.
            return Observable.throw(error);

        });

}
```

To send authenticated requests, as in _ResourcesComponent_ class, we still use angular2-jwt library:
```TypeScript
// Sends an authenticated request.
this.authHttp.get("/api/values")
    .subscribe(
    (res: any) => {

        this.values = res.json();

    },
    (error: any) => {

        console.log(error);

    });
```

### Building the Angular 2 app with AoT compilation & webpack
For production, we build the Angular 2 app through [ngc compiler](https://angular.io/docs/ts/latest/cookbook/aot-compiler.html) & webpack. 
To do this, after the AoT compilation, in _webpack.config.js_ file we set as entry point _main-aot.ts_:
```JavaScript
// In production mode, we use AoT compilation & minification.
module.exports = {
    entry: {
        'app-aot': './app/main-aot.js'
    },
	...
```
and as output the _wwwroot_ folder (as set in _Startup.cs_):
```JavaScript
output: {
    path: "./wwwroot/",
    filename: "dist/[name].bundle.js",
    chunkFilename: 'dist/[name].chunk.js'
},
```
Finally, we ask webpack to insert the script of the bundle in our _index.html_:
```JavaScript
// Adds script for the bundle in index.html.
new HtmlWebpackPlugin({
    filename: 'index.html',
    inject: 'body',
    template: 'app/index.html'
})
```
