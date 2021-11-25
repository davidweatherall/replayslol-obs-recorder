type QualityOptions = "high" | "medium" | "low";

interface RecorderOptions {
    sound: boolean;
    quality: QualityOptions;
}

interface RecorderOptionsParam extends Partial<RecorderOptions> {}