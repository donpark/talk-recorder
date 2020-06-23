/**
 * Turns a promise into callback.
 * 
 * @param {Promise} promise 
 * @param {function} cb 
 */
export function promiseCallback(promise, cb) {
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
export function triggerEvent(eventTarget, eventName, eventDetail = null) {
    eventTarget.dispatchEvent(new CustomEvent(eventName, { detail: eventDetail }));
}

export function friendlyFloat(value, oldValue) {
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
