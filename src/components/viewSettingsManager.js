// viewSettingsManager.js
import { XY_MODE, XZ_MODE, YZ_MODE, THREE_D_MODE } from './constants';

class ViewSettingsManager {
    constructor() {
        this.settings = {
            viewMode: THREE_D_MODE,
            channelSettings: [],
            clipRegion: {
                xmin: 0,
                xmax: 1,
                ymin: 0,
                ymax: 1,
                zmin: 0,
                zmax: 1
            },
            density: 50,
            exposure: 70,
            maskAlpha: 50,
            gamma: [35.0, 140.0, 255.0],
            isPT: false,
            lastKnown2DMode: XY_MODE,  // Track the last used 2D mode
            last3DSettings: null        // Store 3D settings when switching to 2D
        };
    }

    // Save current view settings
    saveSettings(settings) {
        // If switching modes, store or restore relevant settings
        if (settings.viewMode) {
            const isCurrently3D = this.settings.viewMode === THREE_D_MODE;
            const switchingTo3D = settings.viewMode === THREE_D_MODE;
            const switchingFrom3D = isCurrently3D && settings.viewMode !== THREE_D_MODE;

            if (switchingFrom3D) {
                // Store 3D settings when switching to 2D
                this.settings.last3DSettings = {
                    clipRegion: { ...this.settings.clipRegion },
                    density: this.settings.density,
                    exposure: this.settings.exposure,
                    maskAlpha: this.settings.maskAlpha,
                    // Store any other relevant 3D settings
                };
                this.settings.lastKnown2DMode = settings.viewMode;
            } else if (switchingTo3D && this.settings.last3DSettings) {
                // Restore 3D settings when switching back to 3D
                Object.assign(settings, this.settings.last3DSettings);
            }
        }

        this.settings = {
            ...this.settings,
            ...settings
        };
    }

    // Get current settings
    getSettings() {
        return { ...this.settings };
    }

    // Update view mode with proper state management
    setViewMode(mode) {
        if (mode !== THREE_D_MODE) {
            this.settings.lastKnown2DMode = mode;
        }
        this.settings.viewMode = mode;
    }

    // Get current view mode
    getViewMode() {
        return this.settings.viewMode;
    }

    // Get last known 2D mode
    getLastKnown2DMode() {
        return this.settings.lastKnown2DMode;
    }

    // Save channel settings
    saveChannelSettings(channels) {
        this.settings.channelSettings = channels.map(channel => ({
            enabled: channel.enabled,
            color: channel.color,
            isosurfaceEnabled: channel.isosurfaceEnabled,
            isovalue: channel.isovalue,
            opacity: channel.opacity
        }));
    }

    // Get saved channel settings
    getChannelSettings() {
        return [...this.settings.channelSettings];
    }

    // Convert camera mode to internal view mode
    convertCameraModeToViewMode(cameraMode) {
        switch (cameraMode) {
            case 'X': return YZ_MODE;
            case 'Y': return XZ_MODE;
            case 'Z': return XY_MODE;
            case '3D': return THREE_D_MODE;
            default: return THREE_D_MODE;
        }
    }

    // Convert internal view mode to camera mode
    convertViewModeToCameraMode(viewMode) {
        switch (viewMode) {
            case YZ_MODE: return 'X';
            case XZ_MODE: return 'Y';
            case XY_MODE: return 'Z';
            case THREE_D_MODE: return '3D';
            default: return '3D';
        }
    }
}

const viewSettingsManager = new ViewSettingsManager();
export default viewSettingsManager;