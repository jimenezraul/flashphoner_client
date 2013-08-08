/*
 Copyright (c) 2011 Flashphoner
 All rights reserved. This Code and the accompanying materials
 are made available under the terms of the GNU Public License v2.0
 which accompanies this distribution, and is available at
 http://www.gnu.org/licenses/old-licenses/gpl-2.0.html

 Contributors:
 Flashphoner - initial API and implementation

 This code and accompanying materials also available under LGPL and MPL license for Flashphoner buyers. Other license versions by negatiation. Write us support@flashphoner.com with any questions.
 */

var flashphoner;
var flashphonerLoader;

// One call become two calls during TRANSFER case
// there is why we need at least two kinds of calls here
var holdedCall = null;
var currentCall = null;
// not sure if "callee" is reserved word so I will use callee /Pavel
var callee = '';
var callerLogin = '';
var registerRequired;
var isLogged = false;

var connectingViewBeClosed = false;
var traceEnabled = true;
var intervalId = -1;
var proportion = 0;

var testInviteParameter = {};
testInviteParameter['param1'] = "value1";
testInviteParameter['param2'] = "value2";

var messenger;

// trace log to the console in the demo page
function trace(funcName, param1, param2, param3) {

    var today = new Date();
    // get hours, minutes and seconds
    var hh = today.getHours();
    var mm = today.getMinutes();
    var ss = today.getSeconds();

    // Add '0' if it < 10 to see 14.08.06 instead of 14.6.8
    hh = hh == 0 ? '00' : hh < 10 ? '0' + hh : hh;
    mm = mm == 0 ? '00' : mm < 10 ? '0' + mm : mm;
    ss = ss == 0 ? '00' : ss < 10 ? '0' + ss : ss;

    // set time 
    var time = hh + ':' + mm + ':' + ss;

    var div1 = div2 = '';

    var console = $("#console");
    // Check if console is scrolled down? Or may be you are reading previous messages.
    var isScrolled = (console[0].scrollHeight - console.height() + 1) / (console[0].scrollTop + 1 + 37);

    // Check if we set params and set it ????? instead of 'undefined' if not, also set dividers equal to ', ' 
    if (typeof param1 == 'undefined') {
        param1 = '';
    }
    if (typeof param2 == 'undefined') {
        param2 = '';
    } else {
        var div1 = ', ';
    }
    if (typeof param3 == 'undefined') {
        param3 = '';
    } else {
        var div2 = ', ';
    }

    // Print message to console
    if (traceEnabled) {
        console.append('<grey>' + time + ' - ' + '</grey>' + funcName + '<grey>' + '(' + param1 + div1 + param2 + div2 + param3 + ')' + '</grey>' + '<br>');
    }

    //Autoscroll cosole if you are not reading previous messages
    if (isScrolled < 1) {
        console[0].scrollTop = console[0].scrollHeight;
    }
}

$(document).ready(function () {
    toLogOffState();
    openConnectingView("Loading...", 0);
    flashphonerLoader = new FlashphonerLoader();
// 	openConnectingView("You have old flash player", 0);
//  trace("Download flash player from: http://get.adobe.com/flashplayer/");
});


function login() {
    trace("login");
    connectingViewBeClosed = false;

    if ($("#outbound_proxy").val() == "") {
        $("#outbound_proxy").val($("#domain").val());
    }

    var loginObject = {};
    loginObject.login = $('#username').val();
    loginObject.password = $('#password').val();
    loginObject.authenticationName = $('#authname').val();
    loginObject.domain = $('#domain').val();
    loginObject.outboundProxy = $('#outbound_proxy').val();
    loginObject.port = $('#port').val();
    loginObject.useProxy = $('#checkboxUseProxy').attr("checked") ? true : false;
    loginObject.qValue = "1.0";

    var result = flashphoner.login(loginObject);
    closeLoginView();
    if (result == 0) {
        openConnectingView("Connecting...", 0);
        setCookie("login", $('#username').val());
        setCookie("authName", $('#authname').val());
        setCookie("pwd", $('#password').val());
        setCookie("domain", $('#domain').val());
        setCookie("outbound_proxy", $('#outbound_proxy').val());
        setCookie("port", $('#port').val());
    }
}

function loginByToken(token) {
    trace("loginByToken", token);
    connectingViewBeClosed = false;
    var result = flashphoner.loginByToken(token);

    closeLoginView();
    openConnectingView("Connecting...", 0);
}

function getInfoAboutMe() {
    trace("getInfoAboutMe");
    return flashphoner.getInfoAboutMe();
}

function logoff() {
    trace("logoff");
    flashphoner.logoff();
}

function call() {
    trace("call");
    if (isLogged) {
        if (isMuted() == 1) {
            intervalId = setInterval('if (isMuted() == -1){closeRequestUnmute(); clearInterval(intervalId);call();}', 500);
            requestUnmute();
        } else if (isMuted() == -1) {
            var result = flashphoner.call({callee: callee, visibleName: 'Caller', hasVideo: false, inviteParameters: testInviteParameter});
            if (result == 0) {
                toHangupState();
            } else {
                openConnectingView("Callee number is wrong", 3000);
            }
        } else {
            openConnectingView("Microphone is not plugged in", 3000);
        }
    } else {
        openLoginView();
    }
}

function notifyMessage(message, notificationResult, sipObject) {
    messenger.notifyMessage(message, notificationResult, sipObject);
}

function sendMessage(to, body, contentType, deliveryNotification) {
    trace("sendMessage", to, body, contentType);
    var message = new Object();
    message.from = callerLogin;
    message.to = to;
    message.body = body;
    message.contentType = contentType;
    message.recipients = (message.to.indexOf(",")!=-1)?message.to:"";
    message.deliveryNotification = deliveryNotification;
    messenger.sendMessage(message);
}


function answer(callId) {
    trace("answer", callId);
    if (isMuted() == 1) {
        intervalId = setInterval('if (isMuted() == -1){closeRequestUnmute(); clearInterval(intervalId);answer(currentCall.id);}', 500);
        requestUnmute();
    } else if (isMuted() == -1) {
        flashphoner.answer(callId);
    } else {
        openConnectingView("Microphone is not plugged in", 3000);
    }
}

function hangup(callId) {
    trace("hangup", callId);
    flashphoner.hangup(callId);
}

function sendDTMF(callId, dtmf) {
    trace("sendDTMF", callId, dtmf);
    flashphoner.sendDTMF(callId, dtmf);
}

function setStatusHold(callId, isHold) {
    trace("setStatusHold", callId, isHold);
    flashphoner.setStatusHold(callId, isHold);
    disableHoldButton();
}

function transfer(callId, target) {
    trace("transfer", callId, target);
    flashphoner.transfer(callId, target);
}

function isMuted() {
    var isMute = flashphoner.isMuted();
    return isMute;
}

function sendVideoChangeState() {
    trace("sendVideoChangeState");
    var sendVideoButton = getElement('sendVideo');
    if (sendVideoButton.value == 'Send video') {
        sendVideoButton.value = "Stop video";
        flashphoner.setSendVideo(currentCall.id, true);
    } else {
        sendVideoButton.value = "Send video";
        flashphoner.setSendVideo(currentCall.id, false);
    }
}

function viewVideo() {
    trace("viewVideo");
    flashphoner.viewVideo();
}

function viewAccessMessage() {
    trace("viewAccessMessage");
    flashphoner.viewAccessMessage();
}

function changeRelationMyVideo(relation) {
    trace("changeRelationMyVideo", relation);
    flashphoner.changeRelationMyVideo(relation);
}

function getMicVolume() {
    trace("getMicVolume");
    return flashphoner.getMicVolume();
}
function getVolume() {
    trace("getVolume");
    return flashphoner.getVolume();
}

function setCookie(key, value) {
    trace("setCookie", key, value);
    flashphoner.setCookie(key, value);
}

function getCookie(key) {
    trace("getCookie", key);
    return flashphoner.getCookie(key);
}

function getVersion() {
    trace("getVersion");
    return flashphoner.getVersion();
}
/* ------------------ Notify functions ----------------- */

function addLogMessage(message) {
    trace(message);
}

function notifyFlashReady() {
    flashphoner = flashphonerLoader.getFlashphoner();
    messenger = new Messenger(flashphoner);
    if (flashphonerLoader.useWebRTC){
        $('#checkboxUseProxyDiv').css('display', 'inline');
        $('#cameraButton').css('visibility', 'hidden');
        $('#micButton').css('visibility', 'hidden');
    } else {
        $('#checkboxUseProxyDiv').css('display', 'none');
        $('#cameraButton').css('visibility', 'visible');
        $('#micButton').css('visibility', 'visible');
    }
    //todo refactoring
    //$('#versionOfProduct').html(getVersion());
    if (flashphonerLoader.getToken()) {
        loginByToken(flashphonerLoader.getToken());
    } else {
        closeConnectingView();
    }
}

function notifyRegisterRequired(registerR) {
    registerRequired = registerR;
}

function notifyCloseConnection() {
    trace("notifyCloseConnection");
    currentCall = null;
    toLogOffState();
    toCallState();
    isLogged = false;
    closeIncomingView();
    closeVideoView();
    closeCallView();
    getElement('sendVideo').value = "Send video";
}

function notifyConnected() {
    trace("notifyConnected");
    if (registerRequired) {
        if (!connectingViewBeClosed) {
            openConnectingView("Waiting for registering...", 0);
        }
    } else {
        toLogState();
        callerLogin = getInfoAboutMe().login;
        getElement("callerLogin").innerHTML = callerLogin;
        isLogged = true;
        closeConnectingView();
    }
    //You can set speex quality here
    //flashphoner.setSpeexQuality(10);
}

function notifyRegistered() {
    trace("notifyRegistered");
    if (registerRequired) {
        toLogState();
        callerLogin = getInfoAboutMe().login;
        getElement("callerLogin").innerHTML = callerLogin;
        isLogged = true;
        connectingViewBeClosed = true;
        closeConnectingView();
        flashphoner.playSound("REGISTER");
    }
}

function notifyBalance(balance) {
}

function notify(call) {
    trace("notify", call); //: callId " + call.id + " --- " + call.anotherSideUser);
    if (currentCall.id == call.id) { //if we have some call now and notify is about exactly our call
        currentCall = call;
        if (call.state == STATE_FINISH) {
            // if that hangup during transfer procedure?
            if (holdedCall != null) {
                currentCall = holdedCall; //holded call become current
                holdedCall = null; //make variable null
                createCallView(currentCall);
            } else {
                closeIncomingView();
                closeVideoView();
                toCallState();
                flashphoner.stopSound("RING");
                flashphoner.playSound("FINISH");
            }
            getElement('sendVideo').value = "Send video";
            // or this just usual hangup during the call
        } else if (call.state == STATE_HOLD) {
            $('#callState').html('...Call on hold...');
            enableHoldButton();
        } else if (call.state == STATE_TALK) {
            $('#callState').html('...Talking...');
            enableHoldButton();
            flashphoner.stopSound("RING");
        } else if (call.state == STATE_RING) {
            $('#callState').html('...Ringing...');
            flashphoner.playSound("RING");
        } else if (call.state == STATE_BUSY) {
            flashphoner.playSound("BUSY");
        }
    } else if (holdedCall.id == call.id) {
        if (call.state == STATE_FINISH) {
            /* that mean if
             - user1 call user2
             - user2 transfer to user3
             - user3 just thinking (not answer, not hangup)
             - user2 hangup during him thinking
             then we delete old holded call from user1 memory
             */
            holdedCall = null;
            getElement('sendVideo').value = "Send video";
        }
        enableHoldButton();
    }
}

function notifyCallbackHold(call, isHold) {
    trace("notifyCallbackHold", call, isHold);//callId - " + call.id + "; isHold - " + isHold);
    if (currentCall != null && currentCall.id == call.id) {
        currentCall = call;
        if (isHold) {
            getElement('holdButton').style.background = "url(assets/unhold.png)";
            $('#holdButton').unbind('click');
            $('#holdButton').click(function () {
                setStatusHold(call.id, false);
            });

        } else {
            getElement('holdButton').style.background = "url(assets/hold.png)";
            $('#holdButton').unbind('click');
            $('#holdButton').click(function () {
                setStatusHold(call.id, true);
            });
        }
    }
}

function notifyCost(cost) {
}

function notifyError(error) {

    trace("notifyError", error);

    if (error == CONNECTION_ERROR) {
        openInfoView("Can`t connect to server.", 3000, 30);

    } else if (error == AUTHENTICATION_FAIL) {
        openInfoView("Register fail, please check your SIP account details.", 3000, 30);
        window.setTimeout("logoff();", 3000);

    } else if (error == USER_NOT_AVAILABLE) {
        openInfoView("User not available.", 3000, 30);

        /*  Deprecated error

         else if (error == TOO_MANY_REGISTER_ATTEMPTS) {
         openInfoView("Connection error", 3000, 30);
         toLoggedOffState();
         */

    } else if (error == LICENSE_RESTRICTION) {
        openInfoView("You trying to connect too many users, or license is expired", 3000, 90);

    } else if (error == LICENSE_NOT_FOUND) {
        openInfoView("Please specify license in the flashphoner.properties (flashphoner.com/license)", 5000, 90);

    } else if (error == INTERNAL_SIP_ERROR) {
        openInfoView("Unknown error. Please contact support.", 3000, 60);

    } else if (error == REGISTER_EXPIRE) {
        openInfoView("No response from VOIP server during 15 seconds.", 3000, 60);

    } else if (error == SIP_PORTS_BUSY) {
        openInfoView("SIP ports are busy. Please open SIP ports range (30000-31000 by default).", 3000, 90);
        connectingViewBeClosed = true;
        window.setTimeout("logoff();", 3000);

    } else if (error == MEDIA_PORTS_BUSY) {
        openInfoView("Media ports are busy. Please open media ports range (31001-32000 by default).", 3000, 90);

    } else if (error == WRONG_SIPPROVIDER_ADDRESS) {
        openInfoView("Wrong domain.", 3000, 30);
        connectingViewBeClosed = true;
        window.setTimeout("logoff();", 3000);

    } else if (error == CALLEE_NAME_IS_NULL) {
        openInfoView("Callee name is empty.", 3000, 30);

    } else if (error == WRONG_FLASHPHONER_XML) {
        openInfoView("Flashphoner.xml has errors. Please check it.", 3000, 60);
    }

    closeConnectingView();
    toCallState();
}

function notifyVideoFormat(call) {
    trace("notifyVideoFormat", call);

    if (call.streamerVideoWidth != 0) {
        proportionStreamer = call.streamerVideoHeight / call.streamerVideoWidth;
        if (proportionStreamer != 0) {
            changeRelationMyVideo(proportionStreamer);
        }
    }

    if (!call.playerVideoHeight == 0) { //that mean if user really send me video
        proportion = call.playerVideoHeight / call.playerVideoWidth; //set proportion of video picture, else it will be = 0
    }

    if ($('div').is('.videoDiv') && proportion != 0) { //if video window opened and other side send video
        var newHeight = $('.videoDiv').width() * proportion + 40;
        $('.videoDiv').height(newHeight); //we resize video window for new proportion
        $('#video').height(newHeight - 40); //and resize flash for new video window
    }
}

function notifyOpenVideoView(isViewed) {
    trace("notifyOpenVideoView", isViewed);
    if (isViewed) {
        openVideoView();
    } else {
        closeVideoView();
    }
}

function notifyMessageReceived(messageObject){
    openChatView();
    trace("notifyMessageReceived", messageObject);
    var from = findFrom(messageObject);
    createChat(from);
    var chatDiv = $('#chat' + removeNonDigitOrLetter(from) + ' .chatTextarea'); //set current textarea
    addMessageToChat(chatDiv,from, messageObject.body, "yourNick",messageObject.id);
}

function findFrom(messageObject) {
    var from = messageObject.from.toLowerCase();
    var exists = isChatTabExists(from);
    if (!exists){
        if (messageObject.pAssertedIdentity){
            var pAssertedIdentity = parsePAssertedIdentity(messageObject.pAssertedIdentity);
            //Looking for a tab by pAssertedIdentity
            for (var key in pAssertedIdentity){
                if (isChatTabExists(pAssertedIdentity[key])){
                    from = pAssertedIdentity[key];
                    break;
                }
            }
        }
    }
    return from;
}

//Example: <sip:user@domain.com>,<tel:012345>
function parsePAssertedIdentity(pAssertedIdentity){
    var arr = pAssertedIdentity.split(",");
    for (var i=0; i<arr.length; i++){
        var pAssertedIdentityValue = arr[i];
        arr[i] = pAssertedIdentityValue.replace("/</g","").replace("/>/g","");
    }
    return arr;
}

function isChatTabExists(calleeName){
    return $('li').is('#tab' + removeNonDigitOrLetter(calleeName));
}

function addMessageToChat(chatDiv, from, body, className, messageId){
    var idAttr=(messageId!=null)?"id='"+messageId+"'":"";
    var isScrolled = (chatDiv[0].scrollHeight - chatDiv.height() + 1) / (chatDiv[0].scrollTop + 1); // is chat scrolled down? or may be you are reading previous messages.
    var messageDiv = "<div "+idAttr+" class='"+className+"'>" + from +" "+ body + "</div>";
    chatDiv.append(messageDiv); //add message to chat
    if (isScrolled == 1) {
        chatDiv[0].scrollTop = chatDiv[0].scrollHeight; //autoscroll if you are not reading previous messages
    }
}

function notifyMessageSent(messageObject){
    trace("notifyMessageSent", messageObject);
    createChat(messageObject.to.toLowerCase());
    var chatDiv = $('#chat' + removeNonDigitOrLetter(messageObject.to.toLowerCase()) + ' .chatTextarea'); //set current textarea for
    addMessageToChat(chatDiv,messageObject.from, messageObject.body, "myNick",messageObject.id);
}

function notifyMessageAccepted(message){
    trace("notifyMessageAccepted", message);
    var messageDiv = $('#'+message.id);
    messageDiv.addClass("myNick message_accepted");
}

function notifyMessageDelivered(message){
    trace("notifyMessageDelivered", message);
    var messageDiv = $('#'+message.id);
    messageDiv.addClass("myNick message_delivered");
}

function notifyMessageDeliveryFailed(message){
    trace("notifyMessageDeliveryFailed", message);
    var messageDiv = $('#'+message.id);
    messageDiv.addClass("myNick message_delivery_failed");
}

function notifyMessageFailed(message){
    trace("notifyMessageFailed", message);
    var messageDiv = $('#'+message.id);
    messageDiv.addClass("myNick message_failed");
}

function notifyAddCall(call) {
    trace("notifyAddCall", call); // call.id, call.anotherSideUser

    if (currentCall != null && call.incoming == true) {
        hangup(call.id);
    } else if (currentCall != null && call.incoming == false) {
        holdedCall = currentCall;
        currentCall = call;
        createCallView(currentCall);
    } else {
        currentCall = call;
        createCallView(currentCall);
        if (call.incoming == true) {
            openIncomingView(call);
            toHangupState();
        }
    }
}

function createCallView(call) {
    openCallView();
    $('#caller').html(call.anotherSideUser);

    if (call.state == STATE_HOLD) {
        $('#callState').html('...Call on hold...');
        enableHoldButton();
    } else if (call.state == STATE_TALK) {
        $('#callState').html('...Talking...');
        enableHoldButton();
    } else if (call.state == STATE_RING) {
        $('#callState').html('...Ringing...');
    }

    $('#holdButton').unbind('click');
    $('#holdButton').click(function () {
        setStatusHold(call.id, true);
    });

    $('#transferButton').unbind('click');
    $('#transferButton').click(function () {
        openTransferView(call);
    });
}

function removeCallView(call) {
    closeCallView();
    $('#caller').html('');
    $('#callState').html('');
    $('#holdButton').css('background', 'url(assets/hold.png)');
}


function notifyRemoveCall(call) {
    trace("notifyRemoveCall", call); // call.id
    if (currentCall != null && currentCall.id == call.id) {
        currentCall = null;
        removeCallView(call)
    }
}

function notifyVersion(version) {
    getElement('versionOfProduct').innerHTML = version;
}
/* ----------------------------------------------------------------------- */

/* --------------- Additional functions ------------------- */

function toLogState() {
    trace("toLogState");
    $("#callerLogin").show().html(callerLogin);
    $("#loginMainButton").hide();
}

function toLogOffState() {
    trace("toLogOffState");
    $("#loginMainButton").show();
    $('#callerLogin').hide().html('');
}

function toHangupState() {
    trace("toHangupState");
    $('#callButton').html("Hangup");
    /*$('#callButton').css('background', '#C00');*/
    $('#callButton').removeClass('call').addClass('hangup');
    disableCallButton();
}

function toCallState() {
    trace("toCallState");
    $('#callButton').html("Call");
    /*$('#callButton').css('background', '#090');*/
    $('#callButton').removeClass('hangup').addClass('call');
    disableCallButton();
}

function disableCallButton() {
    trace("disableCallButton");
    var button = $('#callButton');

    $('#callButton').addClass('disabled');
    window.setTimeout(enableCallButton, 3000);

    function enableCallButton() {
        $('#callButton').removeClass('disabled');
    }
}


function enableHoldButton() {
    trace("enableHoldButton");
    var button = $('#holdButton');
    button.css('visibility', 'inherit');
}

function disableHoldButton() {
    trace("disableHoldButton");
    var button = $('#holdButton');
    button.css('visibility', 'hidden');
}


function openLoginView() {
    if (flashphonerLoader.getToken()) {
        loginByToken(flashphonerLoader.getToken());
    } else {
        trace("openLoginView");
        $('#loginDiv').css('visibility', 'visible');
        $('#username').val(getCookie('login'));
        $('#authname').val(getCookie('authName'));
        $('#password').val(getCookie('pwd'));
        $('#domain').val(getCookie('domain'));
        $('#outbound_proxy').val(getCookie('outbound_proxy'));
        $('#port').val(getCookie('port'));
    }

}

function closeLoginView() {
    $('#loginDiv').css('visibility', 'hidden');
}

function openConnectingView(str, timeout) {
    trace("openConnectingView: message - " + str + "; timeout - " + timeout);
    if (timeout != 0) {
        window.setTimeout("closeConnectingView();", timeout);
    }
    getElement('connectingDiv').style.visibility = "visible";
    getElement('connectingText').innerHTML = str;
}

function closeConnectingView() {
    trace("closeConnectingView");
    getElement('connectingDiv').style.visibility = "hidden";
}

function openInfoView(str, timeout, height) {
    if (timeout != 0) {
        window.setTimeout("closeInfoView();", timeout);
    }
    getElement('infoDiv').style.visibility = "visible";
    getElement('infoDiv').style.height = height + "px";
    getElement('infoText').innerHTML = str;
}

function closeInfoView() {
    trace("closeInfoView");
    getElement('infoDiv').style.visibility = "hidden";
}

function openIncomingView(call) {
    trace("openIncomingView", call)// call.caller, call.visibleNameCaller
    $('#incomingDiv').show();
    $('#callerField').html(call.caller + " '" + call.visibleNameCaller + "'");

    $('#answerButton').unbind('click');
    $('#answerButton').click(function () {
        answer(call.id);
        closeIncomingView();
    });
    $('#hangupButton').unbind('click');
    $('#hangupButton').click(function () {
        hangup(call.id);
        closeIncomingView();
    });
}

function closeIncomingView() {
    trace("closeIncomingView");
    $('#incomingDiv').hide();
}

function openSettingsView() {
    trace("openSettingsView");
    getElement('settingsDiv').style.visibility = "visible";
}
function closeSettingsView() {
    trace("closeSettingsView");
    getElement('settingsDiv').style.visibility = "hidden";
}

function getElement(str) {
    return document.getElementById(str);
}

/* ----- VIDEO ----- */

function openVideoView() {
    trace("openVideoView");
    if (isMuted() == -1) {
        viewVideo();
        $('#video_requestUnmuteDiv').removeClass().addClass('videoDiv');
        $('#closeButton_video_requestUnmuteDiv').css('visibility', 'visible');

        $('#sendVideo').css('visibility', 'visible');
        $('#requestUnmuteText').hide();
        $('#video_requestUnmuteDiv .bar').html('&nbsp;&nbsp;Video');

        if (proportion != 0) {
            var newHeight = $('.videoDiv').width() * proportion + 40;
            $('.videoDiv').height(newHeight); //we resize video window for new proportion
        }
        $('#video_requestUnmuteDiv').resize();
    } else {
        requestUnmute();
        intervalId = setInterval('if (isMuted() == -1){closeRequestUnmute(); clearInterval(intervalId); openVideoView();}', 500);
    }
}

function closeVideoView() {
    trace("closeVideoView");
    $('#video_requestUnmuteDiv').removeClass().addClass('closed');
}

/* ----- CHAT ----- */

function openChatView() {
    trace("openChatView");
    $('#chatDiv').css('visibility', 'visible');
}
function closeChatView() {
    trace("closeChatView");
    $('#chatDiv').css('visibility', 'hidden');
}
/*-----------------*/

/* ----- CALL ----- */
function openCallView() {
    trace("openCallView");
    $('#callDiv').css('visibility', 'visible');
}
function closeCallView() {
    trace("closeCallView");
    $('#callDiv').css('visibility', 'hidden');
}
/*-----------------*/
/* ----- TRANSFER ----- */
function openTransferView(call) {
    trace("openTransferView");
    $('#transferOk').unbind('click');
    $('#transferOk').click(function () {
        transfer(currentCall.id, $('#transferInput').val());
        closeTransferView();
    });

    if (call.state != STATE_HOLD) {
        setStatusHold(call.id, true);
    }
    getElement('transfer').style.visibility = "visible";
}

function closeTransferView() {
    trace("closeTransferView");
    getElement('transfer').style.visibility = "hidden";
}
/*-----------------*/

/* ------------- Additional interface functions --------- */

// Functions createChat creates chat with the callee. 
// It contains all chat window functionality including send message function 

function createChat(calleeName) {

    //var closetab = '<a href="" id="close' + calleeName + '" class="close">&times;</a>';
    //$("#tabul").append('<li id="tab' + calleeName + '" class="ntabs">' + calleeName + '&nbsp;' + closetab + '</li>'); //add tab with the close button
    var calleeNameFull = calleeName;
    var calleeNameId = removeNonDigitOrLetter(calleeName);
    if (!$('li').is('#tab' + calleeNameId)) {
        var closetab = '<a href="" id="close' + calleeNameId + '" class="close">&times;</a>';

        // We will cut too long calleeNames to place it within chat tab
        if (calleeNameFull.length > 21) {
            calleeNameFull = calleeNameFull.substr(0, 21) + '...';
        }


        $("#tabul").append('<li id="tab' + calleeNameId + '" class="ntabs">' + calleeNameFull + '&nbsp;' + closetab + '</li>'); //add tab with the close button


        $('#tabcontent').append('<div class="chatBox" id="chat' + calleeNameId + '" title="'+calleeNameFull+'">'); //add chatBox
        $('#chat' + calleeNameId).append('<div class="chatTextarea"></div>')//add text area for chat messages
            .append('<input class="messageInput" type="textarea">')//add input field
            .append('<input class="messageSend" type="button" value="Send">'); //add send button

        $("#tabul li").removeClass("ctab"); //remove select from all tabs
        $("#tab" + calleeNameId).addClass("ctab"); //select new tab
        $(".chatBox").hide(); //hide all chatBoxes
        $("#chat" + calleeNameId).show(); //show new chatBox

        // Bind send message on click Enter in message inout field

        $('#chat' + calleeNameId + ' .messageInput').keydown(function (event) {
            if (event.keyCode == '13') {
                $(this).next().click(); // click on sendMessage button
            } else if (event.keyCode == '27') {
                $(this).val('');
            }
        });

        // Bind send message function
        $('#chat' + calleeNameId + ' .messageSend').click(function () {
            var calleeName = $(this).parent().attr('title'); //parse id of current chatBox, take away chat word from the beginning
            var messageText = $(this).prev().val(); //parse text from input
            sendMessage(calleeName, messageText, 'message/cpim',true); //send message
            $(this).prev().val(''); //clear message input
        });

        // Bind selecting tab
        $("#tab" + calleeNameId).bind("click", function () {
            $("#tabul li").removeClass("ctab"); //hide all tabs
            $("#tab" + calleeNameId).addClass("ctab"); //select clicked tab
            $(".chatBox").hide(); //chide all chatBoxes
            $("#chat" + calleeNameId).show(); //show new chatBox
        });

        // Bind closing tab on click 
        $("#close" + calleeNameId).click(function () {
            //close this tab
            $(this).parent().hide();
            $("#chat" + calleeNameId).hide();

            var prevVisibleTab = $(this).parent().prevAll().filter(':visible').filter(':first'); //set prev visible tab
            var nextVisibleTab = $(this).parent().nextAll().filter(':visible').filter(':first'); //set next visible tab

            if ($(this).parent().is('.ctab')) { //but what if this tab was selected?
                $(this).parent().removeClass("ctab"); //we will unselect this
                if (prevVisibleTab.is('.ntabs')) { //and if there is prev tab
                    prevVisibleTab.addClass('ctab'); //then select prev tab
                    $('#chat' + prevVisibleTab.attr('id').substr(3)).show(); //and show accoring chat

                } else if (nextVisibleTab.is('.ntabs')) { //or if there is next tab
                    nextVisibleTab.addClass('ctab'); //then select next tab
                    $('#chat' + nextVisibleTab.attr('id').substr(3)).show(); //and show accoring chat

                } else {
                    $('#chatDiv').css('visibility', 'hidden'); //else simply close all chat
                }
            }
            ;
            return false; // i don`t know why it need
        });
    } else {
        $("#tabul li").removeClass("ctab"); //remove select from all tabs
        $("#tab" + calleeNameId).show(); //show our tab
        $("#tab" + calleeNameId).addClass("ctab"); //select our tab
        $(".chatBox").hide(); //hide all chatboxes
        $("#chat" + calleeNameId).show(); //show our chatBox

    }

}

function removeNonDigitOrLetter(calleeName){
    return calleeName.replace(/\W/g, '')
}

/* ---------------------------------------------------- */

/* 
 This functions need to show window with the Adobe security panel when
 is ask allow use devices. This functions change size of window where swf is located.
 Sometimes this window use to show 'Request view', sometimes - to show 'Video view'
 */
function requestUnmute() {
    trace("requestUnmute");

    $('#video_requestUnmuteDiv').removeClass().addClass('securityDiv');
    $('#closeButton_video_requestUnmuteDiv').css('visibility', 'hidden');
    $('#sendVideo').css('visibility', 'hidden');
    $('#requestUnmuteText').show();

    $('#video').width(214);
    $('#video').height(138);
    getElement('video').style.top = "35px";

    viewAccessMessage();
}

function closeRequestUnmute() {
    trace("closeRequestUnmute");
    $('#video_requestUnmuteDiv').removeClass().addClass('closed');
    getElement('video').style.top = "20px";
}
/* ------------------------- */

// functions closeView is simplifying of many close....View functions
function close(element) {
    element.css('visibility', 'hidden');
}


/* --------------------- On document load we do... ------------------ */
$(function () {

    // open login view
    $("#loginMainButton").click(function () {
        openLoginView();
    });

    // logout
    $("#logoutButton").click(function () {
        logoff();
        $(this).hide();
    });

    // login
    $("#loginButton").click(function () {
        login();
    });

    // click on caller login show logout button
    $("#callerLogin").click(function () {
        $('#logoutButton').toggle()
    });

    // every time when we change callee field - we set parameter callee
    // that parameter used around the code 
    $("#calleeText").keyup(function () {
        callee = $(this).val();
    });

    //Bind click on different buttons
    $("#callButton").click(function () {
        if ($("#callButton").html() == 'Call') {
            call();
        } else {
            if (currentCall){
                hangup(currentCall.id);
            } else {
                hangup();
            }
        }
    });

    $("#cameraButtonInCallee").click(function () {
        openVideoView();
    });

    $("#canselLoginDiv").click(function () {
        closeLoginView();
    });

    $("#sendVideo").click(function () {
        sendVideoChangeState();
    });

    $("#transferCansel").click(function () {
        closeTransferView();
    });

    $(".iconButton").click(function () {
        $(this).toggleClass('iconPressed');
    });

    //micButton opens mic slider
    $("#micButton").click(function () {
        if ($(this).hasClass('iconPressed')) {
            $('#micSlider').show();
            $('#micBack').show();
        } else {
            $('#micSlider').hide();
            $('#micBack').hide();
        }
    });

    //micButton opens mic slider
    $("#soundButton").click(function () {
        if ($(this).hasClass('iconPressed')) {
            $('#speakerSlider').show();
            $('#speakerBack').show();
        } else {
            $('#speakerSlider').hide();
            $('#speakerBack').hide();
        }
    });

    $("#cameraButton").click(function () {
        openVideoView();
    });

    $("#closeButton_video_requestUnmuteDiv").click(function () {
        closeVideoView();
    });

    $(".closeButton").click(function () {
        close($(this).parent());
    });

    //enable drag and resize objects
    $("#loginDiv").draggable({handle: '.bar', stack: "#loginDiv"});
    $("#incomingDiv").draggable({handle: '.bar', stack: "#incomingDiv"});
    $("#settingsDiv").draggable({handle: '.bar', stack: "#settingsDiv"});
    $("#transfer").draggable({handle: '.bar', stack: "#transfer"});
    $("#chatDiv").draggable({handle: '.bar', stack: "#chatDiv"});
    $("#video_requestUnmuteDiv").draggable({handle: '.bar', stack: "#video_requestUnmuteDiv"});
    $("#video_requestUnmuteDiv").resizable({ minWidth: 215, minHeight: 180, aspectRatio: true});

    var all_videos = $('#localVideoPreview, #remoteVideo, #video');
    all_videos.each(function () {
        var el = $(this);
        el.attr('data-aspectRatio', el.height() / el.width());
        var width = $("#video_requestUnmuteDiv").width();
        el.attr('data-windowRatio', el.width() / (width == 1 ? 640 : width));
    });

    $("#video_requestUnmuteDiv").resize(function () {
        var width = $("#video_requestUnmuteDiv").width();
        var height = $("#video_requestUnmuteDiv").height();
        var newWidth = width == 1 ? 640 : width;
        $('#video').height((height == 1 ? 520 : height) - 40);
        $('#remoteVideo').height((height == 1 ? 520 : height) - 40);
        var localVideo = $('#localVideoPreview');
        localVideo.height(newWidth * localVideo.attr('data-windowRatio') * localVideo.attr('data-aspectRatio'));
        all_videos.each(function () {
            var el = $(this);
            el.width(newWidth * el.attr('data-windowRatio'));
        });
    }).resize();

    //Bind click on number buttons
    $(".numberButton").click(function () {
        if (currentCall != null && currentCall.state == STATE_TALK) {
            sendDTMF(currentCall.id, $(this).html());
        } else if (currentCall == null) {
            $("#calleeText").val($("#calleeText").val() + $(this).html());
            callee = callee + $(this).html();
        }
    });

    // this function set changing in button styles when you press any button
    $(".button").mousedown(function () {
        $(this).addClass('pressed');
    }).mouseup(function () {
            $(this).removeClass('pressed');
        }).mouseout(function () {
            $(this).removeClass('pressed');
        });

    // Bind click on chatButton
    $("#chatButton").click(function () {
        if (isLogged) {
            if (callee != '') {
                openChatView();
                createChat(callee.toLowerCase());
            } else {
                openConnectingView("Callee number is wrong", 3000);
            }
        } else {
            openLoginView();
        }
    });

    /* Autofill Aut. name field when you fill Login field */
    $('#username').keyup(function () {
        $('#authname').val($(this).val());
    });

    /* Autofill Outb. proxy field when you fill "domain" field */
    $('#domain').keyup(function () {
        $('#outbound_proxy').val($(this).val());
    });

    // Mic slider set mic volume when you slide it
    $("#micSlider").slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: 100,
        value: 60,
        slide: function (event, ui) {
            flashphoner.setMicVolume(ui.value);
        }
    });

    // Speaker slider set speaker volume when you slide it
    $("#speakerSlider").slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: 100,
        value: 60,
        slide: function (event, ui) {
            flashphoner.setVolume(ui.value);
        }
    });

    $("#checkboxUseProxy").change(function(){
        if($(this).attr("checked")){
            flashphoner.setUseProxy(true);
        }else{
            flashphoner.setUseProxy(false);
        }});


});
