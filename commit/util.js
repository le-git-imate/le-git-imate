// Standardize the time
function standardizeTime(dtime) {
    dtime = new Date(dtime);
    return dtime.toString().split(" (")[0];
}


// Generate the commit time
function determineTime() {
    let authorDateTime = new Date()
    let timestamp = Math.floor(authorDateTime.valueOf() / 1000)
    // Get zone offset in minutes 
    let timezoneOffset = authorDateTime.getTimezoneOffset()

    return {
        timestamp,
        timezoneOffset
    }
}


// Convert zone offset from minutes to hours
function formatTimezoneOffset(minutes) {

    let sign = simpleSign(negateExceptForZero(minutes))
    minutes = Math.abs(minutes)
    let hours = Math.floor(minutes / 60)
    minutes -= hours * 60
    let strHours = String(hours)
    let strMinutes = String(minutes)
    if (strHours.length < 2) strHours = '0' + strHours
    if (strMinutes.length < 2) strMinutes = '0' + strMinutes

    return (sign === -1 ? '-' : '+') + strHours + strMinutes
}


// Normalize string
function normalize(str) {
    // remove all <CR>
    str = str.replace(/\r/g, '')
    // no extra newlines up front
    str = str.replace(/^\n+/, '')
    // a single newline at the end
    str = str.replace(/\n+$/, '') + '\n'
    return str
}


function outdent(str) {
    return str.split('\n')
        .map(x => x.replace(/^ /, ''))
        .join('\n')
}


function indent(str) {
    return (
        str.trim()
        .split('\n')
        .map(x => ' ' + x)
        .join('\n') + '\n'
    )
}


function negateExceptForZero(n) {
    return n === 0 ? n : -n
}


function simpleSign(n) {
    return Math.sign(n) || (Object.is(n, -0) ? -1 : 1)
}
