# spotify-igca
Small library for client-side Spotify Web API authentication.
Designed for browser-based scripts to perform [implicit grant](https://developer.spotify.com/web-api/authorization-guide/#implicit-grant-flow) authentication.
This library performs only authentication, and provides an [access token](https://developer.spotify.com/web-api/authorization-guide/#introduction) for use with other Web API calls.

See index.html for usage example.

See inline documentation for latest documentation.

## Examples
### Getting an access token
```javascript
var auth = new SpotifyIGCA("<client-id>");
if (auth.init()) {
  var token = auth.getAccessToken();
}
else {
  auth.reAuth();
}
```


### Using with [spotify-web-api-js](https://github.com/jmperez/spotify-web-api-js)
```javascript
var auth = new SpotifyIGCA("<client-id>");
if (auth.init()) {
  var token = auth.getAccessToken();
  var spotify = new SpotifyWebApi();
  spotify.setAccessToken(token);
  //do api calls
}
else {
  auth.reAuth();
}
```


### Requesting scopes
```javascript
var auth = new SpotifyIGCA("<client-id>", ["playlist-read-private", "user-read-birthdate"]);
```


### Forcing authentication
```javascript
var auth = new SpotifyIGCA("<client-id>");
auth.invalidateAuth();
auth.init();
```
