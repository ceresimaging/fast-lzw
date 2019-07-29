
var Module = (function() {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  return (
function(Module) {
  Module = Module || {};

// Copyright 2010 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module !== 'undefined' ? Module : {};

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// {{PRE_JSES}}

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

Module['arguments'] = [];
Module['thisProgram'] = './this.program';
Module['quit'] = function(status, toThrow) {
  throw toThrow;
};
Module['preRun'] = [];
Module['postRun'] = [];

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_HAS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === 'object';
ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
// A web environment like Electron.js can have Node enabled, so we must
// distinguish between Node-enabled environments and Node environments per se.
// This will allow the former to do things like mount NODEFS.
ENVIRONMENT_HAS_NODE = typeof process === 'object' && typeof require === 'function';
ENVIRONMENT_IS_NODE = ENVIRONMENT_HAS_NODE && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (Module['ENVIRONMENT']) {
  throw new Error('Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -s ENVIRONMENT=web or -s ENVIRONMENT=node)');
}


// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)




// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  } else {
    return scriptDirectory + path;
  }
}

if (ENVIRONMENT_IS_NODE) {
  scriptDirectory = __dirname + '/';

  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  var nodeFS;
  var nodePath;

  Module['read'] = function shell_read(filename, binary) {
    var ret;
    ret = tryParseAsDataURI(filename);
    if (!ret) {
      if (!nodeFS) nodeFS = require('fs');
      if (!nodePath) nodePath = require('path');
      filename = nodePath['normalize'](filename);
      ret = nodeFS['readFileSync'](filename);
    }
    return binary ? ret : ret.toString();
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  if (process['argv'].length > 1) {
    Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
  }

  Module['arguments'] = process['argv'].slice(2);

  // MODULARIZE will export the module in the proper place outside, we don't need to export here

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
  // Currently node will swallow unhandled rejections, but this behavior is
  // deprecated, and in the future it will exit with error status.
  process['on']('unhandledRejection', abort);

  Module['quit'] = function(status) {
    process['exit'](status);
  };

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
} else
if (ENVIRONMENT_IS_SHELL) {


  if (typeof read != 'undefined') {
    Module['read'] = function shell_read(f) {
      var data = tryParseAsDataURI(f);
      if (data) {
        return intArrayToString(data);
      }
      return read(f);
    };
  }

  Module['readBinary'] = function readBinary(f) {
    var data;
    data = tryParseAsDataURI(f);
    if (data) {
      return data;
    }
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof quit === 'function') {
    Module['quit'] = function(status) {
      quit(status);
    }
  }
} else
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // When MODULARIZE (and not _INSTANCE), this JS may be executed later, after document.currentScript
  // is gone, so we saved it, and we use it here instead of any other info.
  if (_scriptDir) {
    scriptDirectory = _scriptDir;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  if (scriptDirectory.indexOf('blob:') !== 0) {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf('/')+1);
  } else {
    scriptDirectory = '';
  }


  Module['read'] = function shell_read(url) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
    } catch (err) {
      var data = tryParseAsDataURI(url);
      if (data) {
        return intArrayToString(data);
      }
      throw err;
    }
  };

  if (ENVIRONMENT_IS_WORKER) {
    Module['readBinary'] = function readBinary(url) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(xhr.response);
      } catch (err) {
        var data = tryParseAsDataURI(url);
        if (data) {
          return data;
        }
        throw err;
      }
    };
  }

  Module['readAsync'] = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      var data = tryParseAsDataURI(url);
      if (data) {
        onload(data.buffer);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };

  Module['setWindowTitle'] = function(title) { document.title = title };
} else
{
  throw new Error('environment detection error');
}

// Set up the out() and err() hooks, which are how we can print to stdout or
// stderr, respectively.
// If the user provided Module.print or printErr, use that. Otherwise,
// console.log is checked first, as 'print' on the web will open a print dialogue
// printErr is preferable to console.warn (works better in shells)
// bind(console) is necessary to fix IE/Edge closed dev tools panel behavior.
var out = Module['print'] || (typeof console !== 'undefined' ? console.log.bind(console) : (typeof print !== 'undefined' ? print : null));
var err = Module['printErr'] || (typeof printErr !== 'undefined' ? printErr : ((typeof console !== 'undefined' && console.warn.bind(console)) || out));

// Merge back in the overrides
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = undefined;

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
assert(typeof Module['memoryInitializerPrefixURL'] === 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['pthreadMainPrefixURL'] === 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['cdInitializerPrefixURL'] === 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['filePackagePrefixURL'] === 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');



// Copyright 2017 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// {{PREAMBLE_ADDITIONS}}

var STACK_ALIGN = 16;

// stack management, and other functionality that is provided by the compiled code,
// should not be used before it is ready
stackSave = stackRestore = stackAlloc = function() {
  abort('cannot use the stack before compiled code is ready to run, and has provided stack access');
};

function staticAlloc(size) {
  abort('staticAlloc is no longer available at runtime; instead, perform static allocations at compile time (using makeStaticAlloc)');
}

function dynamicAlloc(size) {
  assert(DYNAMICTOP_PTR);
  var ret = HEAP32[DYNAMICTOP_PTR>>2];
  var end = (ret + size + 15) & -16;
  if (end > _emscripten_get_heap_size()) {
    abort('failure to dynamicAlloc - memory growth etc. is not supported there, call malloc/sbrk directly');
  }
  HEAP32[DYNAMICTOP_PTR>>2] = end;
  return ret;
}

function alignMemory(size, factor) {
  if (!factor) factor = STACK_ALIGN; // stack alignment (16-byte) by default
  return Math.ceil(size / factor) * factor;
}

function getNativeTypeSize(type) {
  switch (type) {
    case 'i1': case 'i8': return 1;
    case 'i16': return 2;
    case 'i32': return 4;
    case 'i64': return 8;
    case 'float': return 4;
    case 'double': return 8;
    default: {
      if (type[type.length-1] === '*') {
        return 4; // A pointer
      } else if (type[0] === 'i') {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 === 0, 'getNativeTypeSize invalid bits ' + bits + ', type ' + type);
        return bits / 8;
      } else {
        return 0;
      }
    }
  }
}

function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    err(text);
  }
}

var asm2wasmImports = { // special asm2wasm imports
    "f64-rem": function(x, y) {
        return x % y;
    },
    "debugger": function() {
        debugger;
    }
};



var jsCallStartIndex = 1;
var functionPointers = new Array(0);

// Wraps a JS function as a wasm function with a given signature.
// In the future, we may get a WebAssembly.Function constructor. Until then,
// we create a wasm module that takes the JS function as an import with a given
// signature, and re-exports that as a wasm function.
function convertJsFunctionToWasm(func, sig) {

  // The module is static, with the exception of the type section, which is
  // generated based on the signature passed in.
  var typeSection = [
    0x01, // id: section,
    0x00, // length: 0 (placeholder)
    0x01, // count: 1
    0x60, // form: func
  ];
  var sigRet = sig.slice(0, 1);
  var sigParam = sig.slice(1);
  var typeCodes = {
    'i': 0x7f, // i32
    'j': 0x7e, // i64
    'f': 0x7d, // f32
    'd': 0x7c, // f64
  };

  // Parameters, length + signatures
  typeSection.push(sigParam.length);
  for (var i = 0; i < sigParam.length; ++i) {
    typeSection.push(typeCodes[sigParam[i]]);
  }

  // Return values, length + signatures
  // With no multi-return in MVP, either 0 (void) or 1 (anything else)
  if (sigRet == 'v') {
    typeSection.push(0x00);
  } else {
    typeSection = typeSection.concat([0x01, typeCodes[sigRet]]);
  }

  // Write the overall length of the type section back into the section header
  // (excepting the 2 bytes for the section id and length)
  typeSection[1] = typeSection.length - 2;

  // Rest of the module is static
  var bytes = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, // magic ("\0asm")
    0x01, 0x00, 0x00, 0x00, // version: 1
  ].concat(typeSection, [
    0x02, 0x07, // import section
      // (import "e" "f" (func 0 (type 0)))
      0x01, 0x01, 0x65, 0x01, 0x66, 0x00, 0x00,
    0x07, 0x05, // export section
      // (export "f" (func 0 (type 0)))
      0x01, 0x01, 0x66, 0x00, 0x00,
  ]));

   // We can compile this wasm module synchronously because it is very small.
  // This accepts an import (at "e.f"), that it reroutes to an export (at "f")
  var module = new WebAssembly.Module(bytes);
  var instance = new WebAssembly.Instance(module, {
    e: {
      f: func
    }
  });
  var wrappedFunc = instance.exports.f;
  return wrappedFunc;
}

// Add a wasm function to the table.
function addFunctionWasm(func, sig) {
  var table = wasmTable;
  var ret = table.length;

  // Grow the table
  try {
    table.grow(1);
  } catch (err) {
    if (!err instanceof RangeError) {
      throw err;
    }
    throw 'Unable to grow wasm table. Use a higher value for RESERVED_FUNCTION_POINTERS or set ALLOW_TABLE_GROWTH.';
  }

  // Insert new element
  try {
    // Attempting to call this with JS function will cause of table.set() to fail
    table.set(ret, func);
  } catch (err) {
    if (!err instanceof TypeError) {
      throw err;
    }
    assert(typeof sig !== 'undefined', 'Missing signature argument to addFunction');
    var wrapped = convertJsFunctionToWasm(func, sig);
    table.set(ret, wrapped);
  }

  return ret;
}

function removeFunctionWasm(index) {
  // TODO(sbc): Look into implementing this to allow re-using of table slots
}

// 'sig' parameter is required for the llvm backend but only when func is not
// already a WebAssembly function.
function addFunction(func, sig) {


  var base = 0;
  for (var i = base; i < base + 0; i++) {
    if (!functionPointers[i]) {
      functionPointers[i] = func;
      return jsCallStartIndex + i;
    }
  }
  throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';

}

function removeFunction(index) {

  functionPointers[index-jsCallStartIndex] = null;
}

var funcWrappers = {};

function getFuncWrapper(func, sig) {
  if (!func) return; // on null pointer, return undefined
  assert(sig);
  if (!funcWrappers[sig]) {
    funcWrappers[sig] = {};
  }
  var sigCache = funcWrappers[sig];
  if (!sigCache[func]) {
    // optimize away arguments usage in common cases
    if (sig.length === 1) {
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func);
      };
    } else if (sig.length === 2) {
      sigCache[func] = function dynCall_wrapper(arg) {
        return dynCall(sig, func, [arg]);
      };
    } else {
      // general case
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func, Array.prototype.slice.call(arguments));
      };
    }
  }
  return sigCache[func];
}


function makeBigInt(low, high, unsigned) {
  return unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0));
}

function dynCall(sig, ptr, args) {
  if (args && args.length) {
    assert(args.length == sig.length-1);
    assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
    return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
  } else {
    assert(sig.length == 1);
    assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
    return Module['dynCall_' + sig].call(null, ptr);
  }
}

var tempRet0 = 0;

var setTempRet0 = function(value) {
  tempRet0 = value;
}

var getTempRet0 = function() {
  return tempRet0;
}

function getCompilerSetting(name) {
  throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for getCompilerSetting or emscripten_get_compiler_setting to work';
}

var Runtime = {
  // helpful errors
  getTempRet0: function() { abort('getTempRet0() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
  staticAlloc: function() { abort('staticAlloc() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
  stackAlloc: function() { abort('stackAlloc() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
};

// The address globals begin at. Very low in memory, for code size and optimization opportunities.
// Above 0 is static memory, starting with globals.
// Then the stack.
// Then 'dynamic' memory for sbrk.
var GLOBAL_BASE = 1024;




// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html



if (typeof WebAssembly !== 'object') {
  abort('No WebAssembly support found. Build with -s WASM=0 to target JavaScript instead.');
}


// In MINIMAL_RUNTIME, setValue() and getValue() are only available when building with safe heap enabled, for heap safety checking.
// In traditional runtime, setValue() and getValue() are always available (although their use is highly discouraged due to perf penalties)

/** @type {function(number, number, string, boolean=)} */
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}

/** @type {function(number, string, boolean=)} */
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for getValue: ' + type);
    }
  return null;
}





// Wasm globals

var wasmMemory;

// Potentially used for direct table calls.
var wasmTable;


//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS = 0;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
  return func;
}

// C calling interface.
function ccall(ident, returnType, argTypes, args, opts) {
  // For fast lookup of conversion functions
  var toC = {
    'string': function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        var len = (str.length << 2) + 1;
        ret = stackAlloc(len);
        stringToUTF8(str, ret, len);
      }
      return ret;
    },
    'array': function(arr) {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    }
  };

  function convertReturnValue(ret) {
    if (returnType === 'string') return UTF8ToString(ret);
    if (returnType === 'boolean') return Boolean(ret);
    return ret;
  }

  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  assert(returnType !== 'array', 'Return type should not be "array".');
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i]);
      } else {
        cArgs[i] = args[i];
      }
    }
  }
  var ret = func.apply(null, cArgs);
  ret = convertReturnValue(ret);
  if (stack !== 0) stackRestore(stack);
  return ret;
}

function cwrap(ident, returnType, argTypes, opts) {
  return function() {
    return ccall(ident, returnType, argTypes, arguments, opts);
  }
}

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_DYNAMIC = 2; // Cannot be freed except through sbrk
var ALLOC_NONE = 3; // Do not allocate

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
/** @type {function((TypedArray|Array<number>|number), string, number, number=)} */
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc,
    stackAlloc,
    dynamicAlloc][allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var stop;
    ptr = ret;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(/** @type {!Uint8Array} */ (slab), ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!runtimeInitialized) return dynamicAlloc(size);
  return _malloc(size);
}




/** @type {function(number, number=)} */
function Pointer_stringify(ptr, length) {
  abort("this function has been removed - you should use UTF8ToString(ptr, maxBytesToRead) instead!");
}

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAPU8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}


// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;

/**
 * @param {number} idx
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  // (As a tiny code save trick, compare endPtr against endIdx using a negation, so that undefined means Infinity)
  while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr;

  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  } else {
    var str = '';
    // If building with TextDecoder, we have already computed the string length above, so test loop end condition against that
    while (idx < endPtr) {
      // For UTF8 byte structure, see:
      // http://en.wikipedia.org/wiki/UTF-8#Description
      // https://www.ietf.org/rfc/rfc2279.txt
      // https://tools.ietf.org/html/rfc3629
      var u0 = u8Array[idx++];
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      var u1 = u8Array[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      var u2 = u8Array[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte 0x' + u0.toString(16) + ' encountered when deserializing a UTF-8 string on the asm.js/wasm heap to a JS string!');
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (u8Array[idx++] & 63);
      }

      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
  }
  return str;
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns a
// copy of that string as a Javascript String object.
// maxBytesToRead: an optional length that specifies the maximum number of bytes to read. You can omit
//                 this parameter to scan the string until the first \0 byte. If maxBytesToRead is
//                 passed, and the string at [ptr, ptr+maxBytesToReadr[ contains a null byte in the
//                 middle, then the string will cut short at that byte index (i.e. maxBytesToRead will
//                 not produce a string of exact length [ptr, ptr+maxBytesToRead[)
//                 N.B. mixing frequent uses of UTF8ToString() with and without maxBytesToRead may
//                 throw JS JIT optimizations off, so it is worth to consider consistently using one
//                 style or the other.
/**
 * @param {number} ptr
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
}

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array.
//                    This count should include the null terminator,
//                    i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) {
      var u1 = str.charCodeAt(++i);
      u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
    }
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      if (u >= 0x200000) warnOnce('Invalid Unicode code point 0x' + u.toString(16) + ' encountered when serializing a JS string to an UTF-8 string on the asm.js/wasm heap! (Valid unicode code points should be in range 0-0x1FFFFF).');
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.
function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) ++len;
    else if (u <= 0x7FF) len += 2;
    else if (u <= 0xFFFF) len += 3;
    else len += 4;
  }
  return len;
}


// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr) {
  assert(ptr % 2 == 0, 'Pointer passed to UTF16ToString must be aligned to two bytes!');
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  while (HEAP16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(outPtr % 2 == 0, 'Pointer passed to stringToUTF16 must be aligned to two bytes!');
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}

function UTF32ToString(ptr) {
  assert(ptr % 4 == 0, 'Pointer passed to UTF32ToString must be aligned to four bytes!');
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(outPtr % 4 == 0, 'Pointer passed to stringToUTF32 must be aligned to four bytes!');
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}

// Allocate heap space for a JS string, and write it there.
// It is the responsibility of the caller to free() that memory.
function allocateUTF8(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = _malloc(size);
  if (ret) stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Allocate stack space for a JS string, and write it there.
function allocateUTF8OnStack(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
/** @deprecated */
function writeStringToMemory(string, buffer, dontAddNull) {
  warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var /** @type {number} */ lastChar, /** @type {number} */ end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}

function writeArrayToMemory(array, buffer) {
  assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
  HEAP8.set(array, buffer);
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}





function demangle(func) {
  return func;
}

function demangleAll(text) {
  var regex =
    /__Z[\w\d_]+/g;
  return text.replace(regex,
    function(x) {
      var y = demangle(x);
      return x === y ? x : (y + ' [' + x + ']');
    });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  var js = jsStackTrace();
  if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
  return demangleAll(js);
}



// Memory management

var PAGE_SIZE = 16384;
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;

function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - (x % multiple);
  }
  return x;
}

var HEAP,
/** @type {ArrayBuffer} */
  buffer,
/** @type {Int8Array} */
  HEAP8,
/** @type {Uint8Array} */
  HEAPU8,
/** @type {Int16Array} */
  HEAP16,
/** @type {Uint16Array} */
  HEAPU16,
/** @type {Int32Array} */
  HEAP32,
/** @type {Uint32Array} */
  HEAPU32,
/** @type {Float32Array} */
  HEAPF32,
/** @type {Float64Array} */
  HEAPF64;

function updateGlobalBufferViews() {
  Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
  Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
  Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
}


var STATIC_BASE = 1024,
    STACK_BASE = 6800,
    STACKTOP = STACK_BASE,
    STACK_MAX = 5249680,
    DYNAMIC_BASE = 5249680,
    DYNAMICTOP_PTR = 6768;

assert(STACK_BASE % 16 === 0, 'stack must start aligned');
assert(DYNAMIC_BASE % 16 === 0, 'heap must start aligned');



var TOTAL_STACK = 5242880;
if (Module['TOTAL_STACK']) assert(TOTAL_STACK === Module['TOTAL_STACK'], 'the stack size can no longer be determined at runtime')

var INITIAL_TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 1073741824;
if (INITIAL_TOTAL_MEMORY < TOTAL_STACK) err('TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + INITIAL_TOTAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')');

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray !== undefined && Int32Array.prototype.set !== undefined,
       'JS engine does not provide full typed array support');







// Use a provided buffer, if there is one, or else allocate a new one
if (Module['buffer']) {
  buffer = Module['buffer'];
  assert(buffer.byteLength === INITIAL_TOTAL_MEMORY, 'provided buffer should be ' + INITIAL_TOTAL_MEMORY + ' bytes, but it is ' + buffer.byteLength);
} else {
  // Use a WebAssembly memory where available
  if (typeof WebAssembly === 'object' && typeof WebAssembly.Memory === 'function') {
    assert(INITIAL_TOTAL_MEMORY % WASM_PAGE_SIZE === 0);
    wasmMemory = new WebAssembly.Memory({ 'initial': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE, 'maximum': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE });
    buffer = wasmMemory.buffer;
  } else
  {
    buffer = new ArrayBuffer(INITIAL_TOTAL_MEMORY);
  }
  assert(buffer.byteLength === INITIAL_TOTAL_MEMORY);
}
updateGlobalBufferViews();


HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;


// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  assert((STACK_MAX & 3) == 0);
  HEAPU32[(STACK_MAX >> 2)-1] = 0x02135467;
  HEAPU32[(STACK_MAX >> 2)-2] = 0x89BACDFE;
}

function checkStackCookie() {
  var cookie1 = HEAPU32[(STACK_MAX >> 2)-1];
  var cookie2 = HEAPU32[(STACK_MAX >> 2)-2];
  if (cookie1 != 0x02135467 || cookie2 != 0x89BACDFE) {
    abort('Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x02135467, but received 0x' + cookie2.toString(16) + ' ' + cookie1.toString(16));
  }
  // Also test the global address 0 for integrity.
  if (HEAP32[0] !== 0x63736d65 /* 'emsc' */) abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
}

function abortStackOverflow(allocSize) {
  abort('Stack overflow! Attempted to allocate ' + allocSize + ' bytes on the stack, but stack has only ' + (STACK_MAX - stackSave() + allocSize) + ' bytes available!');
}


  HEAP32[0] = 0x63736d65; /* 'emsc' */



// Endianness check (note: assumes compiler arch was little-endian)
HEAP16[1] = 0x6373;
if (HEAPU8[2] !== 0x73 || HEAPU8[3] !== 0x63) throw 'Runtime error: expected the system to be little-endian!';

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func);
      } else {
        Module['dynCall_vi'](func, callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  checkStackCookie();
  assert(!runtimeInitialized);
  runtimeInitialized = true;
  
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  checkStackCookie();
  
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  checkStackCookie();
  runtimeExited = true;
}

function postRun() {
  checkStackCookie();
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


assert(Math.imul, 'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.fround, 'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.clz32, 'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.trunc, 'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_max = Math.max;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;



// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            err('still waiting on run dependencies:');
          }
          err('dependency: ' + dep);
        }
        if (shown) {
          err('(end of list)');
        }
      }, 10000);
    }
  } else {
    err('warning: run dependency added without ID');
  }
}

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    err('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;



// show errors on likely calls to FS when it was not included
var FS = {
  error: function() {
    abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1');
  },
  init: function() { FS.error() },
  createDataFile: function() { FS.error() },
  createPreloadedFile: function() { FS.error() },
  createLazyFile: function() { FS.error() },
  open: function() { FS.error() },
  mkdev: function() { FS.error() },
  registerDevice: function() { FS.error() },
  analyzePath: function() { FS.error() },
  loadFilesFromDB: function() { FS.error() },

  ErrnoError: function ErrnoError() { FS.error() },
};
Module['FS_createDataFile'] = FS.createDataFile;
Module['FS_createPreloadedFile'] = FS.createPreloadedFile;



// Copyright 2017 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

// Indicates whether filename is a base64 data URI.
function isDataURI(filename) {
  return String.prototype.startsWith ?
      filename.startsWith(dataURIPrefix) :
      filename.indexOf(dataURIPrefix) === 0;
}




var wasmBinaryFile = 'data:application/octet-stream;base64,AGFzbQEAAAABnwEXYAF/AX9gBH9/f38AYAN/f38Bf2ADf35/AX5gBn98f39/fwF/YAJ/fwBgAX8AYAJ/fwF/YAAAYAABf2AFf39/f38Bf2AHf39/f39/fwBgA39/fwBgBH9/f38Bf2AHf39/f39/fwF/YAN+f38Bf2ACfn8Bf2AFf39/f38AYAF8AX5gAnx/AXxgB39/fH9/f38Bf2AEf39+fwF+YAF8AX8CxgQcA2VudhJhYm9ydFN0YWNrT3ZlcmZsb3cABgNlbnYLbnVsbEZ1bmNfaWkABgNlbnYQbnVsbEZ1bmNfaWlkaWlpaQAGA2Vudg1udWxsRnVuY19paWlpAAYDZW52DW51bGxGdW5jX2ppamkABgNlbnYMbnVsbEZ1bmNfdmlpAAYDZW52Dm51bGxGdW5jX3ZpaWlpAAYDZW52E19fX2J1aWxkRW52aXJvbm1lbnQABgNlbnYHX19fbG9jawAGA2VudgtfX19zZXRFcnJObwAGA2Vudg1fX19zeXNjYWxsMTQwAAcDZW52DV9fX3N5c2NhbGwxNDYABwNlbnYMX19fc3lzY2FsbDU0AAcDZW52C19fX3N5c2NhbGw2AAcDZW52CV9fX3VubG9jawAGA2VudgZfYWJvcnQACANlbnYZX2Vtc2NyaXB0ZW5fZ2V0X2hlYXBfc2l6ZQAJA2VudhZfZW1zY3JpcHRlbl9tZW1jcHlfYmlnAAIDZW52F19lbXNjcmlwdGVuX3Jlc2l6ZV9oZWFwAAADZW52B19nZXRlbnYAAANlbnYXYWJvcnRPbkNhbm5vdEdyb3dNZW1vcnkAAANlbnYLc2V0VGVtcFJldDAABgNlbnYNX19tZW1vcnlfYmFzZQN/AANlbnYMX190YWJsZV9iYXNlA38AA2Vudg10ZW1wRG91YmxlUHRyA38AA2Vudg5EWU5BTUlDVE9QX1BUUgN/AANlbnYGbWVtb3J5AgGAgAGAgAEDZW52BXRhYmxlAXABLi4DamkACQYFAgYKAgALAAABAAYMAAgBAQAHBgYADAcADAUMBwACAwAJAAIACQcABw0GAAACCQgAAAICAgQFCg4MAAEPEBARBwIJEhMNDQIHBwgJAAYHBwUCAgAHFA0VDBEABAIDBQEWDQICDQoGWA5/ASMCC38BIwMLfwFBAAt/AUEAC38BQQALfwFBAAt/AUEAC38BQQALfwFBAAt8AUQAAAAAAAAAAAt/AUGQNQt/AUGQtcACC30BQwAAAAALfQFDAAAAAAsH6gpdEl9fX0RPVUJMRV9CSVRTXzY2MgB5IV9fX2Vtc2NyaXB0ZW5fZW52aXJvbl9jb25zdHJ1Y3RvcgBjEV9fX2Vycm5vX2xvY2F0aW9uADoSX19fZmZsdXNoX3VubG9ja2VkAEoKX19fZndyaXRleABGC19fX2xvY2tmaWxlAEQLX19fb2ZsX2xvY2sARw1fX19vZmxfdW5sb2NrAEgTX19fcHRocmVhZF9zZWxmXzg5NgBbDl9fX3N0ZGlvX2Nsb3NlADYNX19fc3RkaW9fc2VlawB6Dl9fX3N0ZGlvX3dyaXRlADcPX19fc3Rkb3V0X3dyaXRlADwJX19fc3RwY3B5AGIOX19fc3lzY2FsbF9yZXQAOQpfX190b3dyaXRlAEUNX19fdW5sb2NrZmlsZQBDFF9fX3ZmcHJpbnRmX2ludGVybmFsAFANX19nZXRfZW52aXJvbgBkEF9hdl9icHJpbnRfYWxsb2MAMBNfYXZfYnByaW50X2ZpbmFsaXplADUPX2F2X2JwcmludF9ncm93ADMPX2F2X2JwcmludF9pbml0AC8WX2F2X2JwcmludF9pc19jb21wbGV0ZQAxC19hdl9icHJpbnRmADIIX2F2X2ZyZWUALAlfYXZfZnJlZXAALQdfYXZfbG9nACgYX2F2X2xvZ19kZWZhdWx0X2NhbGxiYWNrACIKX2F2X21hbGxvYwAqC19hdl9tYWxsb2N6AC4LX2F2X3JlYWxsb2MAKwxfYXZfdmJwcmludGYANAhfYXZfdmxvZwApFV9jaGVja19jb2xvcl90ZXJtaW5hbAAnDl9jb2xvcmVkX2ZwdXRzACUOX2Rpc3Bvc2VfY2h1bmsAaQZfZHVtbXkAOw5fZmZfbHp3X2RlY29kZQAdE19mZl9sendfZGVjb2RlX2luaXQAHBNfZmZfbHp3X2RlY29kZV9vcGVuABsOX2ZmX211dGV4X2xvY2sAIxBfZmZfbXV0ZXhfdW5sb2NrACYHX2ZmbHVzaABJB19mbXRfZnAATgZfZm10X28AewZfZm10X3UAfAZfZm10X3gAfQxfZm9ybWF0X2xpbmUAHwhfZnByaW50ZgBMBl9mcHV0cwBBBV9mcmVlAGYGX2ZyZXhwAF0HX2Z3cml0ZQBCDV9nZXRfY2F0ZWdvcnkAIA5fZ2V0X2xldmVsX3N0cgAhC19nZXRpbnRfNjU0AFMIX2lzZGlnaXQAPQ5fbHp3RGVjb21wcmVzcwAaDV9sendfZ2V0X2NvZGUAHgdfbWFsbG9jAGUHX21lbWNocgBLB19tZW1jcHkAagdfbWVtc2V0AGsIX291dF82NTMAUghfcGFkXzY1OQBYDF9wb3BfYXJnXzY1NgBUFF9wb3BfYXJnX2xvbmdfZG91YmxlAE8MX3ByaW50Zl9jb3JlAFENX3B0aHJlYWRfc2VsZgA+CF9yZWFsbG9jAGcJX3Nhbml0aXplACQFX3NicmsAbAlfc25fd3JpdGUAYAlfc25wcmludGYAXgdfc3RyY21wAD8HX3N0cmNweQBhB19zdHJsZW4AQBJfdHJ5X3JlYWxsb2NfY2h1bmsAaAlfdmZwcmludGYATQpfdnNucHJpbnRmAF8IX3djcnRvbWIAWgdfd2N0b21iAFkKZHluQ2FsbF9paQBtD2R5bkNhbGxfaWlkaWlpaQBuDGR5bkNhbGxfaWlpaQBvDGR5bkNhbGxfamlqaQB+C2R5bkNhbGxfdmlpAHENZHluQ2FsbF92aWlpaQByE2VzdGFibGlzaFN0YWNrU3BhY2UAGQpzdGFja0FsbG9jABYMc3RhY2tSZXN0b3JlABgJc3RhY2tTYXZlABcJNAEAIwELLnM2dHR0dHR0dE51dTd1PGB1dXZ2djh3d3d3d3d3d093d3d3d3d3eHh4eHh4IngK+cwDaSgBAX8jDiEBIw4gAGokDiMOQQ9qQXBxJA4jDiMPTgRAIAAQAAsgAQ8LBQAjDg8LBgAgACQOCwoAIAAkDiABJA8L4QEBHX8jDiEfIw5BIGokDiMOIw9OBEBBIBAACyAfQQhqIRwgACEYIAEhGSACIRogHEEANgIAIBwQGyAcKAIAIQQgGCEFIBkhBiAEQQggBSAGQQEQHCEHIAchGyAbIQggCEEARyEJIAkEQEEAIRcgFyEWIB8kDiAWDwUgGSEKIApBAnQhCyALIR0gHSEMIAwhDSANEGUhDiAOIQMgGiEPIA9BADYCACAcKAIAIRAgAyERIB0hEiAQIBEgEhAdIRMgGiEUIBQgEzYCACADIRUgFSEXIBchFiAfJA4gFg8LAEEADws3AQV/Iw4h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ISAgHSAgOgAAQQMhAwwCCyABQYCAfGohISAhQYCAwABJISIgIgRAIAFBEnYhJCAkQfABciElICVB/wFxISYgAEEBaiEnIAAgJjoAACABQQx2ISggKEE/cSEpIClBgAFyISogKkH/AXEhKyAAQQJqISwgJyArOgAAIAFBBnYhLSAtQT9xIS8gL0GAAXIhMCAwQf8BcSExIABBA2ohMiAsIDE6AAAgAUE/cSEzIDNBgAFyITQgNEH/AXEhNSAyIDU6AABBBCEDDAIFEDohNiA2QdQANgIAQX8hAwwCCwALCyADDwsPAQN/Iw4hAhA+IQAgAA8LEgICfwF+Iw4hAiAAvSEDIAMPC/QRAwt/BH4FfCMOIQwgAL0hDyAPQjSIIRAgEKdB//8DcSEJIAlB/w9xIQoCQAJAAkACQCAKQRB0QRB1QQBrDoAQAAICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgECCwJAIABEAAAAAAAAAABiIQQgBARAIABEAAAAAAAA8EOiIRQgFCABEF0hFSABKAIAIQUgBUFAaiEGIBUhEiAGIQgFIAAhEkEAIQgLIAEgCDYCACASIREMAwALAAsCQCAAIREMAgALAAsCQCAQpyEHIAdB/w9xIQIgAkGCeGohAyABIAM2AgAgD0L/////////h4B/gyENIA1CgICAgICAgPA/hCEOIA6/IRMgEyERCwsgEQ8LOQEEfyMOIQcjDkEQaiQOIw4jD04EQEEQEAALIAchBCAEIAM2AgAgACABIAIgBBBfIQUgByQOIAUPC8cCARx/Iw4hHyMOQaABaiQOIw4jD04EQEGgARAACyAfQZABaiEXIB8hGCAYQbAQQZABEGoaIAFBf2ohGSAZQf7///8HSyEaIBoEQCABQQBGIRsgGwRA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';
if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile);
}

function getBinary() {
  try {
    if (Module['wasmBinary']) {
      return new Uint8Array(Module['wasmBinary']);
    }
    var binary = tryParseAsDataURI(wasmBinaryFile);
    if (binary) {
      return binary;
    }
    if (Module['readBinary']) {
      return Module['readBinary'](wasmBinaryFile);
    } else {
      throw "both async and sync fetching of the wasm failed";
    }
  }
  catch (err) {
    abort(err);
  }
}

function getBinaryPromise() {
  // if we don't have the binary yet, and have the Fetch api, use that
  // in some environments, like Electron's render process, Fetch api may be present, but have a different context than expected, let's only use it on the Web
  if (!Module['wasmBinary'] && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === 'function') {
    return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
      if (!response['ok']) {
        throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
      }
      return response['arrayBuffer']();
    }).catch(function () {
      return getBinary();
    });
  }
  // Otherwise, getBinary should be able to get it synchronously
  return new Promise(function(resolve, reject) {
    resolve(getBinary());
  });
}



// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm(env) {

  // prepare imports
  var info = {
    'env': env
    ,
    'global': {
      'NaN': NaN,
      'Infinity': Infinity
    },
    'global.Math': Math,
    'asm2wasm': asm2wasmImports
  };
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  function receiveInstance(instance, module) {
    var exports = instance.exports;
    Module['asm'] = exports;
    removeRunDependency('wasm-instantiate');
  }
  addRunDependency('wasm-instantiate');


  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiatedSource(output) {
    // 'output' is a WebAssemblyInstantiatedSource object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
      // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
      // When the regression is fixed, can restore the above USE_PTHREADS-enabled path.
    receiveInstance(output['instance']);
  }


  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise().then(function(binary) {
      return WebAssembly.instantiate(binary, info);
    }).then(receiver, function(reason) {
      err('failed to asynchronously prepare wasm: ' + reason);
      abort(reason);
    });
  }

  // Prefer streaming instantiation if available.
  function instantiateAsync() {
    if (!Module['wasmBinary'] &&
        typeof WebAssembly.instantiateStreaming === 'function' &&
        !isDataURI(wasmBinaryFile) &&
        typeof fetch === 'function') {
      fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function (response) {
        return WebAssembly.instantiateStreaming(response, info)
          .then(receiveInstantiatedSource, function(reason) {
            // We expect the most common failure cause to be a bad MIME type for the binary,
            // in which case falling back to ArrayBuffer instantiation should work.
            err('wasm streaming compile failed: ' + reason);
            err('falling back to ArrayBuffer instantiation');
            instantiateArrayBuffer(receiveInstantiatedSource);
          });
      });
    } else {
      return instantiateArrayBuffer(receiveInstantiatedSource);
    }
  }
  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
  // to any other async startup actions they are performing.
  if (Module['instantiateWasm']) {
    try {
      return Module['instantiateWasm'](info, receiveInstance);
    } catch(e) {
      err('Module.instantiateWasm callback failed with error: ' + e);
      return false;
    }
  }

  instantiateAsync();
  return {}; // no exports yet; we'll fill them in later
}

// Provide an "asm.js function" for the application, called to "link" the asm.js module. We instantiate
// the wasm module at that time, and it receives imports and provides exports and so forth, the app
// doesn't need to care that it is wasm or asm.js.

Module['asm'] = function(global, env, providedBuffer) {
  // memory was already allocated (so js could use the buffer)
  env['memory'] = wasmMemory
  ;
  // import table
  env['table'] = wasmTable = new WebAssembly.Table({
    'initial': 46,
    'maximum': 46,
    'element': 'anyfunc'
  });
  // With the wasm backend __memory_base and __table_base and only needed for
  // relocatable output.
  env['__memory_base'] = 1024; // tell the memory segments where to place themselves
  // table starts at 0 by default (even in dynamic linking, for the main module)
  env['__table_base'] = 0;

  var exports = createWasm(env);
  assert(exports, 'binaryen setup failed (no wasm support?)');
  return exports;
};

// === Body ===

var ASM_CONSTS = [];





// STATICTOP = STATIC_BASE + 5776;
/* global initializers */  __ATINIT__.push({ func: function() { ___emscripten_environ_constructor() } });








/* no memory initializer */
var tempDoublePtr = 6784
assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
}

function copyTempDouble(ptr) {
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];
  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];
  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];
  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];
}

// {{PRE_LIBRARY}}


  
  var ENV={};
  Module["ENV"] = ENV;function ___buildEnvironment(environ) {
      // WARNING: Arbitrary limit!
      var MAX_ENV_VALUES = 64;
      var TOTAL_ENV_SIZE = 1024;
  
      // Statically allocate memory for the environment.
      var poolPtr;
      var envPtr;
      if (!___buildEnvironment.called) {
        ___buildEnvironment.called = true;
        // Set default values. Use string keys for Closure Compiler compatibility.
        ENV['USER'] = ENV['LOGNAME'] = 'web_user';
        ENV['PATH'] = '/';
        ENV['PWD'] = '/';
        ENV['HOME'] = '/home/web_user';
        ENV['LANG'] = 'C.UTF-8';
        // Browser language detection #8751
        ENV['LANG'] = ((typeof navigator === 'object' && navigator.languages && navigator.languages[0]) || 'C').replace('-', '_') + '.UTF-8';
        ENV['_'] = Module['thisProgram'];
        // Allocate memory.
        poolPtr = getMemory(TOTAL_ENV_SIZE);
        envPtr = getMemory(MAX_ENV_VALUES * 4);
        HEAP32[((envPtr)>>2)]=poolPtr;
        HEAP32[((environ)>>2)]=envPtr;
      } else {
        envPtr = HEAP32[((environ)>>2)];
        poolPtr = HEAP32[((envPtr)>>2)];
      }
  
      // Collect key=value lines.
      var strings = [];
      var totalSize = 0;
      for (var key in ENV) {
        if (typeof ENV[key] === 'string') {
          var line = key + '=' + ENV[key];
          strings.push(line);
          totalSize += line.length;
        }
      }
      if (totalSize > TOTAL_ENV_SIZE) {
        throw new Error('Environment size exceeded TOTAL_ENV_SIZE!');
      }
  
      // Make new.
      var ptrSize = 4;
      for (var i = 0; i < strings.length; i++) {
        var line = strings[i];
        writeAsciiToMemory(line, poolPtr);
        HEAP32[(((envPtr)+(i * ptrSize))>>2)]=poolPtr;
        poolPtr += line.length + 1;
      }
      HEAP32[(((envPtr)+(strings.length * ptrSize))>>2)]=0;
    }
  Module["___buildEnvironment"] = ___buildEnvironment;

  function ___lock() {}
  Module["___lock"] = ___lock;

  
  
  var PATH={splitPath:function(filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function(parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function(path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function(path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function(path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function(path) {
        return PATH.splitPath(path)[3];
      },join:function() {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function(l, r) {
        return PATH.normalize(l + '/' + r);
      }};
  Module["PATH"] = PATH;var SYSCALLS={buffers:[null,[],[]],printChar:function(stream, curr) {
        var buffer = SYSCALLS.buffers[stream];
        assert(buffer);
        if (curr === 0 || curr === 10) {
          (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
          buffer.length = 0;
        } else {
          buffer.push(curr);
        }
      },varargs:0,get:function(varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function() {
        var ret = UTF8ToString(SYSCALLS.get());
        return ret;
      },get64:function() {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function() {
        assert(SYSCALLS.get() === 0);
      }};
  Module["SYSCALLS"] = SYSCALLS;function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      abort('it should not be possible to operate on streams when !SYSCALLS_REQUIRE_FILESYSTEM');
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
  Module["___syscall140"] = ___syscall140;

  
  function flush_NO_FILESYSTEM() {
      // flush anything remaining in the buffers during shutdown
      var fflush = Module["_fflush"];
      if (fflush) fflush(0);
      var buffers = SYSCALLS.buffers;
      if (buffers[1].length) SYSCALLS.printChar(1, 10);
      if (buffers[2].length) SYSCALLS.printChar(2, 10);
    }
  Module["flush_NO_FILESYSTEM"] = flush_NO_FILESYSTEM;function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      // hack to support printf in SYSCALLS_REQUIRE_FILESYSTEM=0
      var stream = SYSCALLS.get(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(((iov)+(i*8))>>2)];
        var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
        for (var j = 0; j < len; j++) {
          SYSCALLS.printChar(stream, HEAPU8[ptr+j]);
        }
        ret += len;
      }
      return ret;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
  Module["___syscall146"] = ___syscall146;

  function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
  Module["___syscall54"] = ___syscall54;

  function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      abort('it should not be possible to operate on streams when !SYSCALLS_REQUIRE_FILESYSTEM');
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
  Module["___syscall6"] = ___syscall6;

  function ___unlock() {}
  Module["___unlock"] = ___unlock;

  function _abort() {
      Module['abort']();
    }
  Module["_abort"] = _abort;

  function _emscripten_get_heap_size() {
      return HEAP8.length;
    }
  Module["_emscripten_get_heap_size"] = _emscripten_get_heap_size;

  function _getenv(name) {
      // char *getenv(const char *name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/getenv.html
      if (name === 0) return 0;
      name = UTF8ToString(name);
      if (!ENV.hasOwnProperty(name)) return 0;
  
      if (_getenv.ret) _free(_getenv.ret);
      _getenv.ret = allocateUTF8(ENV[name]);
      return _getenv.ret;
    }
  Module["_getenv"] = _getenv;

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
    }
  Module["_emscripten_memcpy_big"] = _emscripten_memcpy_big;
  
   

   

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      else err('failed to set errno from JS');
      return value;
    }
  Module["___setErrNo"] = ___setErrNo;
  
  
  function abortOnCannotGrowMemory(requestedSize) {
      abort('Cannot enlarge memory arrays to size ' + requestedSize + ' bytes (OOM). Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + HEAP8.length + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
    }
  Module["abortOnCannotGrowMemory"] = abortOnCannotGrowMemory;function _emscripten_resize_heap(requestedSize) {
      abortOnCannotGrowMemory(requestedSize);
    }
  Module["_emscripten_resize_heap"] = _emscripten_resize_heap; 
var ASSERTIONS = true;

// Copyright 2017 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

/** @type {function(string, boolean=, number=)} */
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      if (ASSERTIONS) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      }
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}


// Copied from https://github.com/strophe/strophejs/blob/e06d027/src/polyfills.js#L149

// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

/**
 * Decodes a base64 string.
 * @param {String} input The string to decode.
 */
var decodeBase64 = typeof atob === 'function' ? atob : function (input) {
  var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  var output = '';
  var chr1, chr2, chr3;
  var enc1, enc2, enc3, enc4;
  var i = 0;
  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  do {
    enc1 = keyStr.indexOf(input.charAt(i++));
    enc2 = keyStr.indexOf(input.charAt(i++));
    enc3 = keyStr.indexOf(input.charAt(i++));
    enc4 = keyStr.indexOf(input.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 !== 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output = output + String.fromCharCode(chr3);
    }
  } while (i < input.length);
  return output;
};

// Converts a string of base64 into a byte array.
// Throws error on invalid input.
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE === 'boolean' && ENVIRONMENT_IS_NODE) {
    var buf;
    try {
      buf = Buffer.from(s, 'base64');
    } catch (_) {
      buf = new Buffer(s, 'base64');
    }
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  try {
    var decoded = decodeBase64(s);
    var bytes = new Uint8Array(decoded.length);
    for (var i = 0 ; i < decoded.length ; ++i) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  } catch (_) {
    throw new Error('Converting base64 string to bytes failed.');
  }
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}


// ASM_LIBRARY EXTERN PRIMITIVES: Int8Array,Int32Array


function nullFunc_ii(x) { err("Invalid function pointer called with signature 'ii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  err("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iidiiii(x) { err("Invalid function pointer called with signature 'iidiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  err("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiii(x) { err("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  err("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_jiji(x) { err("Invalid function pointer called with signature 'jiji'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  err("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vii(x) { err("Invalid function pointer called with signature 'vii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  err("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viiii(x) { err("Invalid function pointer called with signature 'viiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  err("Build with ASSERTIONS=2 for more info.");abort(x) }

var asmGlobalArg = {}

var asmLibraryArg = {
  "abort": abort,
  "setTempRet0": setTempRet0,
  "getTempRet0": getTempRet0,
  "abortStackOverflow": abortStackOverflow,
  "nullFunc_ii": nullFunc_ii,
  "nullFunc_iidiiii": nullFunc_iidiiii,
  "nullFunc_iiii": nullFunc_iiii,
  "nullFunc_jiji": nullFunc_jiji,
  "nullFunc_vii": nullFunc_vii,
  "nullFunc_viiii": nullFunc_viiii,
  "___buildEnvironment": ___buildEnvironment,
  "___lock": ___lock,
  "___setErrNo": ___setErrNo,
  "___syscall140": ___syscall140,
  "___syscall146": ___syscall146,
  "___syscall54": ___syscall54,
  "___syscall6": ___syscall6,
  "___unlock": ___unlock,
  "_abort": _abort,
  "_emscripten_get_heap_size": _emscripten_get_heap_size,
  "_emscripten_memcpy_big": _emscripten_memcpy_big,
  "_emscripten_resize_heap": _emscripten_resize_heap,
  "_getenv": _getenv,
  "abortOnCannotGrowMemory": abortOnCannotGrowMemory,
  "flush_NO_FILESYSTEM": flush_NO_FILESYSTEM,
  "tempDoublePtr": tempDoublePtr,
  "DYNAMICTOP_PTR": DYNAMICTOP_PTR
}
// EMSCRIPTEN_START_ASM
var asm =Module["asm"]// EMSCRIPTEN_END_ASM
(asmGlobalArg, asmLibraryArg, buffer);

var real____DOUBLE_BITS_662 = asm["___DOUBLE_BITS_662"];
asm["___DOUBLE_BITS_662"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____DOUBLE_BITS_662.apply(null, arguments);
};

var real____emscripten_environ_constructor = asm["___emscripten_environ_constructor"];
asm["___emscripten_environ_constructor"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____emscripten_environ_constructor.apply(null, arguments);
};

var real____errno_location = asm["___errno_location"];
asm["___errno_location"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____errno_location.apply(null, arguments);
};

var real____fflush_unlocked = asm["___fflush_unlocked"];
asm["___fflush_unlocked"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____fflush_unlocked.apply(null, arguments);
};

var real____fwritex = asm["___fwritex"];
asm["___fwritex"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____fwritex.apply(null, arguments);
};

var real____lockfile = asm["___lockfile"];
asm["___lockfile"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____lockfile.apply(null, arguments);
};

var real____ofl_lock = asm["___ofl_lock"];
asm["___ofl_lock"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____ofl_lock.apply(null, arguments);
};

var real____ofl_unlock = asm["___ofl_unlock"];
asm["___ofl_unlock"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____ofl_unlock.apply(null, arguments);
};

var real____pthread_self_896 = asm["___pthread_self_896"];
asm["___pthread_self_896"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____pthread_self_896.apply(null, arguments);
};

var real____stdio_close = asm["___stdio_close"];
asm["___stdio_close"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____stdio_close.apply(null, arguments);
};

var real____stdio_seek = asm["___stdio_seek"];
asm["___stdio_seek"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____stdio_seek.apply(null, arguments);
};

var real____stdio_write = asm["___stdio_write"];
asm["___stdio_write"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____stdio_write.apply(null, arguments);
};

var real____stdout_write = asm["___stdout_write"];
asm["___stdout_write"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____stdout_write.apply(null, arguments);
};

var real____stpcpy = asm["___stpcpy"];
asm["___stpcpy"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____stpcpy.apply(null, arguments);
};

var real____syscall_ret = asm["___syscall_ret"];
asm["___syscall_ret"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____syscall_ret.apply(null, arguments);
};

var real____towrite = asm["___towrite"];
asm["___towrite"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____towrite.apply(null, arguments);
};

var real____unlockfile = asm["___unlockfile"];
asm["___unlockfile"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____unlockfile.apply(null, arguments);
};

var real____vfprintf_internal = asm["___vfprintf_internal"];
asm["___vfprintf_internal"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____vfprintf_internal.apply(null, arguments);
};

var real___get_environ = asm["__get_environ"];
asm["__get_environ"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real___get_environ.apply(null, arguments);
};

var real__av_bprint_alloc = asm["_av_bprint_alloc"];
asm["_av_bprint_alloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_bprint_alloc.apply(null, arguments);
};

var real__av_bprint_finalize = asm["_av_bprint_finalize"];
asm["_av_bprint_finalize"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_bprint_finalize.apply(null, arguments);
};

var real__av_bprint_grow = asm["_av_bprint_grow"];
asm["_av_bprint_grow"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_bprint_grow.apply(null, arguments);
};

var real__av_bprint_init = asm["_av_bprint_init"];
asm["_av_bprint_init"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_bprint_init.apply(null, arguments);
};

var real__av_bprint_is_complete = asm["_av_bprint_is_complete"];
asm["_av_bprint_is_complete"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_bprint_is_complete.apply(null, arguments);
};

var real__av_bprintf = asm["_av_bprintf"];
asm["_av_bprintf"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_bprintf.apply(null, arguments);
};

var real__av_free = asm["_av_free"];
asm["_av_free"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_free.apply(null, arguments);
};

var real__av_freep = asm["_av_freep"];
asm["_av_freep"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_freep.apply(null, arguments);
};

var real__av_log = asm["_av_log"];
asm["_av_log"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_log.apply(null, arguments);
};

var real__av_log_default_callback = asm["_av_log_default_callback"];
asm["_av_log_default_callback"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_log_default_callback.apply(null, arguments);
};

var real__av_malloc = asm["_av_malloc"];
asm["_av_malloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_malloc.apply(null, arguments);
};

var real__av_mallocz = asm["_av_mallocz"];
asm["_av_mallocz"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_mallocz.apply(null, arguments);
};

var real__av_realloc = asm["_av_realloc"];
asm["_av_realloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_realloc.apply(null, arguments);
};

var real__av_vbprintf = asm["_av_vbprintf"];
asm["_av_vbprintf"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_vbprintf.apply(null, arguments);
};

var real__av_vlog = asm["_av_vlog"];
asm["_av_vlog"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__av_vlog.apply(null, arguments);
};

var real__check_color_terminal = asm["_check_color_terminal"];
asm["_check_color_terminal"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__check_color_terminal.apply(null, arguments);
};

var real__colored_fputs = asm["_colored_fputs"];
asm["_colored_fputs"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__colored_fputs.apply(null, arguments);
};

var real__dispose_chunk = asm["_dispose_chunk"];
asm["_dispose_chunk"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__dispose_chunk.apply(null, arguments);
};

var real__dummy = asm["_dummy"];
asm["_dummy"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__dummy.apply(null, arguments);
};

var real__ff_lzw_decode = asm["_ff_lzw_decode"];
asm["_ff_lzw_decode"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__ff_lzw_decode.apply(null, arguments);
};

var real__ff_lzw_decode_init = asm["_ff_lzw_decode_init"];
asm["_ff_lzw_decode_init"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__ff_lzw_decode_init.apply(null, arguments);
};

var real__ff_lzw_decode_open = asm["_ff_lzw_decode_open"];
asm["_ff_lzw_decode_open"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__ff_lzw_decode_open.apply(null, arguments);
};

var real__ff_mutex_lock = asm["_ff_mutex_lock"];
asm["_ff_mutex_lock"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__ff_mutex_lock.apply(null, arguments);
};

var real__ff_mutex_unlock = asm["_ff_mutex_unlock"];
asm["_ff_mutex_unlock"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__ff_mutex_unlock.apply(null, arguments);
};

var real__fflush = asm["_fflush"];
asm["_fflush"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__fflush.apply(null, arguments);
};

var real__fmt_fp = asm["_fmt_fp"];
asm["_fmt_fp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__fmt_fp.apply(null, arguments);
};

var real__fmt_o = asm["_fmt_o"];
asm["_fmt_o"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__fmt_o.apply(null, arguments);
};

var real__fmt_u = asm["_fmt_u"];
asm["_fmt_u"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__fmt_u.apply(null, arguments);
};

var real__fmt_x = asm["_fmt_x"];
asm["_fmt_x"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__fmt_x.apply(null, arguments);
};

var real__format_line = asm["_format_line"];
asm["_format_line"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__format_line.apply(null, arguments);
};

var real__fprintf = asm["_fprintf"];
asm["_fprintf"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__fprintf.apply(null, arguments);
};

var real__fputs = asm["_fputs"];
asm["_fputs"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__fputs.apply(null, arguments);
};

var real__free = asm["_free"];
asm["_free"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__free.apply(null, arguments);
};

var real__frexp = asm["_frexp"];
asm["_frexp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__frexp.apply(null, arguments);
};

var real__fwrite = asm["_fwrite"];
asm["_fwrite"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__fwrite.apply(null, arguments);
};

var real__get_category = asm["_get_category"];
asm["_get_category"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__get_category.apply(null, arguments);
};

var real__get_level_str = asm["_get_level_str"];
asm["_get_level_str"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__get_level_str.apply(null, arguments);
};

var real__getint_654 = asm["_getint_654"];
asm["_getint_654"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__getint_654.apply(null, arguments);
};

var real__isdigit = asm["_isdigit"];
asm["_isdigit"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__isdigit.apply(null, arguments);
};

var real__lzwDecompress = asm["_lzwDecompress"];
asm["_lzwDecompress"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__lzwDecompress.apply(null, arguments);
};

var real__lzw_get_code = asm["_lzw_get_code"];
asm["_lzw_get_code"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__lzw_get_code.apply(null, arguments);
};

var real__malloc = asm["_malloc"];
asm["_malloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__malloc.apply(null, arguments);
};

var real__memchr = asm["_memchr"];
asm["_memchr"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__memchr.apply(null, arguments);
};

var real__out_653 = asm["_out_653"];
asm["_out_653"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__out_653.apply(null, arguments);
};

var real__pad_659 = asm["_pad_659"];
asm["_pad_659"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__pad_659.apply(null, arguments);
};

var real__pop_arg_656 = asm["_pop_arg_656"];
asm["_pop_arg_656"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__pop_arg_656.apply(null, arguments);
};

var real__pop_arg_long_double = asm["_pop_arg_long_double"];
asm["_pop_arg_long_double"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__pop_arg_long_double.apply(null, arguments);
};

var real__printf_core = asm["_printf_core"];
asm["_printf_core"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__printf_core.apply(null, arguments);
};

var real__pthread_self = asm["_pthread_self"];
asm["_pthread_self"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__pthread_self.apply(null, arguments);
};

var real__realloc = asm["_realloc"];
asm["_realloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__realloc.apply(null, arguments);
};

var real__sanitize = asm["_sanitize"];
asm["_sanitize"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__sanitize.apply(null, arguments);
};

var real__sbrk = asm["_sbrk"];
asm["_sbrk"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__sbrk.apply(null, arguments);
};

var real__sn_write = asm["_sn_write"];
asm["_sn_write"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__sn_write.apply(null, arguments);
};

var real__snprintf = asm["_snprintf"];
asm["_snprintf"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__snprintf.apply(null, arguments);
};

var real__strcmp = asm["_strcmp"];
asm["_strcmp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__strcmp.apply(null, arguments);
};

var real__strcpy = asm["_strcpy"];
asm["_strcpy"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__strcpy.apply(null, arguments);
};

var real__strlen = asm["_strlen"];
asm["_strlen"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__strlen.apply(null, arguments);
};

var real__try_realloc_chunk = asm["_try_realloc_chunk"];
asm["_try_realloc_chunk"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__try_realloc_chunk.apply(null, arguments);
};

var real__vfprintf = asm["_vfprintf"];
asm["_vfprintf"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__vfprintf.apply(null, arguments);
};

var real__vsnprintf = asm["_vsnprintf"];
asm["_vsnprintf"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__vsnprintf.apply(null, arguments);
};

var real__wcrtomb = asm["_wcrtomb"];
asm["_wcrtomb"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__wcrtomb.apply(null, arguments);
};

var real__wctomb = asm["_wctomb"];
asm["_wctomb"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__wctomb.apply(null, arguments);
};

var real_establishStackSpace = asm["establishStackSpace"];
asm["establishStackSpace"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_establishStackSpace.apply(null, arguments);
};

var real_stackAlloc = asm["stackAlloc"];
asm["stackAlloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackAlloc.apply(null, arguments);
};

var real_stackRestore = asm["stackRestore"];
asm["stackRestore"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackRestore.apply(null, arguments);
};

var real_stackSave = asm["stackSave"];
asm["stackSave"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackSave.apply(null, arguments);
};
Module["asm"] = asm;
var ___DOUBLE_BITS_662 = Module["___DOUBLE_BITS_662"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___DOUBLE_BITS_662"].apply(null, arguments)
};

var ___emscripten_environ_constructor = Module["___emscripten_environ_constructor"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___emscripten_environ_constructor"].apply(null, arguments)
};

var ___errno_location = Module["___errno_location"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___errno_location"].apply(null, arguments)
};

var ___fflush_unlocked = Module["___fflush_unlocked"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___fflush_unlocked"].apply(null, arguments)
};

var ___fwritex = Module["___fwritex"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___fwritex"].apply(null, arguments)
};

var ___lockfile = Module["___lockfile"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___lockfile"].apply(null, arguments)
};

var ___ofl_lock = Module["___ofl_lock"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___ofl_lock"].apply(null, arguments)
};

var ___ofl_unlock = Module["___ofl_unlock"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___ofl_unlock"].apply(null, arguments)
};

var ___pthread_self_896 = Module["___pthread_self_896"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___pthread_self_896"].apply(null, arguments)
};

var ___stdio_close = Module["___stdio_close"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___stdio_close"].apply(null, arguments)
};

var ___stdio_seek = Module["___stdio_seek"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___stdio_seek"].apply(null, arguments)
};

var ___stdio_write = Module["___stdio_write"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___stdio_write"].apply(null, arguments)
};

var ___stdout_write = Module["___stdout_write"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___stdout_write"].apply(null, arguments)
};

var ___stpcpy = Module["___stpcpy"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___stpcpy"].apply(null, arguments)
};

var ___syscall_ret = Module["___syscall_ret"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___syscall_ret"].apply(null, arguments)
};

var ___towrite = Module["___towrite"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___towrite"].apply(null, arguments)
};

var ___unlockfile = Module["___unlockfile"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___unlockfile"].apply(null, arguments)
};

var ___vfprintf_internal = Module["___vfprintf_internal"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___vfprintf_internal"].apply(null, arguments)
};

var __get_environ = Module["__get_environ"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["__get_environ"].apply(null, arguments)
};

var _av_bprint_alloc = Module["_av_bprint_alloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_bprint_alloc"].apply(null, arguments)
};

var _av_bprint_finalize = Module["_av_bprint_finalize"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_bprint_finalize"].apply(null, arguments)
};

var _av_bprint_grow = Module["_av_bprint_grow"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_bprint_grow"].apply(null, arguments)
};

var _av_bprint_init = Module["_av_bprint_init"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_bprint_init"].apply(null, arguments)
};

var _av_bprint_is_complete = Module["_av_bprint_is_complete"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_bprint_is_complete"].apply(null, arguments)
};

var _av_bprintf = Module["_av_bprintf"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_bprintf"].apply(null, arguments)
};

var _av_free = Module["_av_free"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_free"].apply(null, arguments)
};

var _av_freep = Module["_av_freep"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_freep"].apply(null, arguments)
};

var _av_log = Module["_av_log"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_log"].apply(null, arguments)
};

var _av_log_default_callback = Module["_av_log_default_callback"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_log_default_callback"].apply(null, arguments)
};

var _av_malloc = Module["_av_malloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_malloc"].apply(null, arguments)
};

var _av_mallocz = Module["_av_mallocz"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_mallocz"].apply(null, arguments)
};

var _av_realloc = Module["_av_realloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_realloc"].apply(null, arguments)
};

var _av_vbprintf = Module["_av_vbprintf"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_vbprintf"].apply(null, arguments)
};

var _av_vlog = Module["_av_vlog"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_av_vlog"].apply(null, arguments)
};

var _check_color_terminal = Module["_check_color_terminal"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_check_color_terminal"].apply(null, arguments)
};

var _colored_fputs = Module["_colored_fputs"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_colored_fputs"].apply(null, arguments)
};

var _dispose_chunk = Module["_dispose_chunk"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_dispose_chunk"].apply(null, arguments)
};

var _dummy = Module["_dummy"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_dummy"].apply(null, arguments)
};

var _ff_lzw_decode = Module["_ff_lzw_decode"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_ff_lzw_decode"].apply(null, arguments)
};

var _ff_lzw_decode_init = Module["_ff_lzw_decode_init"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_ff_lzw_decode_init"].apply(null, arguments)
};

var _ff_lzw_decode_open = Module["_ff_lzw_decode_open"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_ff_lzw_decode_open"].apply(null, arguments)
};

var _ff_mutex_lock = Module["_ff_mutex_lock"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_ff_mutex_lock"].apply(null, arguments)
};

var _ff_mutex_unlock = Module["_ff_mutex_unlock"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_ff_mutex_unlock"].apply(null, arguments)
};

var _fflush = Module["_fflush"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_fflush"].apply(null, arguments)
};

var _fmt_fp = Module["_fmt_fp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_fmt_fp"].apply(null, arguments)
};

var _fmt_o = Module["_fmt_o"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_fmt_o"].apply(null, arguments)
};

var _fmt_u = Module["_fmt_u"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_fmt_u"].apply(null, arguments)
};

var _fmt_x = Module["_fmt_x"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_fmt_x"].apply(null, arguments)
};

var _format_line = Module["_format_line"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_format_line"].apply(null, arguments)
};

var _fprintf = Module["_fprintf"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_fprintf"].apply(null, arguments)
};

var _fputs = Module["_fputs"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_fputs"].apply(null, arguments)
};

var _free = Module["_free"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_free"].apply(null, arguments)
};

var _frexp = Module["_frexp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_frexp"].apply(null, arguments)
};

var _fwrite = Module["_fwrite"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_fwrite"].apply(null, arguments)
};

var _get_category = Module["_get_category"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_get_category"].apply(null, arguments)
};

var _get_level_str = Module["_get_level_str"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_get_level_str"].apply(null, arguments)
};

var _getint_654 = Module["_getint_654"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_getint_654"].apply(null, arguments)
};

var _isdigit = Module["_isdigit"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_isdigit"].apply(null, arguments)
};

var _lzwDecompress = Module["_lzwDecompress"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_lzwDecompress"].apply(null, arguments)
};

var _lzw_get_code = Module["_lzw_get_code"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_lzw_get_code"].apply(null, arguments)
};

var _malloc = Module["_malloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_malloc"].apply(null, arguments)
};

var _memchr = Module["_memchr"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_memchr"].apply(null, arguments)
};

var _memcpy = Module["_memcpy"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_memcpy"].apply(null, arguments)
};

var _memset = Module["_memset"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_memset"].apply(null, arguments)
};

var _out_653 = Module["_out_653"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_out_653"].apply(null, arguments)
};

var _pad_659 = Module["_pad_659"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_pad_659"].apply(null, arguments)
};

var _pop_arg_656 = Module["_pop_arg_656"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_pop_arg_656"].apply(null, arguments)
};

var _pop_arg_long_double = Module["_pop_arg_long_double"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_pop_arg_long_double"].apply(null, arguments)
};

var _printf_core = Module["_printf_core"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_printf_core"].apply(null, arguments)
};

var _pthread_self = Module["_pthread_self"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_pthread_self"].apply(null, arguments)
};

var _realloc = Module["_realloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_realloc"].apply(null, arguments)
};

var _sanitize = Module["_sanitize"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_sanitize"].apply(null, arguments)
};

var _sbrk = Module["_sbrk"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_sbrk"].apply(null, arguments)
};

var _sn_write = Module["_sn_write"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_sn_write"].apply(null, arguments)
};

var _snprintf = Module["_snprintf"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_snprintf"].apply(null, arguments)
};

var _strcmp = Module["_strcmp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_strcmp"].apply(null, arguments)
};

var _strcpy = Module["_strcpy"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_strcpy"].apply(null, arguments)
};

var _strlen = Module["_strlen"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_strlen"].apply(null, arguments)
};

var _try_realloc_chunk = Module["_try_realloc_chunk"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_try_realloc_chunk"].apply(null, arguments)
};

var _vfprintf = Module["_vfprintf"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_vfprintf"].apply(null, arguments)
};

var _vsnprintf = Module["_vsnprintf"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_vsnprintf"].apply(null, arguments)
};

var _wcrtomb = Module["_wcrtomb"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_wcrtomb"].apply(null, arguments)
};

var _wctomb = Module["_wctomb"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_wctomb"].apply(null, arguments)
};

var establishStackSpace = Module["establishStackSpace"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["establishStackSpace"].apply(null, arguments)
};

var stackAlloc = Module["stackAlloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["stackAlloc"].apply(null, arguments)
};

var stackRestore = Module["stackRestore"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["stackRestore"].apply(null, arguments)
};

var stackSave = Module["stackSave"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["stackSave"].apply(null, arguments)
};

var dynCall_ii = Module["dynCall_ii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_ii"].apply(null, arguments)
};

var dynCall_iidiiii = Module["dynCall_iidiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iidiiii"].apply(null, arguments)
};

var dynCall_iiii = Module["dynCall_iiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iiii"].apply(null, arguments)
};

var dynCall_jiji = Module["dynCall_jiji"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_jiji"].apply(null, arguments)
};

var dynCall_vii = Module["dynCall_vii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_vii"].apply(null, arguments)
};

var dynCall_viiii = Module["dynCall_viiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_viiii"].apply(null, arguments)
};
;



// === Auto-generated postamble setup entry stuff ===

Module['asm'] = asm;

if (!Module["intArrayFromString"]) Module["intArrayFromString"] = function() { abort("'intArrayFromString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["intArrayToString"]) Module["intArrayToString"] = function() { abort("'intArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;
if (!Module["setValue"]) Module["setValue"] = function() { abort("'setValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getValue"]) Module["getValue"] = function() { abort("'getValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["allocate"]) Module["allocate"] = function() { abort("'allocate' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getMemory"]) Module["getMemory"] = function() { abort("'getMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["AsciiToString"]) Module["AsciiToString"] = function() { abort("'AsciiToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToAscii"]) Module["stringToAscii"] = function() { abort("'stringToAscii' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["UTF8ArrayToString"]) Module["UTF8ArrayToString"] = function() { abort("'UTF8ArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["UTF8ToString"]) Module["UTF8ToString"] = function() { abort("'UTF8ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToUTF8Array"]) Module["stringToUTF8Array"] = function() { abort("'stringToUTF8Array' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToUTF8"]) Module["stringToUTF8"] = function() { abort("'stringToUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["lengthBytesUTF8"]) Module["lengthBytesUTF8"] = function() { abort("'lengthBytesUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["UTF16ToString"]) Module["UTF16ToString"] = function() { abort("'UTF16ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToUTF16"]) Module["stringToUTF16"] = function() { abort("'stringToUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["lengthBytesUTF16"]) Module["lengthBytesUTF16"] = function() { abort("'lengthBytesUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["UTF32ToString"]) Module["UTF32ToString"] = function() { abort("'UTF32ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToUTF32"]) Module["stringToUTF32"] = function() { abort("'stringToUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["lengthBytesUTF32"]) Module["lengthBytesUTF32"] = function() { abort("'lengthBytesUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["allocateUTF8"]) Module["allocateUTF8"] = function() { abort("'allocateUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stackTrace"]) Module["stackTrace"] = function() { abort("'stackTrace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnPreRun"]) Module["addOnPreRun"] = function() { abort("'addOnPreRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnInit"]) Module["addOnInit"] = function() { abort("'addOnInit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnPreMain"]) Module["addOnPreMain"] = function() { abort("'addOnPreMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnExit"]) Module["addOnExit"] = function() { abort("'addOnExit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnPostRun"]) Module["addOnPostRun"] = function() { abort("'addOnPostRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["writeStringToMemory"]) Module["writeStringToMemory"] = function() { abort("'writeStringToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["writeArrayToMemory"]) Module["writeArrayToMemory"] = function() { abort("'writeArrayToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["writeAsciiToMemory"]) Module["writeAsciiToMemory"] = function() { abort("'writeAsciiToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addRunDependency"]) Module["addRunDependency"] = function() { abort("'addRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["removeRunDependency"]) Module["removeRunDependency"] = function() { abort("'removeRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["ENV"]) Module["ENV"] = function() { abort("'ENV' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["FS"]) Module["FS"] = function() { abort("'FS' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["FS_createFolder"]) Module["FS_createFolder"] = function() { abort("'FS_createFolder' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createPath"]) Module["FS_createPath"] = function() { abort("'FS_createPath' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createDataFile"]) Module["FS_createDataFile"] = function() { abort("'FS_createDataFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createPreloadedFile"]) Module["FS_createPreloadedFile"] = function() { abort("'FS_createPreloadedFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createLazyFile"]) Module["FS_createLazyFile"] = function() { abort("'FS_createLazyFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createLink"]) Module["FS_createLink"] = function() { abort("'FS_createLink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createDevice"]) Module["FS_createDevice"] = function() { abort("'FS_createDevice' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_unlink"]) Module["FS_unlink"] = function() { abort("'FS_unlink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["GL"]) Module["GL"] = function() { abort("'GL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["dynamicAlloc"]) Module["dynamicAlloc"] = function() { abort("'dynamicAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["warnOnce"]) Module["warnOnce"] = function() { abort("'warnOnce' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["loadDynamicLibrary"]) Module["loadDynamicLibrary"] = function() { abort("'loadDynamicLibrary' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["loadWebAssemblyModule"]) Module["loadWebAssemblyModule"] = function() { abort("'loadWebAssemblyModule' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getLEB"]) Module["getLEB"] = function() { abort("'getLEB' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getFunctionTables"]) Module["getFunctionTables"] = function() { abort("'getFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["alignFunctionTables"]) Module["alignFunctionTables"] = function() { abort("'alignFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["registerFunctions"]) Module["registerFunctions"] = function() { abort("'registerFunctions' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addFunction"]) Module["addFunction"] = function() { abort("'addFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["removeFunction"]) Module["removeFunction"] = function() { abort("'removeFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getFuncWrapper"]) Module["getFuncWrapper"] = function() { abort("'getFuncWrapper' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["prettyPrint"]) Module["prettyPrint"] = function() { abort("'prettyPrint' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["makeBigInt"]) Module["makeBigInt"] = function() { abort("'makeBigInt' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["dynCall"]) Module["dynCall"] = function() { abort("'dynCall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getCompilerSetting"]) Module["getCompilerSetting"] = function() { abort("'getCompilerSetting' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stackSave"]) Module["stackSave"] = function() { abort("'stackSave' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stackRestore"]) Module["stackRestore"] = function() { abort("'stackRestore' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stackAlloc"]) Module["stackAlloc"] = function() { abort("'stackAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["establishStackSpace"]) Module["establishStackSpace"] = function() { abort("'establishStackSpace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["print"]) Module["print"] = function() { abort("'print' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["printErr"]) Module["printErr"] = function() { abort("'printErr' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getTempRet0"]) Module["getTempRet0"] = function() { abort("'getTempRet0' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["setTempRet0"]) Module["setTempRet0"] = function() { abort("'setTempRet0' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["Pointer_stringify"]) Module["Pointer_stringify"] = function() { abort("'Pointer_stringify' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["writeStackCookie"]) Module["writeStackCookie"] = function() { abort("'writeStackCookie' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["checkStackCookie"]) Module["checkStackCookie"] = function() { abort("'checkStackCookie' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["abortStackOverflow"]) Module["abortStackOverflow"] = function() { abort("'abortStackOverflow' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["intArrayFromBase64"]) Module["intArrayFromBase64"] = function() { abort("'intArrayFromBase64' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["tryParseAsDataURI"]) Module["tryParseAsDataURI"] = function() { abort("'tryParseAsDataURI' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };if (!Module["ALLOC_NORMAL"]) Object.defineProperty(Module, "ALLOC_NORMAL", { get: function() { abort("'ALLOC_NORMAL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Module["ALLOC_STACK"]) Object.defineProperty(Module, "ALLOC_STACK", { get: function() { abort("'ALLOC_STACK' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Module["ALLOC_DYNAMIC"]) Object.defineProperty(Module, "ALLOC_DYNAMIC", { get: function() { abort("'ALLOC_DYNAMIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Module["ALLOC_NONE"]) Object.defineProperty(Module, "ALLOC_NONE", { get: function() { abort("'ALLOC_NONE' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });



// Modularize mode returns a function, which can be called to
// create instances. The instances provide a then() method,
// must like a Promise, that receives a callback. The callback
// is called when the module is ready to run, with the module
// as a parameter. (Like a Promise, it also returns the module
// so you can use the output of .then(..)).
Module['then'] = function(func) {
  // We may already be ready to run code at this time. if
  // so, just queue a call to the callback.
  if (Module['calledRun']) {
    func(Module);
  } else {
    // we are not ready to call then() yet. we must call it
    // at the same time we would call onRuntimeInitialized.
    var old = Module['onRuntimeInitialized'];
    Module['onRuntimeInitialized'] = function() {
      if (old) old();
      func(Module);
    };
  }
  return Module;
};

/**
 * @constructor
 * @extends {Error}
 * @this {ExitStatus}
 */
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}





/** @type {function(Array=)} */
function run(args) {
  args = args || Module['arguments'];

  if (runDependencies > 0) {
    return;
  }

  writeStackCookie();

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    preMain();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    assert(!Module['_main'], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
  checkStackCookie();
}
Module['run'] = run;

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var print = out;
  var printErr = err;
  var has = false;
  out = err = function(x) {
    has = true;
  }
  try { // it doesn't matter if it fails
    var flush = flush_NO_FILESYSTEM;
    if (flush) flush(0);
  } catch(e) {}
  out = print;
  err = printErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the FAQ), or make sure to emit a newline when you printf etc.');
    warnOnce('(this may also be due to not including full filesystem support - try building with -s FORCE_FILESYSTEM=1)');
  }
}

function exit(status, implicit) {
  checkUnflushedContent();

  // if this is just main exit-ing implicitly, and the status is 0, then we
  // don't need to do anything here and can just leave. if the status is
  // non-zero, though, then we need to report it.
  // (we may have warned about this earlier, if a situation justifies doing so)
  if (implicit && Module['noExitRuntime'] && status === 0) {
    return;
  }

  if (Module['noExitRuntime']) {
    // if exit() was called, we may warn the user if the runtime isn't actually being shut down
    if (!implicit) {
      err('exit(' + status + ') called, but EXIT_RUNTIME is not set, so halting execution but not exiting the runtime or preventing further async execution (build with EXIT_RUNTIME=1, if you want a true shutdown)');
    }
  } else {

    ABORT = true;
    EXITSTATUS = status;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  Module['quit'](status, new ExitStatus(status));
}

var abortDecorators = [];

function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  if (what !== undefined) {
    out(what);
    err(what);
    what = '"' + what + '"';
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';
  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = abort;

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}


  Module["noExitRuntime"] = true;

run();





// {{MODULE_ADDITIONS}}





  return Module
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
      module.exports = Module;
    else if (typeof define === 'function' && define['amd'])
      define([], function() { return Module; });
    else if (typeof exports === 'object')
      exports["Module"] = Module;
    