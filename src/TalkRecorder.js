import { TalkLocalService } from "./TalkLocalService";
import { TalkRemoteService } from "./TalkRemoteService"
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
        if (this.host) {
            this.service = new TalkRemoteService();
            this.iframe = this.service.createServiceFrame(this);
            this.appendChild(this.iframe);
        } else {
            this.service = new TalkLocalService();

            if (this.role === 'iframed' && parent) {
                let iframerOrigin;
                const cleanup = receiveMessageFromParent(e => {
                    iframerOrigin = e.origin;
                    switch (e.data.type) {
                        case 'record':
                            this.record(e.data.options);
                            break;
                        case 'stop':
                            this.stop(e.data.reason);
                            break;
                        case 'convert':
                            console.log('convert requested', e.data);
                            this.convert(e.data.blob, e.data.options);
                            break;
                        default:
                            console.error('unknown message type', e.data);
                    }
                })

                this.addEventListener('recorded', e => {
                    const { blob } = e.detail;
                    if (blob && iframerOrigin) {
                        parent.postMessage({
                            type: 'recorded',
                            blob,
                        }, iframerOrigin)
                    }
                })
                this.addEventListener('converted', e => {
                    const { blob } = e.detail;
                    if (blob && iframerOrigin) {
                        parent.postMessage({
                            type: 'converted',
                            blob,
                        }, iframerOrigin)
                    }
                })
            }
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
        options = Object.assign({}, {
            type: 'opus',
        }, options);

        if (options.type !== 'opus' && options.type !== 'mp3') {
            throw new Error('unknown recording type');
        }

        return this.service.record(this, options);
    }

    async stop(reason = 'finish') {
        return this.service.stop(this, reason);
    }

    async convert(audioBlob, options = {}) {
        return this.service.convert(this, audioBlob, options);
    }
}

function receiveMessageFromParent(receiver) {
    const listener = e => e.source === parent && receiver(e);
    window.addEventListener('message', listener);
    return () => {
        window.removeEventListener('message', listener);
    }
}
