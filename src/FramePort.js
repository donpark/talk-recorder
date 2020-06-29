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
export class FramePort extends EventTarget {

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
            this._registerRequest(request, (response) => response.type !== 'error' ? resolve(response) : reject(response.error));
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
        this.sendResponse(request, { type: 'error', error });
    }

    _receiveMessage(e) {
        const msg = e.data;
        if (!this._dispatchResponse(msg)) {
            this.dispatchEvent(new CustomEvent(msg.type, { detail: msg }));
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
