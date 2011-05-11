<?php
	
	require_once 'OpenTokSDK.php';
	require_once 'Zend/Json.php';

	$partnerId = 1127; //needs to be replaced
	$partnerSecret = 'ENTER YOUR SECRET HERE';

	$apiObj = new OpenTokSDK($partnerId, $partnerSecret);

	if($_REQUEST['sessionId']) {
		$sessionId = $_REQUEST['sessionId'];
	} else {
		$createSessionString = $apiObj->create_session();
		$createSessionXML = simplexml_load_string($createSessionString, 'SimpleXMLElement', LIBXML_NOCDATA);

		$sessionId = $createSessionXML->Session->session_id;
	}

	$token = $apiObj->generate_token();
	
	$arr = array ('token'=>$token,'sessionId'=>(string)$sessionId);
	echo  Zend_Json::encode($arr);
	
	// need to use Zend library because php is ver 5.1.6	
?>

