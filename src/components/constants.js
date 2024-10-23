// constants.js

// URL search parameter keys
export const CELL_ID_QUERY = "cellId";
export const FOV_ID_QUERY = "fovId";
export const CELL_LINE_QUERY = "cellLine";
export const IMAGE_NAME_QUERY = "name";

// View modes
export const YZ_MODE = "YZ";
export const XZ_MODE = "XZ";
export const XY_MODE = "XY";
export const THREE_D_MODE = "3D";

// App state values
export const SEGMENTED_CELL = "segmented";
export const FULL_FIELD_IMAGE = "full field";

// Channel setting keys
export const ISO_SURFACE_ENABLED = "isoSurfaceEnabled";
export const VOLUME_ENABLED = "volumeEnabled";

// App State Keys
export const ALPHA_MASK_SLIDER_LEVEL = "alphaMaskSliderLevel";
export const BRIGHTNESS_SLIDER_LEVEL = "brightnessSliderLevel";
export const DENSITY_SLIDER_LEVEL = "densitySliderLevel";
export const LEVELS_SLIDER = "levelsSlider";
export const MODE = "mode";
export const AUTO_ROTATE = "autorotate";
export const MAX_PROJECT = "maxProject";
export const VOLUMETRIC_RENDER = "volume";
export const PATH_TRACE = "pathTrace";
export const LUT_CONTROL_POINTS = "controlPoints";
export const COLORIZE_ALPHA = "colorizeAlpha";
export const COLORIZE_ENABLED = "colorizeEnabled";

// Volume viewer keys
export const ISO_VALUE = "isovalue";
export const OPACITY = "opacity";
export const COLOR = "color";
export const SAVE_ISO_SURFACE = "saveIsoSurface";

// LUT percentiles for remapping intensity values
export const LUT_MIN_PERCENTILE = 0.5;
export const LUT_MAX_PERCENTILE = 0.983;

// Opacity control for isosurfaces
export const ISOSURFACE_OPACITY_SLIDER_MAX = 255.0;

// Default values for sliders
export const ALPHA_MASK_SLIDER_3D_DEFAULT = [50];
export const ALPHA_MASK_SLIDER_2D_DEFAULT = [0];
export const BRIGHTNESS_SLIDER_LEVEL_DEFAULT = [70];
export const DENSITY_SLIDER_LEVEL_DEFAULT = [50];
export const LEVELS_SLIDER_DEFAULT = [35.0, 140.0, 255.0];

// Channel group keys
export const OTHER_CHANNEL_KEY = "Other";
export const SINGLE_GROUP_CHANNEL_KEY = "Channels";

// Special channel names
export const CELL_SEGMENTATION_CHANNEL_NAME = "SEG_Memb";

// Color presets for channels
export const PRESET_COLORS_1 = [
    [190, 68, 171, 255],
    [189, 211, 75, 255],
    [61, 155, 169, 255],
    [128, 128, 128, 255],
    [255, 255, 255, 255],
    [239, 27, 45, 255],
    [238, 77, 245, 255],
    [96, 255, 255, 255]
];

export const PRESET_COLORS_2 = [
    [128, 0, 0, 255],
    [0, 128, 0, 255],
    [0, 0, 128, 255],
    [32, 32, 32, 255],
    [255, 255, 0, 255],
    [255, 0, 255, 255],
    [0, 255, 0, 255],
    [0, 0, 255, 255]
];

export const PRESET_COLORS_3 = [
    [128, 0, 128, 255],
    [128, 128, 128, 255],
    [0, 128, 128, 255],
    [128, 128, 0, 255],
    [255, 255, 255, 255],
    [255, 0, 0, 255],
    [255, 0, 255, 255],
    [0, 255, 255, 255]
];

// Map of preset color groups
export const PRESET_COLOR_MAP = Object.freeze([
    {
        colors: PRESET_COLORS_1,
        name: "Thumbnail colors",
        key: 1,
    },
    {
        colors: PRESET_COLORS_2,
        name: "RGB colors",
        key: 2,
    },
    {
        colors: PRESET_COLORS_3,
        name: "White structure",
        key: 3,
    }
]);

// Application color scheme
export default {
    primary1Color: '#0B9AAB',   // bright blue
    primary2Color: '#827AA3',   // aics purple
    primary3Color: '#d8e0e2',   // light blue gray
    accent1Color: '#B8D637',    // aics lime green light
    accent2Color: '#C1F448',    // aics lime green bright
    accent3Color: '#d8e0e2',    // light blue gray
    textColor: '#003057',       // dark blue
    disabledColor: '#D1D1D1',   // dull gray
    pickerHeaderColor: '#316773' // cool blue green 
};
