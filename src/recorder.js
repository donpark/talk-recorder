import "regenerator-runtime/runtime";
export * from "./TalkRecorder";
import { TalkRecorder } from "./TalkRecorder";

if (typeof window !== 'undefined') {
    window.TalkRecorder = TalkRecorder;
    if ('customElements' in window) {
        customElements.define("talk-recorder", TalkRecorder);
    }
}
