import {
    arrayBufferFromBlob,
    decodeAudioData,
    getChannelData,
    triggerEvent,
    withWorker
} from "./utils";

const AudioContext = window.AudioContext || window.webkitAudioContext;
const getUserMedia = navigator.mediaDevices ? navigator.mediaDevices.getUserMedia : navigator.getUserMedia;

// HACK: Used to determine full worker URL using script tag's src attribute if available.
const currentScriptURL = document.currentScript ? new URL(document.currentScript.src, document.baseURI) : null;
function getFullScriptUrl(relativeUrl) {
    return currentScriptURL ? new URL(relativeUrl, currentScriptURL).toString() : relativeUrl;
}
const workerUrl = getFullScriptUrl("./lamemp3/worker.js");
console.log('workerUrl', workerUrl);

export class TalkLocalService {
    constructor() {
    }

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
            workerUrl,
        }, options)

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
        element.stream = await navigator.mediaDevices.getUserMedia(getUserMediaOptions);

        triggerEvent(element, 'record', { stream: element.stream });

        element.addEventListener('stop', e => {
            element.stream.getTracks().forEach(track => track.stop());
            element.stream = null;
        }, { once: true });

        try {
            let blob;
            if (options.type === 'opus') {
                blob = await this._recordOpus(element, element.stream, options);
            } else if (options.type === 'mp3') {
                blob = await this._recordMP3(element, element.stream, options);
            }
            triggerEvent(element, 'recorded', { blob });
            return blob;
        } catch (err) {
            triggerEvent(element, 'error', { error: err });
            throw err;
        }
    }

    stop(element, reason) {
        triggerEvent(element, 'stop', { reason });
    }

    async convert(element, audioBlob, options = {}) {
        triggerEvent(element, 'convert');

        options = Object.assign({}, {
            sampleRate: 48000,
            type: 'mp3',
            workerUrl,
        }, options);

        // decode audio samples using 48000 as default input sample rate.
        const inputSampleRate = options.sampleRate || 48000;
        const audioData = await arrayBufferFromBlob(audioBlob);
        const inputPCM = await decodeAudioData(audioData, inputSampleRate);
        const bitRate = element.bitRate || 64 * 1000; // MP3-specific default bitRate

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
            triggerEvent(element, 'converted', { blob });
            return blob;
        }).catch(err => {
            triggerEvent(element, 'error', { error: err });
            throw err;
        })
    }

    async _recordOpus(element, stream, options) {
        const bitRate = element.bitRate || (32 * 1000); // Uses 32k as default bitrate for Opus podcast

        // Use optional 'MediaRecorder' field of recording call options to override.
        const mediaRecorderOptions = Object.assign({}, {
            mimeType: 'audio/webm; codecs="opus"',
            audioBitsPerSecond: bitRate,
        }, options.MediaRecorder);

        // MediaRecorder instance had issues when reused.
        // So each recording session creates a new instance internally.
        const recorder = new MediaRecorder(stream, mediaRecorderOptions);

        // Stop event is used to stop recording.
        element.addEventListener('stop', ({ detail: { reason } }) => {
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

    async _recordMP3(element, stream, options) {
        const audioSettings = stream.getAudioTracks()[0].getSettings();
        const sampleRate = audioSettings.sampleRate || 48000;
        return withWorker(options.workerUrl, (worker) => {
            const bitRate = element.bitRate || (64 * 1024); // MP3-specific default bitrate for podcasting
            worker.postMessage({
                type: 'init',
                sampleRate,
                bitRate
            });

            this._processStream(element, stream, (samples) => {
                worker.postMessage({
                    type: 'data',
                    data: samples.buffer,
                }, [samples.buffer]);
            })

            element.addEventListener("stop", e => {
                // signal end of data
                worker.postMessage({
                    type: 'flush',
                });
            })
        })
    }

    async _processStream(element, stream, processor) {
        const audioContext = new AudioContext()

        const sourceNode = audioContext.createMediaStreamSource(stream);

        const processorNode = audioContext.createScriptProcessor(0, 1, 1);
        processorNode.onaudioprocess = (e) => processor(getChannelData(e.inputBuffer, 0))

        sourceNode.connect(processorNode);
        processorNode.connect(audioContext.destination);

        element.addEventListener("stop", e => {
            sourceNode.disconnect();
        })
    }
}
