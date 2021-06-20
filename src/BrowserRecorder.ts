class BrowserRecorder {

    filePath: string = "";

    errCallbackFunc: (err: any) => void = console.log;
    callbackFunc = () => {};
    startCallbackFunc = () => {};

    constructor(window: any, electron: any, logger: any) {
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

module.exports = { BrowserRecorder };