// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"FOZT":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.promiseCallback = promiseCallback;
exports.triggerEvent = triggerEvent;
exports.friendlyFloat = friendlyFloat;
exports.getChannelData = getChannelData;
exports.arrayBufferFromBlob = arrayBufferFromBlob;
exports.decodeAudioData = decodeAudioData;
exports.withWorker = withWorker;

/**
 * Turns a promise into callback.
 * 
 * @param {Promise} promise 
 * @param {function} cb 
 */
function promiseCallback(promise, cb) {
  return promise.then(result => cb(null, result)).catch(err => cb(err, result));
}
/**
 * Helper for dispatching a custom event.
 * Default EventInit values are implicitly used, meaning events cannot be captured nor bubbled.
 * 
 * @param {EventTarget} eventTarget 
 * @param {string} eventName 
 * @param {any} eventDetail 
 */


function triggerEvent(eventTarget, eventName, eventDetail = null) {
  eventTarget.dispatchEvent(new CustomEvent(eventName, {
    detail: eventDetail
  }));
}

function friendlyFloat(value, oldValue) {
  if (typeof value !== 'string') {
    return oldValue;
  }

  const lastChar = value.trim().substr(-1);
  let floatValue = parseFloat(value);

  if (lastChar === 'k' || lastChar === 'K') {
    floatValue *= 1000;
  }

  return floatValue;
}
/**
 * Get 'Transferable' raw audio samples from AudioBuffer.
 * This is a convenience function to pave over lack of ubiquitous copyFromChannel support.
 * 
 * @param {AudioBuffer} audioBuffer 
 * @param {number} channel 
 */


function getChannelData(audioBuffer, channel) {
  let channelData;

  if ('copyFromChannel' in audioBuffer) {
    channelData = new Float32Array(audioBuffer.length);
    audioBuffer.copyFromChannel(channelData, channel);
  } else {
    channelData = audioBuffer.getChannelData(channel).slice();
  }

  return channelData;
}

async function arrayBufferFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(blob);

    reader.onload = () => resolve(reader.result);

    reader.onerror = () => reject(reader.error);
  });
}

async function decodeAudioData(audioData, sampleRate = 48000) {
  // OfflineAudioContext is more appropriate here but plain AudioContext
  // is used to avoid potential outstanding unreleased memory issue.
  const audioCtx = new AudioContext({
    sampleRate
  });
  const audioBuffer = await audioCtx.decodeAudioData(audioData);
  return getChannelData(audioBuffer, 0);
}

async function withWorker(workerUrl, workHandler) {
  // Needs a Web Worker and WebAssembly supporting browser
  if (!window.Worker || !window.WebAssembly) {
    throw new Error('Worker and WebAssembly features not available');
  }

  return new Promise((resolve, reject) => {
    let worker;

    if (new URL(workerUrl).host === window.location.host) {
      worker = new Worker(workerUrl);
    } else {
      worker = new Worker(URL.createObjectURL(new Blob([`importScripts("${workerUrl}");`])));
    }

    worker.onmessage = msg => {
      switch (msg.data.type) {
        case 'ready':
          workHandler(worker);
          break;

        case 'done':
          worker.terminate();
          resolve(msg.data.blob);
          break;
      }
    };

    worker.onerror = err => {
      reject(err);
    };
  });
}
},{}],"uZlT":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TalkLocalService = void 0;

var _utils = require("./utils");

const AudioContext = window.AudioContext || window.webkitAudioContext;
const getUserMedia = navigator.mediaDevices ? navigator.mediaDevices.getUserMedia : navigator.getUserMedia; // HACK: Used to determine full worker URL using script tag's src attribute if available.

const currentScriptURL = document.currentScript ? new URL(document.currentScript.src, document.baseURI) : null;

function getFullScriptUrl(relativeUrl) {
  return currentScriptURL ? new URL(relativeUrl, currentScriptURL).toString() : relativeUrl;
}

const workerUrl = getFullScriptUrl("./lamemp3/worker.js");
console.log('workerUrl', workerUrl);

class TalkLocalService {
  constructor() {}

  async record(element, options) {
    if (element.stream) {
      throw new Error('already recording');
    }

    if (!window.MediaRecorder || !window.Worker || !window.WebAssembly) {
      throw new Error('Current browser is not supported by talk-recorder');
    }

    if (!getUserMedia && !element.host && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      throw new Error('HTTPS is required for media recording.');
    }

    options = Object.assign({
      type: 'opus',
      timeslice: 20,
      workerUrl
    }, options); // Use optional 'getUserMedia' field of recording call options to override.

    const getUserMediaOptions = Object.assign({}, {
      audio: true,
      video: false,
      channelCount: 1,
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true
    }, options.getUserMedia); // start capturing audio

    element.stream = await navigator.mediaDevices.getUserMedia(getUserMediaOptions);
    (0, _utils.triggerEvent)(element, 'record', {
      stream: element.stream
    });
    element.addEventListener('stop', e => {
      element.stream.getTracks().forEach(track => track.stop());
      element.stream = null;
    }, {
      once: true
    });

    try {
      let blob;

      if (options.type === 'opus') {
        blob = await this._recordOpus(element, element.stream, options);
      } else if (options.type === 'mp3') {
        blob = await this._recordMP3(element, element.stream, options);
      }

      (0, _utils.triggerEvent)(element, 'recorded', {
        blob
      });
      return blob;
    } catch (err) {
      (0, _utils.triggerEvent)(element, 'error', {
        error: err
      });
      throw err;
    }
  }

  stop(element, reason) {
    (0, _utils.triggerEvent)(element, 'stop', {
      reason
    });
  }

  async convert(element, audioBlob, options = {}) {
    (0, _utils.triggerEvent)(element, 'convert');
    options = Object.assign({}, {
      sampleRate: 48000,
      type: 'mp3',
      workerUrl
    }, options); // decode audio samples using 48000 as default input sample rate.

    const inputSampleRate = options.sampleRate || 48000;
    const audioData = await (0, _utils.arrayBufferFromBlob)(audioBlob);
    const inputPCM = await (0, _utils.decodeAudioData)(audioData, inputSampleRate);
    const bitRate = element.bitRate || 64 * 1000; // MP3-specific default bitRate
    // Until direct to MP3 encoder implemented, record as Opus first then convert as a whole.

    return (0, _utils.withWorker)(options.workerUrl, worker => {
      const CHUNK_SIZE = 8192;
      worker.postMessage({
        type: 'init',
        sampleRate: inputSampleRate,
        bitRate
      }); // send to worker in chunks

      let offset = 0;
      let remain = inputPCM.length;

      while (remain > 0) {
        const length = remain > CHUNK_SIZE ? CHUNK_SIZE : remain; // slice out a chunk into its own ArrayBuffer

        const chunk = new Float32Array(length);
        chunk.set(inputPCM.slice(offset, offset + length), 0);
        offset += length;
        remain -= length;
        worker.postMessage({
          type: 'data',
          data: chunk.buffer
        }, [chunk.buffer]);
      } // signal end of data


      worker.postMessage({
        type: 'flush'
      });
    }).then(blob => {
      (0, _utils.triggerEvent)(element, 'converted', {
        blob
      });
      return blob;
    }).catch(err => {
      (0, _utils.triggerEvent)(element, 'error', {
        error: err
      });
      throw err;
    });
  }

  async _recordOpus(element, stream, options) {
    const bitRate = element.bitRate || 32 * 1000; // Uses 32k as default bitrate for Opus podcast
    // Use optional 'MediaRecorder' field of recording call options to override.

    const mediaRecorderOptions = Object.assign({}, {
      mimeType: 'audio/webm; codecs="opus"',
      audioBitsPerSecond: bitRate
    }, options.MediaRecorder); // MediaRecorder instance had issues when reused.
    // So each recording session creates a new instance internally.

    const recorder = new MediaRecorder(stream, mediaRecorderOptions); // Stop event is used to stop recording.

    element.addEventListener('stop', ({
      detail: {
        reason
      }
    }) => {
      if (!recorder || recorder.state !== 'recording') {
        return;
      }

      recorder.stop();
    }, {
      once: true
    }); // Time-sliced blobs from MediaRecorders are not guaranteed to honor logical boundaries.
    // So blobs are merged to form a proper opus packets in webm container is returned when stopped.
    // Override optional 'timeslice' recording option to change timeslice duration (default 20ms).
    // Note that resulting audio file's duration field is not set correctly on Chrome.

    return new Promise((resolve, reject) => {
      const blobs = [];

      recorder.ondataavailable = e => {
        if (typeof e.data !== "undefined" && e.data.size > 0) {
          blobs.push(e.data);
        }
      };

      recorder.onstop = e => {
        if (blobs.length > 0) {
          resolve(new Blob(blobs, {
            type: blobs[0].type
          }));
        } else {
          resolve(null);
        }
      };

      recorder.onerror = e => {
        reject(e.error);
      };

      recorder.start(options.timeslice);
    });
  }

  async _recordMP3(element, stream, options) {
    const audioSettings = stream.getAudioTracks()[0].getSettings();
    const sampleRate = audioSettings.sampleRate || 48000;
    return (0, _utils.withWorker)(options.workerUrl, worker => {
      const bitRate = element.bitRate || 64 * 1024; // MP3-specific default bitrate for podcasting

      worker.postMessage({
        type: 'init',
        sampleRate,
        bitRate
      });

      this._processStream(element, stream, samples => {
        worker.postMessage({
          type: 'data',
          data: samples.buffer
        }, [samples.buffer]);
      });

      element.addEventListener("stop", e => {
        // signal end of data
        worker.postMessage({
          type: 'flush'
        });
      });
    });
  }

  async _processStream(element, stream, processor) {
    const audioContext = new AudioContext();
    const sourceNode = audioContext.createMediaStreamSource(stream);
    const processorNode = audioContext.createScriptProcessor(0, 1, 1);

    processorNode.onaudioprocess = e => processor((0, _utils.getChannelData)(e.inputBuffer, 0));

    sourceNode.connect(processorNode);
    processorNode.connect(audioContext.destination);
    element.addEventListener("stop", e => {
      sourceNode.disconnect();
    });
  }

}

exports.TalkLocalService = TalkLocalService;
},{"./utils":"FOZT"}],"iZjX":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TalkRemoteService = void 0;

var _utils = require("./utils");

class TalkRemoteService {
  constructor() {}

  createServiceFrame(element) {
    const {
      host,
      role
    } = element;
    const iframe = document.createElement('iframe');
    iframe.src = host;
    iframe.name = "talk-service";
    iframe.allow = "microphone; autoplay";

    if (role === 'framer') {
      iframe.width = 0;
      iframe.height = 0;
      iframe.style.display = 'none';
    } else {
      iframe.width = 500;
      iframe.height = 500;
      iframe.style.border = 'none';
    }

    return iframe;
  }

  async record(element, options) {
    if (!element.iframePort) {
      throw new Error('service frame to host failed to open');
    }

    return new Promise((resolve, reject) => {
      element.iframePort.addEventListener('recorded', e => {
        const msg = e.detail;
        (0, _utils.triggerEvent)(element, msg.type, msg);
        resolve(msg.blob);
      }, {
        once: true
      });
      element.iframePort.addEventListener('error', e => {
        const msg = e.detail;
        (0, _utils.triggerEvent)(element, msg.type, msg);
        reject(msg.error);
      }, {
        once: true
      });
      element.iframePort.postMessage({
        type: 'record',
        options
      });
      (0, _utils.triggerEvent)(element, 'record', {});
    });
  }

  stop(element, reason) {
    (0, _utils.triggerEvent)(element, 'stop', {
      reason
    });

    if (element.iframePort) {
      element.iframePort.postMessage({
        type: 'stop'
      });
    }
  }

  async convert(element, audioBlob, options = {}) {
    if (!element.iframePort) {
      throw new Error('service frame to host failed to open');
    }

    return new Promise((resolve, reject) => {
      element.iframePort.addEventListener('converted', e => {
        const msg = e.detail;
        (0, _utils.triggerEvent)(element, msg.type, msg);
        resolve(msg.blob);
      }, {
        once: true
      });
      element.iframePort.addEventListener('error', e => {
        const msg = e.detail;
        (0, _utils.triggerEvent)(element, msg.type, msg);
        reject(msg.error);
      }, {
        once: true
      });
      element.iframePort.postMessage({
        type: 'convert',
        blob: audioBlob,
        options
      });
      (0, _utils.triggerEvent)(element, 'convert', {});
    });
  }

}

exports.TalkRemoteService = TalkRemoteService;
},{"./utils":"FOZT"}],"z1SI":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FramePort = void 0;

/**
 * Create port to an iframe element:
 * 
 *      const iframePort = new FramePort(iframeEl);
 * 
 * Create port to parent window:
 * 
 *      const parentPort = new FramePort(window.parent);
 * 
 * Post a message:
 * 
 *      port.postMessage(msg, [transferables]);
 * 
 * Wait for a specific message type:
 * 
 *      port.addEventListener('recorded', msg => console.log('recorded blob', msg.blob));
 * 
 * Send a request and wait for response:
 * 
 *      const response = await port.sendRequest(request, [transferables]);
 * 
 * Send a message in response to a request:
 * 
 *      if (port.isRequest(msg)) port.sendResponse(msg, response);
 * 
 * Send error in response to a request:
 * 
 *      if (port.isRequest(msg) && error) port.sendError(msg, error);
 * 
 */
class FramePort extends EventTarget {
  constructor(frameOrParent) {
    super();
    if (!frameOrParent) throw new Error('null FramePort constructor argument');

    if (frameOrParent instanceof HTMLIFrameElement) {
      if (!frameOrParent.src) throw new Error('null iframe.src');
      this.target = frameOrParent.contentWindow;
      this.origin = new URL(frameOrParent.src).origin;
    } else {
      if (frameOrParent !== parent) throw new Error("wrong parent");
      if (frameOrParent === window) throw new Error("not framed");
      this.target = frameOrParent;
      this.origin = new URL(document.referrer).origin;
    }

    this._reqCount = 0;
    this._receivers = {};

    this._listener = e => e.origin === this.origin && this._receiveMessage(e);

    window.addEventListener('message', this._listener);
  }

  close() {
    window.removeEventListener("message", this._listener);
    this.target = null;
    this._receivers = {};
    this._listener = null;
  }

  postMessage(msg, transfers) {
    if (!msg) throw new Error('null msg');
    this.target.postMessage(msg, this.origin, transfers);
  }

  sendRequest(request, transfers) {
    return new Promise((resolve, reject) => {
      this._registerRequest(request, response => response.type !== 'error' ? resolve(response) : reject(response.error));

      this.postMessage(request, transfers);
    });
  }

  isRequest(msg) {
    return '_reqId' in msg;
  }

  sendResponse(request, response, transfers) {
    this._registerResponse(request, response);

    this.postMessage(response, transfers);
  }

  sendError(request, error) {
    this.sendResponse(request, {
      type: 'error',
      error
    });
  }

  _receiveMessage(e) {
    const msg = e.data;

    if (!this._dispatchResponse(msg)) {
      this.dispatchEvent(new CustomEvent(msg.type, {
        detail: msg
      }));
    }
  }

  _registerRequest(msg, receiver) {
    msg._reqId = ++this._reqCount;
    this._receivers[msg._reqId] = receiver;
  }

  _registerResponse(request, response) {
    response._resId = request._reqId;
  }

  _dispatchResponse(msg) {
    const resId = msg._resId;

    if (!resId || !this._receivers[resId]) {
      return false;
    }

    this._receivers[resId](msg);

    delete this._receivers[resId];
    return true;
  }

}

exports.FramePort = FramePort;
},{}],"TnXr":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TalkRecorder = void 0;

var _TalkLocalService = require("./TalkLocalService");

var _TalkRemoteService = require("./TalkRemoteService");

var _FramePort = require("./FramePort");

var _utils = require("./utils");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class TalkRecorder extends HTMLElement {
  // Lowercased names of modifiable attributes to receive attributeChangedCallback on.
  constructor() {
    super();
  } // Callback used to notify when an attribute in `observedAttributes` list changes value.
  // Also called before connectedCallback with each attribute's initial value.
  // Attributes covered include custom as well as built-in attributes, like style.
  // NOTE: attribute name will be in lowercase as specfied in the HTML spec.


  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'bitrate':
        this.bitRate = (0, _utils.friendlyFloat)(newValue, oldValue);
        break;

      case 'host':
        this.host = newValue;
        break;

      case 'role':
        console.log('role', {
          oldValue,
          newValue
        });

        if (typeof newValue === 'string') {
          this.role = newValue.trim().toLowerCase();
        }

        break;

      default:
        break;
    }
  } // Callback to notify custom element has been inserted into document.


  connectedCallback() {
    ensureInit.apply(this);
  } // Callback to notify custom element has been removed from document.


  disconnectedCallback() {} // Callback to notify custom element's parentNode changes


  adoptedCallback() {}

  isSupported() {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && window.Worker && window.WebAssembly;
  }

  async record(options = {}) {
    ensureInit.apply(this);
    options = Object.assign({}, {
      type: 'opus'
    }, options);

    if (options.type !== 'opus' && options.type !== 'mp3') {
      throw new Error('unknown recording type');
    }

    return this.service.record(this, options);
  }

  async stop(reason = 'finish') {
    if (this.service) {
      return this.service.stop(this, reason);
    }
  }

  async convert(audioBlob, options = {}) {
    ensureInit.apply(this);
    return this.service.convert(this, audioBlob, options);
  }

} // On-demand initialization allows class to be used without inserted.


exports.TalkRecorder = TalkRecorder;

_defineProperty(TalkRecorder, "observedAttributes", ["bitrate", "host", "role"]);

function ensureInit() {
  if (this._inited) {
    return;
  }

  this._inited = true;

  if (this.host) {
    this.service = new _TalkRemoteService.TalkRemoteService();
    this.iframe = this.service.createServiceFrame(this);
    this.appendChild(this.iframe);
    this.iframePort = new _FramePort.FramePort(this.iframe);
  } else {
    this.service = new _TalkLocalService.TalkLocalService();

    if (this.role === 'framed' && parent !== window) {
      this.parentPort = new _FramePort.FramePort(parent);
      this.parentPort.addEventListener('record', e => {
        const msg = e.detail;
        this.record(msg.options);
      });
      this.parentPort.addEventListener('stop', e => {
        const msg = e.detail;
        this.stop(msg.reason);
      });
      this.parentPort.addEventListener('convert', e => {
        const msg = e.detail;
        this.convert(msg.blob, msg.options);
      });
      this.addEventListener('recorded', e => {
        const {
          blob
        } = e.detail;
        this.parentPort.postMessage({
          type: 'recorded',
          blob
        });
      });
      this.addEventListener('converted', e => {
        const {
          blob
        } = e.detail;
        this.parentPort.postMessage({
          type: 'converted',
          blob
        });
      });
    }
  }
}
},{"./TalkLocalService":"uZlT","./TalkRemoteService":"iZjX","./FramePort":"z1SI","./utils":"FOZT"}],"q5gj":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _TalkRecorder = require("./TalkRecorder");

Object.keys(_TalkRecorder).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _TalkRecorder[key];
    }
  });
});

if (typeof window !== 'undefined') {
  window.TalkRecorder = _TalkRecorder.TalkRecorder;

  if ('customElements' in window) {
    customElements.define("talk-recorder", _TalkRecorder.TalkRecorder);
  }
}
},{"./TalkRecorder":"TnXr"}]},{},["q5gj"], null)
//# sourceMappingURL=/talk-recorder.js.map