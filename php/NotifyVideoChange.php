<?php

	require('Pusher.php');
	
	$channelName = $_REQUEST['channel'];
	$videoID = $_REQUEST['video_id'];
	$userID =  $_REQUEST['user_id'];
	
	$array['videoID'] = $videoID;
    $array['connectionID'] = $userID;

    $pusher = PusherInstance::get_pusher();
    $pusher->trigger($channelName, 'video_id_change', $array, true);
    
?>
