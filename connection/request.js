// Create a buffer of username/password
function basicAuth(auth) {
    return "Basic " + btoa(auth.username + ':' + auth.password)
}

// Create pify request
function pifyRequest(method, repo_url, headers, body, callback) {

    if (typeof body === "function") {
        callback = body;
        body = undefined;
    }

    if (!callback) {
        return request.bind(null, method, repo_url, headers, body);
    }

    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) return;

            var freshData = xhr.response.substr(xhr.seenBytes);
            xhr.seenBytes = xhr.responseText.length;

            var resHeaders = {};
            xhr.getAllResponseHeaders().trim().split("\r\n").forEach(function(line) {
                var index = line.indexOf(":");
                resHeaders[line.substring(0, index).toLowerCase()] =
                    line.substring(index + 1).trim();
            });

            callback({
                statusCode: xhr.status,
                statusText: xhr.statusText,
                headers: resHeaders,
                body: xhr.response
            });

        };


        xhr.open(method, repo_url, true);

        Object.keys(headers).forEach(function(name) {
            xhr.setRequestHeader(name, headers[name]);
        });

        xhr.send(body);
    });
}


function request(method, repo_url, headers, body, callback) {
    //TODO: Integrate request and piffyRequest
    if (typeof body === "function") {
        callback = body;
        body = undefined;
    }

    if (!callback) {
        return request.bind(null, method, repo_url, headers, body);
    }

    var xhr = new XMLHttpRequest();
    xhr.open(method, repo_url, true);

    Object.keys(headers).forEach(function(name) {
        xhr.setRequestHeader(name, headers[name]);
    });

    xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) return;
        var resHeaders = {};
        xhr.getAllResponseHeaders().trim().split("\r\n").forEach(function(line) {
            var index = line.indexOf(":");
            resHeaders[line.substring(0, index).toLowerCase()] =
                line.substring(index + 1).trim();
        });

        callback({
            statusCode: xhr.status,
            headers: resHeaders,
            body: xhr.response
        });

    };

    xhr.send(body);
}


var discover = async function({
    auth,
    method,
    service,
    repo_url
}, callback) {

    if (!repo_url.endsWith('.git')) repo_url = repo_url += '.git';
    repo_url = `${repo_url}/info/refs?service=${service}`;
    let headers = {}

    request(method, repo_url, headers, function(res) {
        if (res.statusCode !== 200) {
            throw new Error(
                `HTTP Error: ${res.statusCode} ${res.statusMessage}`)
        }
        //console.log(res.body)
        //parse the response and then callback
        callback(parseGetResponse(res.body, service))
    });

}


var connect = async function({
    auth,
    method,
    repo_url,
    service,
    stream
}, callback) {

    if (!repo_url.endsWith('.git')) repo_url = repo_url += '.git'

    let headers = {}
    headers['Content-Type'] = `application/x-${service}-request`
    headers['Accept'] = `application/x-${service}-result`

    let conStream = concatStreamBuffer(stream)
    //console.log(headers, conStream)
    pifyRequest("POST", `${repo_url}/${service}`,
        headers, conStream,
        function(res) {

            if (res.statusCode !== 200) {
                throw new Error(`HTTP Error: ${res.statusCode} ${res.statusMessage}`)
            }

            callback(res.body)
        });
}
