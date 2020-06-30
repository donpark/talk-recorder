import { TalkLocalService } from "./TalkLocalService";
import { TalkRemoteService } from "./TalkRemoteService"
import { FramePort } from "./FramePort";
import { friendlyFloat } from "./utils";

export class TalkRecorder extends HTMLElement {
    // Lowercased names of modifiable attributes to receive attributeChangedCallback on.
    static observedAttributes = ["bitrate", "host", "role"];

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
            case 'host':
                this.host = newValue;
                break;
            case 'role':
                console.log('role', { oldValue, newValue });
                if (typeof newValue === 'string') {
                    this.role = newValue.trim().toLowerCase();
                }
                break;
            default:
                break;
        }
    }

    // Callback to notify custom element has been inserted into document.
    connectedCallback() {
        ensureInit.apply(this);
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
        ensureInit.apply(this);

        options = Object.assign({}, {
            type: 'opus',
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
}

// On-demand initialization allows class to be used without inserted.
function ensureInit() {
    if (this._inited) {
        return;
    }
    this._inited = true;
    if (this.host) {
        this.service = new TalkRemoteService();
        this.iframe = this.service.createServiceFrame(this);
        this.appendChild(this.iframe);
        this.iframePort = new FramePort(this.iframe);
    } else {
        this.service = new TalkLocalService();

        if (this.role === 'framed' && parent !== window) {
            this.parentPort = new FramePort(parent);
            this.parentPort.addEventListener('record', e => {
                const msg = e.detail;
                this.record(msg.options)
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
                const { blob } = e.detail;
                this.parentPort.postMessage({ type: 'recorded', blob })
            })
            this.addEventListener('converted', e => {
                const { blob } = e.detail;
                this.parentPort.postMessage({ type: 'converted', blob });
            })
        }
    }
}
