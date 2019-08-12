//Parse git-receive-pack response
function parseGetResponse(res, service) {
    var lines = res.toString('utf8').trim().split('\n')
    // Parse the header
    var resHead = lines.shift()
    if (!(resHead.toString('utf8').includes(`service=${service}`))) {
        throw new Error(
            `Expected '# service=${service}\\n' but got '${resHead.toString('utf8')}'`
        )
    }

    lines.pop()

    let [refLine, capLine] = lines[0].split('\0')
    var capabilities = capLine.split(' ')
    lines[0] = refLine;

    // Remove the caps from the first line
    const refs = new Map();
    // Get refs, TODO: get symlinks
    for (let line of lines) {
        let [ref, name] = line.split(' ')
            // Remove the length from the beginning
        if (ref.length > 40) ref = ref.slice(-40)
        refs.set(name, ref)
    }

    return {
        capabilities,
        refs
    }
}

// Parse the server's response
// TODO: interpret the response more precisely
var parsePostResponse = function(response) {
    if (response.includes('unpack ok'))
        return true;
    return false;
}
