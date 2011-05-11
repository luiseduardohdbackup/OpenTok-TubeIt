<?php

	require('Pusher.php');
	
	$channelName = $_REQUEST['channel'];
	$userID =  $_REQUEST['user_id'];

    $pusher = PusherInstance::get_pusher();
    $pusher->trigger($channelName, 'video_pause', $userID, true);
    
?>
