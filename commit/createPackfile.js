"use strict";
// object types encoded in bits
const types = {
    commit: 0b0010000,
    tree: 0b0100000,
    blob: 0b0110000,
    tag: 0b1000000
}


// Send the pack file via browser
var sendPackLine = function({
    auth,
    branch,
    newHead,
    repo_url,
    objects
}, callback) {
    // Setup git pack protocol
    discover({
        auth,
        method: "GET",
        repo_url,
        service: RPACK
    }, function(response) {
        let {
            capabilities,
            refs
        } = response

        // TODO: Make sure we don't need a better cap selection
        const caps = "report-status side-band-64k"

        // Note: We may ignore the following step
        // since we already know the oldHead
        // Findout the head of the base branch
        let ref = `refs/heads/${branch}`
        let oldHead = refs.get(ref)

        // Write header of the pack file
        let packstream = getStream()
        packstream.write(
            packLineEncode(`${oldHead} ${newHead} ${ref}\0 ${caps}`)
        )
        packstream.write(packLineFlush())

        // Write objects into the pack file
        packObjects({
            objects,
            outputStream: packstream
        })

        // POST using request
        connect({
            auth,
            method: "POST",
            repo_url,
            service: RPACK,
            stream: packstream
        }, function(result) {
            callback(result)
        })
    })
}


// Create the packLine
var packObjects = async function({
    objects,
    outputStream
}) {
    let pad = getPad()
    //TODO: let hash = sha1.create();
    let hash = getSha1();

    // write chunk of data
    function write(chunk, enc) {
        outputStream.write(chunk, enc)
        hash.update(chunk, enc)
    }

    // wrtie an object
    function writeObject({
        stype,
        object
    }) {

        let type = types[stype]
        if (type === undefined) throw new Error('Unrecognized type: ' + stype)

        let lastFour, multibyte, length
        length = object.length
        multibyte = length > 0b1111 ? 0b10000000 : 0b0
        lastFour = length & 0b1111
        length = length >>> 4

        /*
         * The first byte is then 
         * (1-bit multibyte?), (3-bit type), (4-bit least sig 4-bits of length)
         */
        let byte = (multibyte | type | lastFour).toString(16)
        write(byte, 'hex')

        /* Keep chopping away at length 7-bits at a time until its zero,
         * writing out the bytes in what amounts to little-endian order.
         */
        while (multibyte) {
            multibyte = length > 0b01111111 ? 0b10000000 : 0b0
            byte = multibyte | (length & 0b01111111)
            write(pad(2, byte.toString(16), '0'), 'hex')
            length = length >>> 7
        }

        // compress and write the object into packLine
        write(compressObject(object))
    }

    write('PACK')
    write('00000002', 'hex')

    // Write a 4 byte (32-bit) int for number of objects
    write(pad(8, objects.length.toString(16), '0'), 'hex')

    // Write new objects into the packLine
    for (var i = 0; i < objects.length; i++) {
        let type = objects[i][0]
        let object = objects[i][1]

        writeObject({
            write,
            object,
            stype: type
        })
    }

    // Write SHA1 checksum
    let digest = hash.digest()
    outputStream.end(digest)

    return outputStream
}
