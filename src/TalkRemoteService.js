import { triggerEvent } from "./utils";

export class TalkRemoteService {
    constructor() {
    }

    createServiceFrame(element) {
        const { host, role } = element;
        const iframe = document.createElement('iframe');
        iframe.src = host;
        iframe.name = "talk-service";
        iframe.allow = "microphone";
        if (role === 'iframer') {
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
        if (!element.iframe) {
            throw new Error('service frame to host failed to open');
        }
        return new Promise((resolve, reject) => {

            const cleanup = receiveMessageFromFrame(element.iframe, e => {
                console.log("iframer received", e);
                if (e.data.type === 'recorded') {
                    triggerEvent(element, 'recorded', { blob: e.data.blob })
                    resolve(e.data.blob);
                    cleanup();
                } else if (e.data.type === 'error') {
                    const error = e.data.error;
                    triggerEvent(element, 'error', { error })
                    reject(error)
                    cleanup();
                }
                // replyToMessage({ type: 'reply' }, e);
            })
            sendMessageToFrame(element.iframe, { type: 'record', options });

            triggerEvent(element, 'record', {});
        })
    }

    stop(element, reason) {
        triggerEvent(element, 'stop', { reason });

        if (element.iframe) {
            receiveMessageFromFrame(element.iframe, e => {
                console.log("iframer received", e);
                // replyToMessage({ type: 'reply' }, e);
            }, { once: true })
            sendMessageToFrame(element.iframe, { type: 'stop' });
        }
    }

    async convert(element, audioBlob, options = {}) {

    }
}

function referrerOrigin() {
    if (!document.referrer) {
        return null;
    }
    const url = new URL(document.referrer);
    return `${url.protocol}//${url.host}`;
}

function replyToMessage(reply, msg) {
    if (!reply) {
        throw new Error('reply is null');
    }
    if (!msg || !msg.source) {
        throw new Error('message to reply to or its source is null');
    }
    msg.source.postMessage(reply, msg.origin);
}

function sendMessageToFrame(frame, msg) {
    if (!frame || !frame.src) {
        throw new Error('frame or frame.src is null');
    }
    const frameURL = new URL(frame.src);
    const frameOrigin = `${frameURL.protocol}//${frameURL.host}`;

    frame.contentWindow.postMessage(msg, frameOrigin);
}

function receiveMessageFromFrame(frame, receiver) {
    if (!frame || !frame.src) {
        throw new Error('frame or frame.src is null');
    }
    const frameURL = new URL(frame.src);
    const frameOrigin = `${frameURL.protocol}//${frameURL.host}`;

    const listener = e => e.origin === frameOrigin && receiver(e);
    window.addEventListener('message', listener);
    return () => {
        window.removeEventListener('message', listener);
    }
}

export default TalkRemoteService;