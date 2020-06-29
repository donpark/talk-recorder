import { triggerEvent } from "./utils";

export class TalkRemoteService {
    constructor() {
    }

    createServiceFrame(element) {
        const { host, role } = element;
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
                triggerEvent(element, msg.type, msg)
                resolve(msg.blob);
            }, { once: true });
            element.iframePort.addEventListener('error', e => {
                const msg = e.detail;
                triggerEvent(element, msg.type, msg)
                reject(msg.error)
            }, { once: true });
            element.iframePort.postMessage({
                type: 'record',
                options,
            })
            triggerEvent(element, 'record', {});
        })
    }

    stop(element, reason) {
        triggerEvent(element, 'stop', { reason });

        if (element.iframePort) {
            element.iframePort.postMessage({ type: 'stop' });
        }
    }

    async convert(element, audioBlob, options = {}) {
        if (!element.iframePort) {
            throw new Error('service frame to host failed to open');
        }

        return new Promise((resolve, reject) => {
            element.iframePort.addEventListener('converted', e => {
                const msg = e.detail;
                triggerEvent(element, msg.type, msg)
                resolve(msg.blob);
            }, { once: true });
            element.iframePort.addEventListener('error', e => {
                const msg = e.detail;
                triggerEvent(element, msg.type, msg)
                reject(msg.error)
            }, { once: true });
            element.iframePort.postMessage({
                type: 'convert',
                blob: audioBlob,
                options,
            })
            triggerEvent(element, 'convert', {});
        })
    }
}
