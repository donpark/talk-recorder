// May load twice with importScripts is unavailable first time.
if ('function' === typeof importScripts) {
    // This loads WebAssembly module and start initialization.
    importScripts('_vmsg.js');

    // WebAssembly module takes time to load and initialize
    // so this waits til initialization is done before signaling main thread.
    Module['onRuntimeInitialized'] = () => {
        postMessage({ type: 'ready' });
    };
}

let ref;
let pcm_l;

function encoder_init(sampleRate) {
    ref = _vmsg_init(sampleRate);
    if (!ref) {
        throw new Error(`_vmsg_init_failed`);
    }
    const pcm_l_ref = new Uint32Array(wasmMemory.buffer, ref, 1)[0];
    pcm_l = new Float32Array(wasmMemory.buffer, pcm_l_ref);
}

function encoder_data(data) {
    pcm_l.set(data, 0);
    const status = _vmsg_encode(ref, data.length);
    if (status < 0) {
        throw new Error(`_vmsg_encode_error_${status}`);
    }
}

function encoder_flush() {
    const status = _vmsg_flush(ref);
    if (status < 0) {
        throw new Error(`_vmsg_flush_error_${status}`);
    }
    const mp3_ref = new Uint32Array(wasmMemory.buffer, ref + 4, 1)[0];
    const size = new Uint32Array(wasmMemory.buffer, ref + 8, 1)[0];
    const mp3 = new Uint8Array(wasmMemory.buffer, mp3_ref, size);
    const blob = new Blob([mp3], { type: "audio/mpeg" });
    postMessage({
        type: 'done',
        blob: blob,
    });
}

function encoder_free() {
    if (ref) {
        _vmsg_free(ref);
        ref = null;
        pcm_l = null;
    }
}

onmessage = (msg) => {
    try {
        switch (msg.data.type) {
            case 'init':
                encoder_init(msg.data.sampleRate);
                break;
            case 'data':
                encoder_data(new Float32Array(msg.data.data));
                break;
            case 'flush':
                encoder_flush();
                encoder_free();
                break;
            default:
                console.error(`unknown_message_type: ${msg.data.type}`)
                break;
        }
    } catch (err) {
        encoder_free();
        throw err;
    }
};
