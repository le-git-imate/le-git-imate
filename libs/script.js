/**
* This file is loaded via a chrome-extension (URL from within the DOM)
* So it (script.js) must be added to the web_accessible_resources section of the manifest file. 
* Otherwise Chrome will refuse to load the script file.
*/

/*Call function to transfer datd to content script*/
//function sendData(){
setTimeout(function() {
	/*get the data by making use of 'ace' library*/
	var editor = ace.edit("editor");
	var file_content = editor.getValue();

    	/**
	* Send data from the page to the Chrome extension 
	* Define a event ID 
	*/
	document.dispatchEvent(new CustomEvent('LGMT2017_connectExtension', {
		detail: file_content 
	}));
}, 0);
//}

/*
var editor = ace.edit("editor");
var file_content = editor.getValue();
sendData();
*/
