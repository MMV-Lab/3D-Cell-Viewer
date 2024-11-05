import * as THREE from 'three';
import {
  Volume,
  Light,
  VolumeLoaderContext,
  JsonImageInfoLoader,
  VolumeFileFormat,
  SKY_LIGHT,
  AREA_LIGHT,
} from "@aics/volume-viewer";

const { Vector2, Vector3 } = THREE;

export const getDefaultImageInfo = () => ({
  name: "",
  originalSize: new Vector3(1, 1, 1),
  atlasTileDims: new Vector2(1, 1),
  volumeSize: new Vector3(1, 1, 1),
  subregionSize: new Vector3(1, 1, 1),
  subregionOffset: new Vector3(0, 0, 0),
  physicalPixelSize: new Vector3(1, 1, 1),
  spatialUnit: "",
  numChannels: 0,
  channelNames: [],
  channelColors: [],
  times: 1,
  timeScale: 1,
  timeUnit: "",
  numMultiscaleLevels: 1,
  multiscaleLevel: 0,
  transform: {
    translation: new Vector3(0, 0, 0),
    rotation: new Vector3(0, 0, 0),
  },
});

export const CACHE_MAX_SIZE = 1_000_000_000;
export const CONCURRENCY_LIMIT = 8;
export const PREFETCH_CONCURRENCY_LIMIT = 3;
export const PREFETCH_DISTANCE = [5, 5, 5, 5];
export const MAX_PREFETCH_CHUNKS = 25;
export const PLAYBACK_INTERVAL = 80;
export const DATARANGE_UINT8 = [0, 255];

export const TEST_DATA = {
  timeSeries: {
    type: VolumeFileFormat.JSON,
    url: "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/timelapse/test_parent_T49.ome_%%_atlas.json",
    times: 46,
  },
  omeTiff: {
    type: VolumeFileFormat.TIFF,
    url: "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/AICS-12_881.ome.tif",
  },
  zarrEMT: {
    url: "https://dev-aics-dtp-001.int.allencell.org/dan-data/3500005818_20230811__20x_Timelapse-02(P27-E7).ome.zarr",
    type: VolumeFileFormat.ZARR,
  },
  zarrIDR1: {
    type: VolumeFileFormat.ZARR,
    url: "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0076A/10501752.zarr",
  },
  zarrIDR2: {
    type: VolumeFileFormat.ZARR,
    url: "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0054A/5025553.zarr",
  },
  zarrVariance: {
    type: VolumeFileFormat.ZARR,
    url: "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/1.zarr",
  },
  zarrNucmorph0: {
    type: VolumeFileFormat.ZARR,
    url: "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P13-C4.zarr/",
  },
  zarrNucmorph1: {
    type: VolumeFileFormat.ZARR,
    url: "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P15-C3.zarr/",
  },
  zarrNucmorph2: {
    type: VolumeFileFormat.ZARR,
    url: "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P7-B4.zarr/",
  },
  zarrNucmorph3: {
    type: VolumeFileFormat.ZARR,
    url: "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P8-B4.zarr/",
  },
  zarrFlyBrain: {
    type: VolumeFileFormat.ZARR,
    url: "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0048A/9846152.zarr/",
  },
  zarrUK: {
    type: VolumeFileFormat.ZARR,
    url: "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr",
  },
  opencell: { type: "opencell", url: "" },
  cfeJson: {
    type: VolumeFileFormat.JSON,
    url: "AICS-12_881_atlas.json",
  },
  abm: {
    type: VolumeFileFormat.TIFF,
    url: "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/HAMILTONIAN_TERM_FOV_VSAHJUP_0000_000192.ome.tif",
  },
  procedural: { type: VolumeFileFormat.DATA, url: "" },
};

export const myState = {
  file: "",
  volume: new Volume(),
  currentFrame: 0,
  lastFrameTime: 0,
  isPlaying: false,
  timerId: 0,
  loader: new JsonImageInfoLoader(
    "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/timelapse/test_parent_T49.ome_%%_atlas.json"
  ),
  density: 12.5,
  maskAlpha: 0.0,
  exposure: 0.75,
  aperture: 0.0,
  fov: 20,
  focalDistance: 4.0,
  lights: [new Light(SKY_LIGHT), new Light(AREA_LIGHT)],
  skyTopIntensity: 0.3,
  skyMidIntensity: 0.3,
  skyBotIntensity: 0.3,
  skyTopColor: [255, 255, 255],
  skyMidColor: [255, 255, 255],
  skyBotColor: [255, 255, 255],
  lightColor: [255, 255, 255],
  lightIntensity: 75.0,
  lightTheta: 14, // deg
  lightPhi: 54, // deg
  xmin: 0.0,
  ymin: 0.0,
  zmin: 0.0,
  xmax: 1.0,
  ymax: 1.0,
  zmax: 1.0,
  samplingRate: 0.25,
  primaryRay: 1.0,
  secondaryRay: 1.0,
  isPT: false,
  isMP: false,
  interpolationActive: true,
  isTurntable: false,
  isAxisShowing: false,
  isAligned: true,
  showScaleBar: true,
  showBoundingBox: false,
  boundingBoxColor: [255, 255, 0],
  backgroundColor: [0, 0, 0],
  flipX: 1,
  flipY: 1,
  flipZ: 1,
  channelFolderNames: [],
  infoObj: getDefaultImageInfo(),
  channelGui: [],
  currentImageStore: "",
  currentImageName: "",
  channelStates: [],
};

export const loaderContext = new VolumeLoaderContext(
  CACHE_MAX_SIZE,
  CONCURRENCY_LIMIT,
  PREFETCH_CONCURRENCY_LIMIT
);


export const getDefaultChannelState = () => ({
  volumeEnabled: true,
  isosurfaceEnabled: false,
  colorizeEnabled: false,
  colorizeAlpha: 1.0,
  isovalue: 128,
  opacity: 1.0,
  color: [255, 255, 255],
  controlPoints: [],
});

export const DEFAULT_CHANNEL_COLOR = [128, 128, 128]; // Medium gray
