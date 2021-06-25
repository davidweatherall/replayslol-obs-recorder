const osn = require("obs-studio-node");
import { v4 } from "uuid";
import path from "path";
import fs from "fs";
import mv from "mv";

class NodeRecorder {

    filePath: string = "";
    videoName: string = "";
    vidDir: string = "";
    screen: any;
    logger: any;

    callbackFunc = () => {};
    startCallbackFunc = () => {};

    setCallbackFunc(func: () => void) {
        this.callbackFunc = func;
        this.logger("Setting new callback func", func);
    }

    setStartCallback(func: () => void) {
        this.startCallbackFunc = func;
    }

    constructor(electron: any, logger: any) {
        this.screen = electron.screen;
        this.logger = logger;
    }

    startLoading() {
        //
    }

    
    scene: any;
    initialised: boolean = false;

    displayInfo() {
        const primaryDisplay = this.screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        const { scaleFactor } = primaryDisplay;

        return {
            width,
            height,
            scaleFactor:    scaleFactor,
            aspectRatio:    width / height,
            physicalWidth:  width * scaleFactor,
            physicalHeight: height * scaleFactor,
        }
    }

    setupScene() {
        const dummySource = osn.InputFactory.create("game_capture", "league game capture");

        const { physicalWidth, physicalHeight, aspectRatio } = this.displayInfo();
        
        const videoSources = dummySource.properties.get("window").details.items;
        this.logger(videoSources);
      
        const realLeagueWindow = videoSources.find((window: any) => window.name === "[League of Legends.exe]: League of Legends (TM) Client");
      
        this.logger('real leg', realLeagueWindow);
      
        const videoSource = osn.InputFactory.create("game_capture", "league game capture", {
          capture_mode: "any_fullscreen",
          window: realLeagueWindow.value
        });

        // const videoSource = osn.InputFactory.create('monitor_capture', 'desktop-video');
      
        // Update source settings:
        let settings = videoSource.settings;
        settings['width'] = physicalWidth;
        settings['height'] = physicalHeight;
        videoSource.update(settings);
        videoSource.save();
      
        // Set output video size to 1920x1080
        const outputWidth = 1920;
        const outputHeight = Math.round(outputWidth / aspectRatio);
        this.setSetting('Video', 'Base', `${outputWidth}x${outputHeight}`);
        this.setSetting('Video', 'Output', `${outputWidth}x${outputHeight}`);
        const videoScaleFactor = physicalWidth / outputWidth;
      
        // A scene is necessary here to properly scale captured screen size to output video size
        this.scene = osn.SceneFactory.create('test-scene');
        const sceneItem = this.scene.add(videoSource);
        sceneItem.scale = { x: 1.0/ videoScaleFactor, y: 1.0 / videoScaleFactor };
    }

    setupSources() {
        osn.Global.setOutputSource(1, this.scene);
    }

    setSetting(category: any, parameter: any, value: any) {
        let oldValue;
    
        // Getting settings container
        const settings = osn.NodeObs.OBS_settings_getSettings(category).data;
    
        settings.forEach((subCategory: any) => {
        subCategory.parameters.forEach((param: any) => {
            if (param.name === parameter) {
            oldValue = param.currentValue;
            param.currentValue = value;
            }
        });
        });
    
        // Saving updated settings container
        if (value != oldValue) {
            osn.NodeObs.OBS_settings_saveSettings(category, settings);
        }
    }

    getAvailableValues(category: any, subcategory: any, parameter: any) {
        const categorySettings = osn.NodeObs.OBS_settings_getSettings(category).data;
        if (!categorySettings) {
            console.warn(`There is no category ${category} in OBS settings`);
            return [];
        }
    
        const subcategorySettings = categorySettings.find((sub: any) => sub.nameSubCategory === subcategory);
        if (!subcategorySettings) {
            console.warn(`There is no subcategory ${subcategory} for OBS settings category ${category}`);
            return [];
        }
    
        const parameterSettings = subcategorySettings.parameters.find((param: any) => param.name === parameter);
        if (!parameterSettings) {
            console.warn(`There is no parameter ${parameter} for OBS settings category ${category}.${subcategory}`);
            return [];
        }
    
        return parameterSettings.values.map( (value: any) => Object.values(value)[0]);
    }

    initObs(vidPath: string) {

        this.initialised = false;

        this.logger('Initializing OBS...');
        this.logger(path.join(__dirname, "obs-studio-node", "obs64.exe"));
        osn.NodeObs.IPC.setServerPath(path.join(__dirname, "obs-studio-node", "obs64.exe"));
        osn.NodeObs.IPC.host(`obs-studio-electron-replayslol-${v4()}`);
        this.logger(path.join(__dirname, 'obs-studio-node'))
        osn.NodeObs.SetWorkingDirectory(path.join(__dirname, 'obs-studio-node'));
        this.logger(path.join(__dirname, 'osn-data')); // OBS Studio configs and logs
        const obsDataPath = path.join(__dirname, 'osn-data'); // OBS Studio configs and logs

        const initResult = osn.NodeObs.OBS_API_initAPI('en-US', obsDataPath, '1.0.0');

        if (initResult !== 0) {
            const errorReasons = {
                '-2': 'DirectX could not be found on your system. Please install the latest version of DirectX for your machine here <https://www.microsoft.com/en-us/download/details.aspx?id=35?> and try again.',
                '-5': 'Failed to initialize OBS. Your video drivers may be out of date, or Streamlabs OBS may not be supported on your system.',
            } as any;
            const errorMessage = errorReasons[initResult.toString()] || `An unknown error #${initResult} was encountered while initializing OBS.`;
            console.error('OBS init failure', errorMessage);
        }

        
        this.logger('Configuring OBS');
        this.setSetting('Output', 'Mode', 'Advanced');
        const availableEncoders = this.getAvailableValues('Output', 'Recording', 'RecEncoder');
        this.setSetting('Output', 'RecEncoder', availableEncoders.slice(-1)[0] || 'x264');
        this.setSetting('Output', 'RecFilePath', vidPath);
        this.setSetting('Output', 'RecFormat', 'mkv');
        this.setSetting('Output', 'VBitrate', 5000);
        this.setSetting('Video', 'FPSCommon', 30);
        this.logger('obs configured');


        this.logger('setting up scene');
        this.setupScene();
        this.setupSources();
        
        this.initialised = true;

        osn.NodeObs.OBS_service_connectOutputSignals((signalInfo: any) => {
            this.handleOutputInfo(signalInfo);
        });
    }

    moveFile(loc: string, dest: string) {
        this.logger('new move file');
        this.logger(loc);
        this.logger(dest);
        return new Promise<void>((resolve, reject) => {
            mv(loc, dest, (err) => {
                if(err) reject(err);
                resolve();
            })
        })
    }

    getAllOBSVideos() {
        const allTmpVideos: string[] = fs.readdirSync(this.vidDir);

        allTmpVideos.forEach(vid => {
            this.logger(vid);
            this.logger(fs.statSync(path.join(this.vidDir, vid)).mtime.getTime());
        })

        const mkvFiles = allTmpVideos
                            .filter(file => file.endsWith(".mkv"))
                            .sort((a, b) => fs.statSync(path.join(this.vidDir, b)).mtime.getTime() - fs.statSync(path.join(this.vidDir, a)).mtime.getTime());
        return mkvFiles;
    }

    deleteRemainingOBSVideos(videos?: string[]) {
        const allVideos = videos || this.getAllOBSVideos();
        const tmpVideoDir = this.vidDir;
        this.logger('all videos', allVideos);
        allVideos.forEach(video => {
            const fullPath = path.join(tmpVideoDir, video);
            this.logger('full path', fullPath);
            if(fullPath !== this.filePath && fs.existsSync(fullPath)) {
                this.logger('deleting');
                fs.unlinkSync(fullPath);
            }
        });
    }

    async renameLatestOBSVideo() {
        const mkvFiles = this.getAllOBSVideos();
        this.logger(mkvFiles);
        const newVidName = path.join(this.filePath);
        if(mkvFiles.length === 0) return;
        const latestOBSVideo = mkvFiles.splice(0, 1)[0];
        this.logger('latest vid', latestOBSVideo);
        const fullPath = path.join(this.vidDir, latestOBSVideo);
        this.logger('latest vid path', fullPath);
        if(fs.existsSync(newVidName)) {
            fs.unlinkSync(newVidName);
        }
        this.logger('new vid path', newVidName);
        await this.moveFile(fullPath, newVidName);
        this.deleteRemainingOBSVideos(mkvFiles);
    }

    async handleStopSignal() {
        // rename to the original name.
        this.logger("Handling stop signal");
        await this.renameLatestOBSVideo();
        this.callbackFunc();
    }

    handleOutputInfo(signalInfo: any) {
        this.logger('Recieved signal:', signalInfo);
        switch (signalInfo.signal) {
            case "stop":
                this.handleStopSignal();
                break;
        }
    }

    async startRecording(videoPath: string) {

        this.filePath = videoPath;

        const vidDirParts = videoPath.split("\\");
        this.videoName = vidDirParts.pop() || "";
        this.vidDir = vidDirParts.join("\\");

        this.logger('initialisation status', this.initialised);
        
        if (!this.initialised) this.initObs(this.vidDir);
      
        this.logger('Starting recording...');
        osn.NodeObs.OBS_service_startRecording();
      
        this.logger('Started?');

    }

    stopRecording() {
        this.logger('Stopping recording...');
        osn.NodeObs.OBS_service_stopRecording();
        this.logger('Stopped?');
    }
}

module.exports = { NodeRecorder };