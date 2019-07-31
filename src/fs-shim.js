// emscripten generates a require('fs') line
// for ES6 modules, which breaks webpack
// this shims the 'fs' module
export default { }