<?PHP

class SessionPropertyConstants {
	const ECHOSUPPRESSION_ENABLED = "echoSuppression.enabled"; //Boolean
	const MULTIPLEXER_NUMOUTPUTSTREAMS = "multiplexer.numOutputStreams"; //Integer
	const MULTIPLEXER_SWITCHTYPE = "multiplexer.switchType"; //Integer
	const MULTIPLEXER_SWITCHTIMEOUT = "multiplexer.switchTimeout"; //Integer
	const MULTIPLEXER_TRANSITIONDURATION = "multiplexer.transitionDuration"; //Integer
}

class OpenTokSDK {
	public $partner_id;
	public $partner_secret;

	const TOKEN_SENTINEL = "T1==";
	const SDK_VERSION = "tbphp-1.0";

	const API_URL = "https://staging.tokbox.com/hl";

	public function __construct($partner_id, $partner_secret) {
		$this->partner_id = $partner_id;
		$this->partner_secret = $partner_secret;
	}

	/** - Generate a token
	 *
	 * $session_id  - If session_id is not blank, this token can only join the call with the specified session_id.
	 * $permissions - A list of permissions that the token has. Some API calls require a permission on the token. These can be found in the documentation on tokens.
	 * $create_time - Timestamp of when the token was created. If NULL, defaults to now.
	 * $expire_time - Optional timestamp to change when the token expires. See documentation on token for details.
	 */
    public function generate_token($session_id='', $permissions="", $create_time=NULL, $expire_time=NULL) {
		if(is_null($create_time))
			$create_time = time();
		if(!is_array($permissions))
			$permissions = split(",", $permissions);
		$permission_list = join("&permissions=", $permissions);

		#TODO: Fix permissions
		$data_string = "session_id=$session_id&create_time=$create_time&permissions=$permission_list";
        if(!is_null($expire_time))
			$data_string .= "&expire_time=$expire_time";

        $sig = $this->_sign_string($data_string, $this->partner_secret);
		$partner_id = $this->partner_id;
		$sdk_version = self::SDK_VERSION;
        return self::TOKEN_SENTINEL . base64_encode("partner_id=$partner_id&sdk_version=$sdk_version&sig=$sig:$data_string");
	}




	/**
	 * Creates a new session.
	 * $ip_passthru - IP address to geolocate the call around.
	 * $session_properties - Optional array, keys are defined in SessionPropertyConstants
	 */
    public function create_session($ip_passthru, $session_properties=array()) {
		$session_properties["location_hint"] = $ip_passthru;
		$session_properties["partner_id"] = $this->partner_id;
		return $this->_do_request("/session/create", $session_properties);
	}

	protected function _sign_string($string, $secret) {
		return hash_hmac("sha1", $string, $secret);
	}


	protected function _do_request($url, $data) {
		$url = self::API_URL . $url;

		$dataString = "";
		foreach($data as $key => $value){
			$value = urlencode($value);
			$dataString .= "$key=$value&";
		}

		$dataString = rtrim($dataString,"&");

		$ch = curl_init();

		$partner_id = $this->partner_id;
		$partner_secret = $this->partner_secret;
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_HTTPHEADER, Array('Content-type: application/x-www-form-urlencoded'));
		curl_setopt($ch, CURLOPT_HTTPHEADER, Array("X-TB-PARTNER-AUTH: $this->partner_id:$this->partner_secret"));
		curl_setopt($ch, CURLOPT_HEADER, 0);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_POST, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $dataString);

		$res = curl_exec($ch);

		curl_close($ch);
		return $res;
	}
}
