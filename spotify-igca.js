/**
 * Spotify implicit grant client authentication
 *
 * Utility for obtaining Access Token using implicit grant flow.
 * See https://developer.spotify.com/web-api/authorization-guide/
 *
 * Usage pattern:
 * 1)  Construct a SpotifyIGCA instance using a clientID and [optional] scopes.
 * 2)  Call the init() method to determine whether auth info is available.
 * 3a) If init() returns false, create a button or link on your page to call
 *     the reAuth() method.  This will perform a redirect to the auth page.
 * 3b) If the init() method returns true, you can now use getAccessToken().
 *
 * @param {String} clientID client ID
 * @param {Array} scopes array of scope strings
 */
var SpotifyIGCA = function(clientID, scopes){
	this.clientID = clientID;
	this.scopes = typeof scopes !== "object" ? [] : scopes;
	this.ready = false;

	//generate state value if none exits
	this.stateKey = window.localStorage.getItem("igca_state_key");
	if (this.stateKey === null) {
		this.invalidateState();
	}
};
SpotifyIGCA.DEBUG = true; //enables logging

SpotifyIGCA.prototype.getAccessToken = function() {
	if (this.ready) return this.accessToken;
	return null;
};

/**
 * Checks for existing auth info, returns true if so.
 * If this returns false, one should use SpotifyIGCA.prototype.reAuth()
 * @returns {Boolean} whether token was found
 */
SpotifyIGCA.prototype.init = function() {
	if (window.location.hash.indexOf("access_token") === 1) {
		//the page has received auth info, handle it
		if (this.parseHash(window.location.hash.substring(1))) {
			this.ready = true;
			return true;
		}
		//the auth info is invalid
		else {
			SpotifyIGCA.log("Bad auth info, checking for stored token.");
		}
	}

	if (window.localStorage.getItem("igca_access_token") !== null) {
		//there is a stored token, try it.
		if (this.loadStoredToken()) {
			this.ready = true;
			return true;
		}
		//the stored token is invalid
		else {
			SpotifyIGCA.log("Stored token invalid.");
		}
	}

	SpotifyIGCA.log("No stored token, need to reAuth().");
	return false;
};

/**
 * Redirects the user to an authentication page.
 */
SpotifyIGCA.prototype.reAuth = function() {
	//prepare an auth URL to send the user to
	this.invalidateState();
	var redir = window.location.href;
	var hashPos = redir.indexOf("#");
	if (hashPos > 0) redir = redir.substring(0, window.location.href.indexOf("#"));
	var url = SpotifyIGCA.makeQuery("https://accounts.spotify.com/authorize", {
		client_id: this.clientID,
		response_type: "token",
		redirect_uri: redir,
		state: this.stateKey,
		scope: this.scopes.join(" ")
	});

	//bye
	window.location.href = url;
};

/**
 * Accepts a hash string that contains auth info.
 * If this info is valid, it is stored, and authentication is completed.
 * @returns {Boolean} whether data was valid
 */
SpotifyIGCA.prototype.parseHash = function(hashString) {
	//attempt to parse hash into a key->value map data
	var parts = hashString.split("&");
	var data = {};
	parts.forEach(function(part){
		var kv = part.split("=");
		if (kv.length !== 2) return;
		data[kv[0]] = kv[1];
	});

	//check state key
	if (data.state !== this.stateKey) {
		this.invalidateState();
		return false;
	}	

	//check error
	if ("error" in data) {
		SpotifyIGCA.log(data.error);
		return false;
	}

	if ("access_token" in data) {
		//success
		window.localStorage.setItem("igca_access_token", data.access_token);
		window.localStorage.setItem("igca_token_type", data.token_type);

		//record time of expiry
		var expiresOn = Date.now() + parseInt(data.expires_in) * 1000;
		window.localStorage.setItem("igca_expires_on", expiresOn);
		
		window.location.hash = "";
		return this.loadStoredToken();
	}
	else {
		SpotifyIGCA.log("unknown error");
		return false;
	}
};

/**
 * Checks to see if stored token is expired.
 */
SpotifyIGCA.prototype.isExpired = function() {
	if (window.localStorage.getItem("igca_access_token") === null) return true;
	var expiresOn = window.localStorage.getItem("igca_expires_on");
	if (parseInt(expiresOn) <= Date.now()) {
		return true;
	}
	return false;
};

/**
 * Load and check a stored access token.
 * Returns true if successful, false otherwise.
 * @returns {Boolean} success
 */
SpotifyIGCA.prototype.loadStoredToken = function() {
	var token = window.localStorage.getItem("igca_access_token");
	if (token === null) {
		SpotifyIGCA.log("tried to load token, but none found.");
		return false;
	}

	//check for expiration
	if (this.isExpired()) {
		SpotifyIGCA.log("token expired.");
		return false;
	}

	//good to go
	this.accessToken = token;
	return true;
};

/**
 * Regenerates state key.
 * If this is performed before a hash is parsed, the hash data is not accepted.
 * (the state received in the hash must match the stored state.)
 */
SpotifyIGCA.prototype.invalidateState = function() {
	//todo: less janky
	var stateKey = "";
	for (var i=0; i<16; i++) {
		stateKey += String.fromCharCode(Math.floor(Math.random()*26+65));
	}
	window.localStorage.setItem("igca_state_key", stateKey);
	this.stateKey = stateKey;
};

/**
 * Remove the access key from storage, and require reauth.
 */
SpotifyIGCA.prototype.invalidateAuth = function() {
	window.localStorage.removeItem("igca_access_token");
	this.accessToken = null;
	this.ready = false;
};

SpotifyIGCA.log = function(s){
	if (SpotifyIGCA.DEBUG) console.log(s);
};

/**
 * Compile a URL with given query parameters
 * @param {String} url url
 * @param {Object} params a key->value map to convert to GET parameters.
 *        ex: {key1: "val1", key2: "val2"}
 */
SpotifyIGCA.makeQuery = function(url, params) {
	//prepare query
	var p = Object.keys(params).map(function(key){
		var val = params[key];
		return encodeURI(key) + "=" + encodeURI(val);
	}).join("&");
	url = url + "?" + p;
	return url;
};

/**
 * Make an HTTP GET request to the given URL, and call callback when done.
 * @param {String} url url
 * @param {Function} callback complete callback, which accepts a response
 *        parameter.
 * @param {Object} params a key->value map to convert to GET parameters.
 *        ex: {key1: "val1", key2: "val2"}
 */
SpotifyIGCA.httpGet = function(url, callback, params) {
	if (typeof params !== "undefined")
		url = SpotifyIGCA.makeQuery(url, params);

	//send request
	var req = new XMLHttpRequest();
	req.onload = function(){
		callback(req.response);
	};
	req.open("GET", url);
	req.send();
};