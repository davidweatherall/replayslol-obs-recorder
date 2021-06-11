class BrowserRecorder {

    filePath: string = "";

    errCallbackFunc: (err: any) => void = console.log;
    callbackFunc = () => {};
    startCallbackFunc = () => {};

    constructor(window: any, electron: any) {
        //
    }

    setCallbackFunc(func: () => void) {
        this.callbackFunc = func;
    }

    setStartCallback(func: () => void) {
        this.startCallbackFunc = func;
    }

    startLoading() {
        //
    }

    async startRecording(videoPath: string) {

        this.filePath = videoPath;

    }

    stopRecording() {
        
    }
}


class NodeRecorder {

    callbackFunc = () => {};
    startCallbackFunc = () => {};

    setCallbackFunc(func: () => void) {
        this.callbackFunc = func;
    }

    setStartCallback(func: () => void) {
        this.startCallbackFunc = func;
    }

    startLoading() {
        //
    }

    async startRecording(videoPath: string) {

    }

    stopRecording() {

    }
}

module.exports = {
    BrowserRecorder,
    NodeRecorder
};