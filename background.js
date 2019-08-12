var EXTENSION_ID = "le-git-imate";
var SCRIPTS = ["./libs/jquery.min.js", "./libs/openpgp.js", "./libs/sha1.js", "./libs/bundle.js",
		"./commit/createObject.js", "./commit/createPackfile.js", "app.js", "dispatch.js",
		"./config/setup.js", "./connection/request.js"];

function injectScripts(files, after) {

    var _this = this;
    _this.files = files;
    _this.js = [];
    _this.head = document.getElementsByTagName("head")[0];
    _this.after = after || function() {};

    // Add scripts to the page
    _this.loadScript = function(i) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = _this.js[i];
        var loadNextScript = function() {
            if (++i < _this.js.length)
                _this.loadScript(i);
            else
                _this.after();
        };

        script.onload = function() {
            loadNextScript()
        };
        _this.head.appendChild(script);
    }

    for (var i = 0; i < _this.files.length; i++) {
        if (/\.js$|\.js\?/.test(_this.files[i]))
            _this.js.push(_this.files[i])
    }

    if (_this.js.length > 0)
        _this.loadScript(0);
    else
        _this.after();
}


// TODO: Use options to handle popup window
function setPopupWindow() {

    retrieveObject(EXTENSION_ID).then((privArmored) => {
        if (privArmored === undefined) { // setup if key is not found
            chrome.browserAction.setPopup({
                popup: 'popup.html'
            });

            //reload the page after key settings
            window.location.reload(true);
            window.location.href = "chrome://extensions/"
            window.location.reload(true);
        } else { // perform the user request if key is found
            chrome.browserAction.setPopup({
                popup: 'app.html'
            });
        }
    });
}


// Inject local scripts, and then set the popup window
injectScripts(SCRIPTS, setPopupWindow);
