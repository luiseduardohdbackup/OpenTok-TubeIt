<?php

	require('Pusher.php');
	
	$channelName = $_REQUEST['channel'];
	$userID =  $_REQUEST['user_id'];
	$time = $_REQUEST['time'];
	$videoID = $_REQUEST['video_id'];
	$array['videoID'] = $videoID;
    $array['time'] = $time;    
    $array['connectionID'] = $userID;

    $pusher = PusherInstance::get_pusher();
    $pusher->trigger($channelName, 'video_play', $array, true);
    
?>