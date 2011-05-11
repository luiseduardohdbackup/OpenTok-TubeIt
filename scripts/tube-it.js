// var baseURL = "http://www.randytroppmann.com/tube-it/" //// NOTE: initialization of this property moved to index.html
var maxParticipants = 7;			// max participants 
var theSessionId; 					// TokBox SessionID TODO: hook up to serverside API to make this dynamic. 1922f048b6cf0b1972819be108df8c5a9fd937a5
var isRoomCreator = true;			// Flag to used in certain async processes
var userNames = new Array();		// asscoiative array: key is connectionId
var sessionToken = "";				// used for TokBox session.connect
var theSession = null;				// TokBox session object
var thePublisher = null;			// TokBox publisher object
var myConnectionId;					// TokBox generated connection ID for browser instance
var participants = 0;				// Number of paticipants in the call
var watchers = 0;					// Number of users watching but not participating
var debug = false; 					// ToxBox event alerting
var $modal1;						// Reference to modal dialog that appears on startup
var $modalConnecting;				// Reference to a modal dialog that states the app is connecting
var isPublishing = false;			// Is browser instance publishing video stream through 
var localUserName = "Tube-it-dude";	// This is captured in $modal1
var clipboard = null;				// ZeroClipboard reference - see initialize()
var PUBLISHER_WIDTH = 160;			// video widget dimension
var PUBLISHER_HEIGHT = 120;			// video widget dimension
var SUBSCRIBER_WIDTH = 160;			// video widget dimension
var SUBSCRIBER_HEIGHT = 120;		// video widget dimension
var joinButton; 					// reference to the top right Join Button container
var roomURLInput;					// reference to the input control holding the room URL
var copyURLButtonRef;				// reference to the copy URL button
var overColorString = "#ae409f";	// mouse over color for buttons 
var upColorString = "#A5258D";		// default color for buttons
var downColorString = "#3578A5";	// mouse down color for buttons
var copyToClipBoardSWF;				// reference to swf helper used to copy URL to clipboard
//// YOUTUBE PLAYER properties
var tubeItPlayer;					// reference to youtube video player
var ytPlayerInitData;				// gets populated from player ready callback (not working ATM)
//var ytVideoID = "kpai3vZi-vs";	// current youtube video id: 11 characters //// NOTE: initialization of this property moved to index.html
var ytVideoIdInput;					// reference to youtube URL input control
var userEnteredURL;					// this is used to capture the URL from the startup Modal dialog
var isChromeless = false;			// parameter used in YouTube player initialization
var ytPlayerStarted = false;		// this flag is used to prevent initial YouTube pause notifications from being broadcasted
var sendingPlayerStateChangeSignal = false; // this flag prevents user from reacting to his own notification
var aboutToTogglePlay = false;		// this flag prevents the user from reacting to his own play state change event
var isVideoOwner = true;			// if a person in the room changes the video, they now own it, and therefore their pause play events are broadcasted to everyone
var hasControlString = " (has control)"; // this string is appended to the appopriate username label in the view
//// custom web font properties
var myfont_webfont_test = false;
var woffEnabled = true; 			//change this to false if you're having trouble with WOFFs
//var customPath = "fonts";
//// TokBox stream container pool 
var	activeStreamContainers = new Array();//associative array with connectionId as the key
var availableStreamContainers = new Array();
var localUserStreamContainerObj;


//// Begin other initilization when jquery says everything is ready
$(document).ready(initialize);






/***************************
  INITIALIZE METHODS
***************************/
function initialize() {
	showConnectingModal();
	joinButton = $("#joinButton").get(0);
	tubeItPlayer = $("#ytVideoPlayer").get(0);
	ytVideoIdInput = $("#ytVideoURL").get(0);
	roomURLInput = $("#roomURL").get(0);
	copyURLButtonRef = $("#copyURLButton").get(0);
	
	// INITIALIZE clipboad copy stuff
	swfobject.embedSWF("scripts/copytoclipboard.swf", "copyToClipboardSWF", "42", "30", "9.0.0", "expressInstall.swf", null, {menu: "false", allowscriptaccess:"always", wmode:"transparent"}, {id:"copyToSWF"});

	// INITIALIZE the stream container pool
	availableStreamContainers.push({index:1, stream:$("#stream_1").get(0), label:$("#stream_name_1").get(0)});
	availableStreamContainers.push({index:2, stream:$("#stream_2").get(0), label:$("#stream_name_2").get(0)});
	availableStreamContainers.push({index:3, stream:$("#stream_3").get(0), label:$("#stream_name_3").get(0)});
	availableStreamContainers.push({index:4, stream:$("#stream_4").get(0), label:$("#stream_name_4").get(0)});
	availableStreamContainers.push({index:5, stream:$("#stream_5").get(0), label:$("#stream_name_5").get(0)});
	availableStreamContainers.push({index:6, stream:$("#stream_6").get(0), label:$("#stream_name_6").get(0)});
	availableStreamContainers.push({index:7, stream:$("#stream_7").get(0), label:$("#stream_name_7").get(0)});
	availableStreamContainers.push({index:8, stream:$("#stream_8").get(0), label:$("#stream_name_8").get(0)});
	//availableStreamContainers.push({index:9, stream:$("#stream_9").get(0), label:$("#stream_name_9").get(0)});
	//availableStreamContainers.push({index:10, stream:$("#stream_10").get(0), label:$("#stream_name_10").get(0)});

	if (getQueryVariable("id")){
		//// if the query string variable is populated the owner of this instance is not
		//// the original owner of this room.
		theSessionId = getQueryVariable("id");
		isRoomCreator = false;
		isVideoOwner = false;
	}
	
	//// Initialize youtube player
	var ytParamaters = { allowScriptAccess: "always", wmode:"transparent" };
	var ytAttributes = { id: "ytVideoPlayer"};
	swfobject.embedSWF("http://www.youtube.com/e/" + ytVideoID + "?enablejsapi=1&playerapiid=ytplayer","ytVideoPlayerContainer", "640", "390", "8", "scripts/expressinstall.swf", null, ytParamaters, ytAttributes);

	//// FETCH TokBox Token
	$.post(baseURL + "php/GetSession.php", {sessionId:theSessionId},
   		function(data){
   			try{
   				theSessionId = data.sessionId;
   				sessionToken = data.token;
   				initializeTB();
   			}
   			catch(e){
   				alert("OpenTok failed to initialize");
   			}
   		}, "json");	 		
}

function initializeTB(){
	//// TokBox initialization
	if (TB.checkSystemRequirements() != TB.HAS_REQUIREMENTS) {
		alert("Minimum System Requirements not met!");
	}
	theSession = TB.initSession(theSessionId);
	TB.addEventListener("exception", exceptionHandler);
	theSession.addEventListener("sessionConnected", sessionConnectedHandler);
	theSession.addEventListener("connectionCreated", connectionCreatedHandler);
	theSession.addEventListener("connectionDestroyed", connectionDestroyedHandler);
	theSession.addEventListener("streamCreated", streamCreatedHandler);
	theSession.addEventListener("streamDestroyed", streamDestroyedHandler);		
	// Connect to the session
	theSession.connect(thePartnerKey, sessionToken);
	setShareURL();
	initializePusher(theSessionId);
}










/***************************
  YOUTUBE PLAYER METHODS
***************************/
function onYouTubePlayerReady(data){
	ytPlayerInitData = data;
	if (getQueryVariable("v")){		 
		loadVideoByID(getQueryVariable("v"));
	}
	tubeItPlayer = $("#ytVideoPlayer").get(0);
	tubeItPlayer.addEventListener("onStateChange", "onytPlayerStateChange");
}
function setVideoOwnershipByConnectionID(p_connectionID){
	isVideoOwner = (myConnectionId == p_connectionID);
	//// reset all the labels
	for (var id in activeStreamContainers){
		//// first need to strip out hasControlString if present
		var username = activeStreamContainers[id].userName;
		if (username.indexOf(hasControlString) >= 0 ) activeStreamContainers[id].userName = username.substr(0,username.indexOf(hasControlString));
		//// second reset labels in the view
		activeStreamContainers[id].label.innerHTML = activeStreamContainers[id].userName;
	}
	//// finally concatenate the hasControlString to the video owner 
	activeStreamContainers[p_connectionID].label.innerHTML = activeStreamContainers[p_connectionID].userName + hasControlString;
}


function handleLoadVideoClick(){
	loadVideoByInput(ytVideoIdInput.value);
	sendNewVideoNotification(ytVideoID);
	setVideoOwnershipByConnectionID(myConnectionId);
}
function loadVideoByInput(p_string){
	var link = p_string;
	var vId;
	if (link.toLowerCase().indexOf("http://") < 0 && link.length == 11) vId = link;
	else vId = link.substr(link.indexOf("v=") + 2, 11);
	loadVideoByID(vId);
}

function loadVideoByID(p_id){	
	if (!tubeItPlayer){
		tubeItPlayer = $("#ytVideoPlayer").get(0);
		tubeItPlayer.addEventListener("onStateChange", "onytPlayerStateChange");
	}
	if (p_id != "" && p_id != null){
		ytVideoID = p_id;
		setShareURL();
		setYouTubeURL();
		tubeItPlayer.stopVideo();
		tubeItPlayer.clearVideo()
		tubeItPlayer.loadVideoById(p_id);
		tubeItPlayer.pauseVideo();
	}
}

function onytPlayerStateChange(event){
	/*
		This event is fired whenever the player's state changes. 
		Possible values are:
		unstarted (-1), ended (0), playing (1), paused (2), buffering (3), video cued (5). 
		When the SWF is first loaded it will broadcast an unstarted (-1) event. 
		When the video is cued and ready to play it will broadcast a video cued event (5).
	*/
	if (!isVideoOwner) return; // only the video owner can control playback
	if (event == 1){
		ytPlayerStarted = true; // this is required because the player fires a couple of (2)state changes as it initializes
		sendPlayVideoNotification();
	}
	else if (event == 2){
		if (ytPlayerStarted) sendPauseVideoNotification();
	}
}
function setShareURL(){
	setRoomURL(baseURL + "?id=" + theSessionId + "--" + ytVideoID); 
}
function setYouTubeURL(){
	ytVideoIdInput.value = "http://www.youtube.com/watch?v=" + ytVideoID;
}








/******************************************************************
  COPYTOCLIPBOARD METHODS
******************************************************************/

function onCopyToClipBoardSWFReady(){
	copyToClipBoardSWF = $("#copyToSWF").get(0);
	updateCopyToClipBoardSWF(roomURLInput.value);
}
function updateCopyToClipBoardSWF(p_text){
	if (copyToClipBoardSWF) copyToClipBoardSWF.copyToClipBoard(p_text);
}			
function setRoomURL(p_text){
	roomURLInput.value = p_text;
	updateCopyToClipBoardSWF(p_text)
}







/******************************************************************
  WEBSOCKET METHODS
  for talking to all the others in the room
   At this time using pusherapp.com which uses a serverside helper
******************************************************************/
function initializePusher(channelID){
	// Enable pusher logging - don't include this in production
/*
    Pusher.log = function() {
      if (window.console) window.console.log.apply(window.console, arguments);
    };
*/
    // Flash fallback logging - don't include this in production    
    WEB_SOCKET_DEBUG = true;
    
	var pusher = new Pusher('834d569c168d6b1f8d98');
    var channel = pusher.subscribe(channelID);
    channel.bind('video_id_change', handleWSNewVideoNotification );
    channel.bind('video_play', handleWSPlayNotification );
    channel.bind('video_pause', handleWSPauseNotification );

}

function sendNewVideoNotification(){
	$.post(baseURL + "php/NotifyVideoChange.php", {channel:theSessionId, video_id:ytVideoID, user_id:myConnectionId});	
}

function sendPlayVideoNotification(){
	$.post(baseURL + "php/NotifyVideoPlay.php", {channel:theSessionId, user_id:myConnectionId, time:tubeItPlayer.getCurrentTime().toString(), video_id:ytVideoID});	
}

function sendPauseVideoNotification(){
	$.post(baseURL + "php/NotifyVideoPause.php", {channel:theSessionId, user_id:myConnectionId});	
}

function handleWSNewVideoNotification(data){
	if (data.connectionID != myConnectionId){
		loadVideoByID(data.videoID);
		setVideoOwnershipByConnectionID(data.connectionID);
	}
}


function handleWSPlayNotification(data){
	if (data.connectionID != myConnectionId){
		tubeItPlayer.playVideo();
		tubeItPlayer.seekTo(parseFloat(data.time), true);
	}
}

function handleWSPauseNotification(data){
	tubeItPlayer.pauseVideo();
}







/******************************************************************
  VARIOUS view  and utility methods
******************************************************************/
function onJoinClick(){
	if(!isPublishing && isFull()){
		return;
	}
	else if (isPublishing){
		stopPublishing();
	} 
	else{
		startPublishing();
	} 
}

function updateJoinButton(){
	
	if (isFull() && !isPublishing){
		joinButton.innerHTML = "Full room";
	}
	else if (isPublishing){
		joinButton.innerHTML = "Stop participating";
	}
	else{
		joinButton.innerHTML = "Start participating";
	}

}


function onTweetButtonClick(){
	//// note: the twitter share api does not like adding a second key/value pair, 
	//// so the double dash "--" will be swapped out with and ampersand in getQueryVariable()
	window.open('http://twitter.com/share?url=' + baseURL + '?id=' + theSessionId + '--' + ytVideoID +'&via=tokbox&count=none&text=Come%20and%20join%20the%20viewing%20room!');
}

function isFull(){
	return participants >= maxParticipants;
}


//// METHOD to get query string value based on supplied key
function getQueryVariable(variable) {
	var queryString = window.location.search.substring(1);
	var query = queryString;
	var dashesIndex = queryString.indexOf("--"); //// see onTweetButtonClick as to why we do this
	if (variable.toLowerCase() =="v"){
		if (dashesIndex >=0){
			if (variable.toLowerCase() =="v")  return queryString.substr(dashesIndex + 2, 11);
		}
	}
	query = queryString.substr(0,dashesIndex);
	var vars = query.split("&");
	for (var i=0;i<vars.length;i++) {
		var pair = vars[i].split("=");
			if (pair[0] == variable) return pair[1];
	}
}







/******************************************************************
  MODAL DIALOG methods
******************************************************************/ 
function showJoinCallModal(){
	var modalButtons;
	var wTitle = "Tube it together!";
	var greeting = "Your name: ";
	if (!isPublishing && isFull()){
		modalButtons = { 	"Eavesdrop": function() {$(this).dialog("close");}}
		htmlString = '<p>Sorry, the conversation is full.<br/> But you can still listen in!</p>';
	}
	else if (!isRoomCreator){
		modalButtons = {"Join the conversation":function() {$(this).dialog("close");handleModalJoinClick(); }}
		greeting = "The Tube It screening has already started! <br/><br/>Your name:";
		htmlString = '<p>' + greeting + '</p> <input type="text" id="modalNameInput" value="' + localUserName + '" name="userName" onChange="onModalNameChange(this)" style="width:270px;" />';
	}
	else {
		modalButtons = {"Start a conversation": function() {$(this).dialog("close");handleModalJoinClick(); }}	
		greeting = "Welcome to your private Tube It room! <br/><br/>Your name:";
		htmlString = '<p>' + greeting + '</p> <input type="text" id="modalNameInput" value="' + localUserName + '" name="userName" onChange="onModalNameChange(this)" style="width:270px;" /><p>YouTube URL:</p><input type="text" id="modalYouTubeURLInput" value="" name="youtubeURL" onChange="onModalYouTubeURLChange(this)" style="width:270px;" />';
	}
	
	$modal1 = $('<div></div>')
		.html(htmlString)
		.dialog({
			autoOpen: false,
			modal: true,
			title: wTitle,
			buttons: modalButtons
		});
	//$modal1.dialog({ close: function(event, ui) { $("#videoPlayerHolder").get(0).style.zIndex = "0"; }});
	$modal1.dialog('open');
}

function onModalNameChange(input){
	localUserName = input.value;
}

function onModalYouTubeURLChange(input){
	userEnteredURL = input.value;
	ytVideoIdInput.value = input.value;	
}


function closeModal1(){
	$modal1.dialog('close');
}

function showConnectingModal(){
	$modalConnecting = $('<div></div>')
		.html('<p>Connecting to TokBox server ...</p>')
		.dialog({
			autoOpen: false,
			modal: true
		});

		$modalConnecting.dialog('open');

}

function handleModalJoinClick(){
	loadVideoByInput(ytVideoIdInput.value);
	startPublishing();
	
}







/******************************************************************
  TOKBOX related methods
******************************************************************/

function getStreamContainerObj(connectionId){
	var streamContainerObj;
	if (availableStreamContainers.length > 0){ 
		streamContainerObj = availableStreamContainers.shift();
		streamContainerObj.connectionId = connectionId;
		activeStreamContainers[connectionId] = streamContainerObj;
	}
	return streamContainerObj;	
}

function recycleStreamContainerObj(connectionId){
	var streamConObj = activeStreamContainers[connectionId];
	if (streamConObj){
		availableStreamContainers.unshift(streamConObj);
		streamConObj.connectionId = null;
		streamConObj.label.innerHTML = "disconnected";
		var streamContainer = streamConObj.stream;
		//remove all the children from the stream div container
		while (streamContainer.hasChildNodes()) {
    		streamContainer.removeChild(streamContainer.lastChild);
		}
		delete activeStreamContainers[connectionId];
	}
	else{
		//alert("failed to recycle stream container: " + connectionId);
	}
}



// messages to a Javascript alert box 
function exceptionHandler(e) {
	alert("Exception: "+e.code+"::"+e.message);
}

// Generic function to dump streamEvents to the alert box
function dumpStreams(streams, reason) {
	for (var i=0; i<streams.length; i++) {
		alert("streamID: "+streams[i].streamId + "\n" +
			"connectionId: "+streams[i].connection.connectionId +" \n" +
			"type: "+streams[i].type +"\n" +
			"name: "+streams[i].name +"\n" +
			"reason: "+reason);
	}
}

// Generic function to dump connectionEvents to the alert box
function dumpConnections(connections, reason) {
	for (var i=0; i<connections.length; i++) {
		alert("connectionId: "+connections[i].connectionId +" \n" +
			"reason: "+reason);
	}
}



// Action functions

// Called when user wants to start participating in the call
function startPublishing() {
	if (!isFull()){
		// Starts publishing user local camera and mic
		// as a stream into the session
		var username = localUserName;
		if (isVideoOwner) username += hasControlString;
		var streamContainerObj = getStreamContainerObj(myConnectionId); 
		if (streamContainerObj){
			localUserStreamContainerObj = streamContainerObj;
			isPublishing = true; 
			var parentDiv =  streamContainerObj.stream
			var stubDiv = document.createElement("div");
			stubDiv.id = "tbx_publisher";
			parentDiv.appendChild(stubDiv);
			thePublisher = theSession.publish(stubDiv.id, {width: PUBLISHER_WIDTH, height: PUBLISHER_HEIGHT, name:username});
			updateStatusText("Trying to join the call...");
			updateJoinButton(); 
			var labelName = localUserName;
			if (isRoomCreator && isVideoOwner) labelName += hasControlString;
			streamContainerObj.label.innerHTML = labelName; 
			streamContainerObj.userName = localUserName;
		}
	}
}



// Called when user wants to stop participating in the call
function stopPublishing() {
	isPublishing = false;
	if (thePublisher != null) {
		theSession.unpublish(thePublisher);
		thePublisher = null;
	}
	if (localUserStreamContainerObj){
		updateStatusText("Leaving the call...");
		updateJoinButton(); 
		localUserStreamContainerObj.label.innerHTML = "Disconnected"; 
		recycleStreamContainerObj(myConnectionId);
		delete localUserStreamContainerObj;
	}
}

// Called to subscribe to a new stream
function subscribeToStream(session, stream) {
	// Create a div for the subscribe widget to replace
	var streamContainerObj = getStreamContainerObj(stream.connection.connectionId); 
	if (streamContainerObj){
		var parentDiv = streamContainerObj.stream; 
		var stubDiv = document.createElement("div");
		stubDiv.id = "tbx_subscriber_" + stream.streamId;
		parentDiv.appendChild(stubDiv);
		var labelDiv = streamContainerObj.label; 
		labelDiv.innerHTML = stream.name;
		streamContainerObj.userName = stream.name; 
		userNames[stream.connection.connectionId] = stream.name;
		session.subscribe(stream, stubDiv.id, {width: SUBSCRIBER_WIDTH, height: SUBSCRIBER_HEIGHT});
	}
	participants++;
}

// Called to unsubscribe from an existing stream
function unsubscribeFromStream(session, stream) {
	var subscribers = session.getSubscribersForStream(stream);

	for (var i=0; i<subscribers.length; i++) {
		session.unsubscribe(subscribers[i]);
		participants--;
	}
}

// Called to update watcher / participant counts on screen
function updateCountDisplays() {
	updateJoinButton(); 
}


// TOKBOX Handler functions
function sessionConnectedHandler(e) {
	// Note that we are included in connectionEvents
	// We can know which one is us by comparing to e.target.connection.connectionId
	
	myConnectionId = e.target.connection.connectionId;			
	var streamConnectionIds = {};
	var streamConnections = 0; // Number of connections with a stream
	if (debug) {
		alert("sessionConnectedHandler");
		dumpConnections(e.connections, "");
		dumpStreams(e.streams, "");
	}

	// Now possible to join a call

	updateStatusText("You are watching the call");

	// Display streams on screen
	for (var i=0; i<e.streams.length; i++) {
		subscribeToStream(e.target, e.streams[i]);
		// Track unique connectionIds

		if (!streamConnectionIds.hasOwnProperty(e.streams[i].connection.connectionId)) {
			streamConnectionIds[e.streams[i].connection.connectionId] = true;
			streamConnections++;
		}
	}
	watchers = e.connections.length - streamConnections;
	updateCountDisplays();
	$modalConnecting.dialog('close'); 
	showJoinCallModal(); 
}


function connectionCreatedHandler(e) {
	// Note that we will do not get a connectionCreated
	// event for ourselves when we connect - that case
	// is handled by the sessionConnected event

	if (debug) {
		alert("connectionCreatedHandler");
		dumpConnections(e.connections, "");
	}
	watchers += e.connections.length;
	updateCountDisplays();
}


function connectionDestroyedHandler(e) {
	if (debug) {
		alert("connectionDestroyedHandler");
		dumpConnections(e.connections, e.reason);
	}
	watchers -= e.connections.length;
	updateCountDisplays();
}





function streamCreatedHandler(e) {
	if (debug) {
		alert("streamCreatedHandler");
		dumpStreams(e.streams, "");
	}
	// Display streams on screen.  Note that
	// we will get a streamCreated event for ourselves
	// when we successfully start publishing
	for (var i=0; i<e.streams.length; i++) {
		var conenctionID = e.streams[i].connection.connectionId; 
		if (e.streams[i].connection.connectionId != e.target.connection.connectionId) {
			subscribeToStream(e.target, e.streams[i]);
			watchers--;
		} else {
			// Our publisher just started streaming
			// Update status, controls and counts
			updateStatusText("You are participating in the call");
			participants++;
			watchers--;
		}
	}
	updateCountDisplays();
}




function streamDestroyedHandler(e) {
	if (debug) {
		alert("streamDestroyedHandler");
		dumpStreams(e.streams, e.reason);
	}
	// Remove streams from screen.  Note that
	// we will get a streamDestroyed event for ourselves
	// when we successfully stop publishing

	for (var i=0; i<e.streams.length; i++) {
		if (e.streams[i].connection.connectionId != e.target.connection.connectionId) {
			unsubscribeFromStream(e.target, e.streams[i]);
			recycleStreamContainerObj(e.streams[i].connection.connectionId); 
			watchers++;
		} else {
			// Our publisher just stopped streaming
			// Update status, controls and counts
			updateStatusText("You are watching the call");
			participants--;
			watchers++;
		}
	}

	updateCountDisplays();
}

function updateStatusText(p_status){
	//try { document.getElementById("status").innerHTML = p_status; }
	//catch(e){}
}










