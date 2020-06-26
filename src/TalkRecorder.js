import { getChannelData, friendlyFloat, triggerEvent } from "./utils";

const AudioContext = window.AudioContext || window.webkitAudioContext;
const OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
const getUserMedia = navigator.mediaDevices ? navigator.mediaDevices.getUserMedia : navigator.getUserMedia;

// HACK: determine default worker URL using script tag's src attribute if available.
let workerUrl = "./lamemp3/worker.js";
if (document.currentScript && document.currentScript.src) {
    const scriptUrl = new URL(document.currentScript.src, document.baseURI).toString();
    const scriptBaseUrl = scriptUrl.substr(0, scriptUrl.lastIndexOf('/'));
    workerUrl = `${scriptBaseUrl}/lamemp3/worker.js`;
}
// console.log('default workerUrl', workerUrl);


export class TalkRecorder extends HTMLElement {
    // Lowercased names of modifiable attributes to receive attributeChangedCallback on.
    static observedAttributes = ["bitrate", "headless", "host"];

    constructor() {
        super();
    }

    // Callback used to notify when an attribute in `observedAttributes` list changes value.
    // Also called before connectedCallback with each attribute's initial value.
    // Attributes covered include custom as well as built-in attributes, like style.
    // NOTE: attribute name will be in lowercase as specfied in the HTML spec.
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'bitrate':
                this.bitRate = friendlyFloat(newValue, oldValue);
                break;
            case 'headless':
                this.headless = !!newValue;
                break;
            case 'host':
                this.host = newValue;
                break;
            default:
                break;
        }
    }

    // Callback to notify custom element has been inserted into document.
    connectedCallback() {
        if (this.host) {
            this.iframe = createServiceFrame(this.host, this.headless);
            this.appendChild(this.iframe);
        }
    }

    // Callback to notify custom element has been removed from document.
    disconnectedCallback() {
    }

    // Callback to notify custom element's parentNode changes
    adoptedCallback() {
    }

    isSupported() {
        return (
            navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
            window.MediaRecorder &&
            window.Worker &&
            window.WebAssembly
        );
    }

    async record(options = {}) {

        if (this.iframe) {

        }

        options = Object.assign({}, {
            type: 'opus',
            timeslice: 20,
            workerUrl,
        }, options);

        if (options.type !== 'opus' && options.type !== 'mp3') {
            throw new Error('unknown recording type');
        }

        triggerEvent(this, 'record');

        if (this.host) {
            return this._recordOffsite(options);
        } else {
            return this._recordOnsite(options);
        }
    }

    async stop(reason = 'finish') {
        triggerEvent(this, 'stop', { reason });
    }

    async convert(audioBlob, options = {}) {

        triggerEvent(this, 'convert');

        options = Object.assign({}, {
            sampleRate: 48000,
            type: 'mp3',
            workerUrl,
        }, options);

        // decode audio samples using 48000 as default input sample rate.
        const inputSampleRate = options.sampleRate || 48000;
        const audioData = await arrayBufferFromBlob(audioBlob);
        const inputPCM = await decodeAudioData(audioData, inputSampleRate);
        const bitRate = this.bitRate || 64 * 1000; // MP3-specific default bitRate

        // Until direct to MP3 encoder implemented, record as Opus first then convert as a whole.
        return withWorker(options.workerUrl, (worker) => {
            const CHUNK_SIZE = 8192;
            worker.postMessage({
                type: 'init',
                sampleRate: inputSampleRate,
                bitRate
            });

            // send to worker in chunks
            let offset = 0;
            let remain = inputPCM.length;
            while (remain > 0) {
                const length = remain > CHUNK_SIZE ? CHUNK_SIZE : remain;

                // slice out a chunk into its own ArrayBuffer
                const chunk = new Float32Array(length);
                chunk.set(inputPCM.slice(offset, offset + length), 0);
                offset += length;
                remain -= length;

                worker.postMessage({
                    type: 'data',
                    data: chunk.buffer,
                }, [chunk.buffer]);
            }

            // signal end of data
            worker.postMessage({
                type: 'flush',
            });
        }).then(blob => {
            triggerEvent(this, 'converted', { blob });
            return blob;
        }).catch(err => {
            triggerEvent(this, 'error', { error: err });
            throw err;
        })
    }

    async _recordOffsite(options) {
        if (!this.iframe) {
            throw new Error('service frame to host failed to open');
        }
        const hostURL = new URL(this.host);
        const targetOrigin = `${hostURL.protocol}//${hostURL.host}`;
        window.addEventListener('message', e => {
            if (e.origin !== targetOrigin) {
                return;
            }
            console.log("iframer received", e);
        })
        console.log('_recordOffset', {
            iframe: this.iframe,
            serviceWindow: window.frames['talk-service'],
            contentWindow: this.iframe.contentWindow,
        })
        console.log('targetOrigin', targetOrigin)
        this.iframe.contentWindow.postMessage({ type: 'record', options }, targetOrigin);
    }

    async _recordOnsite(options) {
        if (this.stream) {
            throw new Error('already recording');
        }
        if (!window.MediaRecorder || !window.Worker || !window.WebAssembly) {
            throw new Error('Current browser is not supported by talk-recorder');
        }
        if (!getUserMedia && !this.host && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            throw new Error('HTTPS is required for media recording.');
        }

        // Use optional 'getUserMedia' field of recording call options to override.
        const getUserMediaOptions = Object.assign({}, {
            audio: true,
            video: false,
            channelCount: 1,
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true
        }, options.getUserMedia);

        // start capturing audio
        this.stream = await navigator.mediaDevices.getUserMedia(getUserMediaOptions);
        this.addEventListener('stop', e => {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }, { once: true });

        triggerEvent(this, 'stream', { stream: this.stream });

        try {
            let blob;
            if (options.type === 'opus') {
                blob = await this._recordOpus(this.stream, options);
            } else if (options.type === 'mp3') {
                blob = await this._recordMP3(this.stream, options);
            }
            triggerEvent(this, 'recorded', { blob });
            return blob;
        } catch (err) {
            triggerEvent(this, 'error', { error: err });
            throw err;
        }
    }

    async _recordOpus(stream, options) {
        const bitRate = this.bitRate || (32 * 1000); // Uses 32k as default bitrate for Opus podcast

        // Use optional 'MediaRecorder' field of recording call options to override.
        const mediaRecorderOptions = Object.assign({}, {
            mimeType: 'audio/webm; codecs="opus"',
            audioBitsPerSecond: bitRate,
        }, options.MediaRecorder);

        // MediaRecorder instance had issues when reused.
        // So each recording session creates a new instance internally.
        const recorder = new MediaRecorder(stream, mediaRecorderOptions);

        // Stop event is used to stop recording.
        this.addEventListener('stop', ({ detail: { reason } }) => {
            if (!recorder || recorder.state !== 'recording') {
                return;
            }
            recorder.stop()
        }, { once: true });

        // Time-sliced blobs from MediaRecorders are not guaranteed to honor logical boundaries.
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
                    resolve(new Blob(blobs, { type: blobs[0].type }))
                } else {
                    resolve(null);
                }
            };
            recorder.onerror = e => {
                reject(e.error);
            }
            recorder.start(options.timeslice);
        })
    }

    async _recordMP3(stream, options) {
        const audioSettings = stream.getAudioTracks()[0].getSettings();
        const sampleRate = audioSettings.sampleRate || 48000;
        return withWorker(options.workerUrl, (worker) => {
            const bitRate = this.bitRate || (64 * 1024); // MP3-specific default bitrate for podcasting
            worker.postMessage({
                type: 'init',
                sampleRate,
                bitRate
            });

            this._processStream(stream, (samples) => {
                worker.postMessage({
                    type: 'data',
                    data: samples.buffer,
                }, [samples.buffer]);
            })

            this.addEventListener("stop", e => {
                // signal end of data
                worker.postMessage({
                    type: 'flush',
                });
            })
        })
    }

    async _processStream(stream, processor) {
        const audioContext = new AudioContext()

        const sourceNode = audioContext.createMediaStreamSource(stream);

        const processorNode = audioContext.createScriptProcessor(0, 1, 1);
        processorNode.onaudioprocess = (e) => processor(getChannelData(e.inputBuffer, 0))

        sourceNode.connect(processorNode);
        processorNode.connect(audioContext.destination);

        this.addEventListener("stop", e => {
            sourceNode.disconnect();
        })
    }
}

/**
 * Reads all of blob data into an ArrayBuffer.
 * 
 * @param {Blob} blob 
 * 
 * @result {ArrayBuffer}
 */
async function arrayBufferFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(blob);
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
    });
}

/**
 * Decode compressed audio data into uncompressed (PCM) audio data.
 * 
 * @param {ArrayBuffer} audioData
 * 
 * @result {Float32Array}
 */
async function decodeAudioData(audioData, sampleRate = 48000) {
    // OfflineAudioContext is more appropriate here but plain AudioContext
    // is used to avoid potential outstanding unreleased memory issue.
    const audioCtx = new AudioContext({ sampleRate });
    const audioBuffer = await audioCtx.decodeAudioData(audioData);
    return getChannelData(audioBuffer, 0);
}

function withWorker(workerUrl, workHandler) {
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
        worker.onmessage = (msg) => {
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
        worker.onerror = (err) => {
            reject(err);
        };
    });
}

function createServiceFrame(host, headless) {
    const iframe = document.createElement('iframe');
    iframe.src = host;
    iframe.name = "talk-service";
    iframe.allow = "microphone";
    if (headless) {
        iframe.width = 0;
        iframe.height = 0;
        iframe.style.display = 'none';
    } else {
        iframe.width = headless ? 0 : 500;
        iframe.height = headless ? 0 : 500;
        iframe.style.border = 'none';
    }
    return iframe;
}