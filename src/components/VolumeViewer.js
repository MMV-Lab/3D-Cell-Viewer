import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  LoadSpec,
  View3d,
  VolumeFileFormat,
  RENDERMODE_PATHTRACE,
  RENDERMODE_RAYMARCH,
  VolumeMaker,
  Light,
  AREA_LIGHT,
  SKY_LIGHT,
  Lut,
} from "@aics/volume-viewer";
import * as THREE from "three";
import {
  loaderContext,
  PREFETCH_DISTANCE,
  MAX_PREFETCH_CHUNKS,
  myState,
} from "./appConfig";
import { useConstructor } from "./useConstructor";
import {
  Layout,
  Tabs,
  Collapse,
  Switch,
  Slider,
  InputNumber,
  Row,
  Col,
  Button,
  Select,
  Input,
  Spin,
  Tooltip,
} from "antd";
import {
  Settings,
  Files,
  Info,
  Sun,
  Camera,
  Eye,
  Sliders,
  Box,
  Move3d,
  Palette,
  Scissors,
  Maximize2,
  Image,
  Lightbulb,
  Wand2,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../config"; // Importing API_URL from your config
import {
  ALPHA_MASK_SLIDER_3D_DEFAULT,
  BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
  CELL_SEGMENTATION_CHANNEL_NAME,
  DENSITY_SLIDER_LEVEL_DEFAULT,
  ISOSURFACE_OPACITY_SLIDER_MAX,
  LEVELS_SLIDER_DEFAULT,
  LUT_MAX_PERCENTILE,
  LUT_MIN_PERCENTILE,
  PRESET_COLORS_0,
  PRESET_COLOR_MAP,
  VIEWER_3D_SETTING,
} from "./constants";
import PlanarSlicePlayer from "./PlanarSlicePlayer";
import FilesList from "./FilesList";
import ThreePointGammaSlider from "./ThreePointGammaSlider";
import ClipRegionSlider from "./ClipRegionSlider";
// Utility function to concatenate arrays
const concatenateArrays = (arrays) => {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
};

const { Sider, Content } = Layout;
const { TabPane } = Tabs;
const { Vector3 } = THREE;

const VolumeViewer = () => {
  const viewerRef = useRef(null);
  const volumeRef = useRef(null);
  const view3D = useConstructor(
    () => new View3d({ parentElement: viewerRef.current }),
  );
  const loadContext = useConstructor(() => loaderContext);

  const [loader, setLoader] = useState(null);
  const [fileData, setFileData] = useState({});
  const [selectedBodyPart, setSelectedBodyPart] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentVolume, setCurrentVolume] = useState(null);
  const [density, setDensity] = useState(myState.density);
  const [exposure, setExposure] = useState(myState.exposure);
  const [lights, setLights] = useState([
    new Light(SKY_LIGHT),
    new Light(AREA_LIGHT),
  ]);
  const [isPT, setIsPT] = useState(myState.isPT);
  const [channels, setChannels] = useState([]);
  const [cameraMode, setCameraMode] = useState("3D");
  const [isTurntable, setIsTurntable] = useState(false);
  const [showAxis, setShowAxis] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(false);
  const [showScaleBar, setShowScaleBar] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState(
    myState.backgroundColor,
  );
  const [boundingBoxColor, setBoundingBoxColor] = useState(
    myState.boundingBoxColor,
  );
  const [flipX, setFlipX] = useState(1);
  const [flipY, setFlipY] = useState(1);
  const [flipZ, setFlipZ] = useState(1);
  const [gamma, setGamma] = useState([0, 0.5, 1]);
  const [clipRegion, setClipRegion] = useState({
    xmin: myState.xmin,
    xmax: myState.xmax,
    ymin: myState.ymin,
    ymax: myState.ymax,
    zmin: myState.zmin,
    zmax: myState.zmax,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [timerId, setTimerId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [maskAlpha, setMaskAlpha] = useState(myState.maskAlpha);
  const [primaryRay, setPrimaryRay] = useState(myState.primaryRay);
  const [secondaryRay, setSecondaryRay] = useState(myState.secondaryRay);
  const [fov, setFov] = useState(myState.fov);
  const [focalDistance, setFocalDistance] = useState(myState.focal_distance);
  const [aperture, setAperture] = useState(myState.aperture);
  const [samplingRate, setSamplingRate] = useState(myState.samplingRate);

  const [skyTopIntensity, setSkyTopIntensity] = useState(
    myState.skyTopIntensity,
  );
  const [skyMidIntensity, setSkyMidIntensity] = useState(
    myState.skyMidIntensity,
  );
  const [skyBotIntensity, setSkyBotIntensity] = useState(
    myState.skyBotIntensity,
  );
  const [skyTopColor, setSkyTopColor] = useState(myState.skyTopColor);
  const [skyMidColor, setSkyMidColor] = useState(myState.skyMidColor);
  const [skyBotColor, setSkyBotColor] = useState(myState.skyBotColor);
  const [lightColor, setLightColor] = useState(myState.lightColor);
  const [lightIntensity, setLightIntensity] = useState(myState.lightIntensity);
  const [lightTheta, setLightTheta] = useState(myState.lightTheta);
  const [lightPhi, setLightPhi] = useState(myState.lightPhi);
  const [currentPreset, setCurrentPreset] = useState(0); // Default preset
  const [settings, setSettings] = useState({
    maskAlpha: ALPHA_MASK_SLIDER_3D_DEFAULT[0], // 50
    brightness: BRIGHTNESS_SLIDER_LEVEL_DEFAULT[0], // 70
    density: DENSITY_SLIDER_LEVEL_DEFAULT[0], // 50
    levels: LEVELS_SLIDER_DEFAULT, // [35.0, 140.0, 255.0]
    autoRotate: false,
    pathTrace: false,
    renderMode: RENDERMODE_RAYMARCH,
    colorizeEnabled: false,
    colorizeAlpha: 1.0,
    selectedColorPalette: 0,
    axisClip: { x: [0, 1], y: [0, 1], z: [0, 1] },
  });

  // Add new state for persisting view settings
  const [persistentSettings, setPersistentSettings] = useState({
    mode: "3D", // Default to 3D mode
    channelSettings: {}, // Store channel-specific settings
    density: 50,
    brightness: 70,
    maskAlpha: 50,
    primaryRay: 1,
    secondaryRay: 1,
    clipRegion: {
      xmin: 0,
      xmax: 1,
      ymin: 0,
      ymax: 1,
      zmin: 0,
      zmax: 1,
    },
  });

  const [isoSurfaceSettings, setIsoSurfaceSettings] = useState({
    isosurfaceOpacityMax: ISOSURFACE_OPACITY_SLIDER_MAX,
    defaultIsovalue: 128,
    defaultOpacity: 1.0,
  });
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false);
  const [originalScrollPosition, setOriginalScrollPosition] = useState(0);

  const densitySliderToView3D = (density) => density / 50.0;

  const onChannelDataArrived = (volume, channelIndex) => {
    if (volume !== volumeRef.current) return;

    const histogram = volume.getHistogram(channelIndex);
    if (!histogram) return;

    // Find percentile values
    const hmin = histogram.findBinOfPercentile(LUT_MIN_PERCENTILE);
    const hmax = histogram.findBinOfPercentile(LUT_MAX_PERCENTILE);

    // Create LUT using the Lut class
    const lut = new Lut();
    const lutData = lut.createFromMinMax(hmin, hmax);

    // Set the LUT for the channel
    volume.setLut(channelIndex, lutData);

    view3D.onVolumeData(volume, [channelIndex]);

    if (channels[channelIndex]) {
      view3D.setVolumeChannelEnabled(
        volume,
        channelIndex,
        channels[channelIndex].enabled,
      );
      view3D.setVolumeChannelOptions(volume, channelIndex, {
        color: channels[channelIndex].color,
        opacity: 1.0,
        brightness: 1.2,
        contrast: 1.1,
      });
    }

    view3D.updateActiveChannels(volume);
    view3D.updateLuts(volume);

    if (volume.isLoaded()) {
      // console.log("Volume " + volume.name + " is loaded");
    }
    view3D.redraw();
  };

  // Modify your onVolumeCreated function
  const onVolumeCreated = (volume) => {
    if (!volume || !volume.imageInfo) {
      // console.error("Invalid volume data");
      return;
    }

    // console.log("Volume created with info:", volume.imageInfo);

    volumeRef.current = volume;
    view3D.removeAllVolumes();

    // Log the dimensions specifically
    // console.log("Dimensions:", {
    //   sizeX: volume.imageInfo.sizeX,
    //   sizeY: volume.imageInfo.sizeY,
    //   sizeZ: volume.imageInfo.sizeZ,
    //   sizeC: volume.imageInfo.sizeC,
    // });

    // Initialize channels with persisted settings if available
    const channelNames = volume.imageInfo.channelNames || [];
    const newChannels = channelNames.map((name, index) => {
      const persistedChannel = persistentSettings.channelSettings[index] || {};
      const defaultColor = PRESET_COLORS_0[index % PRESET_COLORS_0.length];

      return {
        name,
        enabled: persistedChannel.enabled ?? index < 3,
        color: persistedChannel.color || defaultColor,
        isosurfaceEnabled: persistedChannel.isosurfaceEnabled ?? false,
        isovalue: persistedChannel.isovalue ?? 128,
        opacity: persistedChannel.opacity ?? 1.0,
        lut: ["p50", "p98"],
      };
    });

    // Add volume with persisted settings
    view3D.addVolume(volume, {
      channels: newChannels.map((ch) => ({
        enabled: ch.enabled,
        color: ch.color,
        isosurfaceEnabled: ch.isosurfaceEnabled,
        isovalue: ch.isovalue,
        isosurfaceOpacity: ch.opacity,
      })),
    });

    // Apply persisted view mode and settings
    setCameraMode(persistentSettings.mode);
    view3D.setCameraMode(persistentSettings.mode);

    // Apply other persisted settings
    updateSetting("density", persistentSettings.density);
    updateSetting("brightness", persistentSettings.brightness);
    updateSetting("maskAlpha", persistentSettings.maskAlpha);
    setPrimaryRay(persistentSettings.primaryRay);
    setSecondaryRay(persistentSettings.secondaryRay);
    setClipRegion(persistentSettings.clipRegion);

    // 4. Apply initial volume settings
    // Mask alpha
    const alphaValue = 1 - settings.maskAlpha / 100;
    view3D.updateMaskAlpha(volume, alphaValue);

    // Brightness
    const brightnessValue = settings.brightness / 100;
    view3D.updateExposure(brightnessValue);

    // Density
    const densityValue = settings.density / 100;
    view3D.updateDensity(volume, densityValue);

    // Gamma levels
    const [min, mid, max] = settings.levels.map((v) => v / 255);
    const diff = max - min;
    const x = (mid - min) / diff;
    const scale = 4 * x * x;
    view3D.setGamma(volume, min, scale, max);

    channelNames.forEach((_, index) => {
      if (volume.getHistogram) {
        const histogram = volume.getHistogram(index);
        if (histogram) {
          // Find percentile values
          const hmin = histogram.findBinOfPercentile(LUT_MIN_PERCENTILE);
          const hmax = histogram.findBinOfPercentile(LUT_MAX_PERCENTILE);

          // Create LUT using the Lut class
          const lut = new Lut();
          const lutData = lut.createFromMinMax(hmin, hmax);

          // Set the LUT for the channel
          volume.setLut(index, lutData);

          // Save control points if needed
          const controlPoints = [
            { x: 0, opacity: 0, color: newChannels[index].color },
            { x: hmin, opacity: 0.1, color: newChannels[index].color },
            {
              x: (hmin + hmax) / 2,
              opacity: 0.5,
              color: newChannels[index].color,
            },
            { x: hmax, opacity: 1.0, color: newChannels[index].color },
            { x: 255, opacity: 1.0, color: newChannels[index].color },
          ];

          newChannels[index].controlPoints = controlPoints;
        }
      }
    });

    // Initialize masks and LUTs
    const segIndex = channelNames.findIndex(
      (name) => name === CELL_SEGMENTATION_CHANNEL_NAME,
    );
    if (segIndex !== -1) {
      view3D.setVolumeChannelAsMask(volume, segIndex);
    }

    view3D.setVolumeRenderMode(
      settings.pathTrace ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH,
    );
    view3D.updateActiveChannels(volume);
    view3D.updateLuts(volume);

    setChannels(newChannels);
    setCurrentVolume(volume);
    view3D.redraw();
  };

  const loadVolume = async (loadSpec, loader) => {
    const volume = await loader.createVolume(loadSpec, onChannelDataArrived);
    // console.log("Loaded volume metadata:", volume.imageInfo);
    onVolumeCreated(volume);

    // console.log(volume.imageInfo, volume.imageInfo.times);
    // Set total frames based on the volume's metadata (assuming 'times' represents the number of frames)
    setTotalFrames(volume.imageInfo.times || 1);
    await loader.loadVolumeData(volume);
  };

  const loadVolumeFromServer = async (url) => {
    setIsLoading(true);
    try {
      const loadSpec = new LoadSpec();
      const isZarr = url.endsWith(".zarr");
      const volumeFileType = isZarr
        ? VolumeFileFormat.ZARR
        : url.match(/\.(tiff?|ome\.tiff?)$/i)
          ? VolumeFileFormat.TIFF
          : null;

      if (!volumeFileType) {
        throw new Error("Unsupported file format");
      }

      const loader = await loadContext.createLoader(url, {
        fileType: volumeFileType,
        fetchOptions: {
          maxPrefetchDistance: PREFETCH_DISTANCE,
          maxPrefetchChunks: MAX_PREFETCH_CHUNKS,
        },
      });

      setLoader(loader);
      await loadVolume(loadSpec, loader);
    } catch (error) {
      // console.error("Error loading volume:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false);
    }
  };

  const createTestVolume = () => {
    const sizeX = 64;
    const sizeY = 64;
    const sizeZ = 64;
    const imgData = {
      name: "AICS-10_5_5",
      sizeX,
      sizeY,
      sizeZ,
      sizeC: 3,
      physicalPixelSize: [1, 1, 1],
      spatialUnit: "",
      channelNames: ["DRAQ5", "EGFP", "SEG_Memb"],
    };

    const channelVolumes = [
      VolumeMaker.createSphere(sizeX, sizeY, sizeZ, 24),
      VolumeMaker.createTorus(sizeX, sizeY, sizeZ, 24, 8),
      VolumeMaker.createCone(sizeX, sizeY, sizeZ, 24, 24),
    ];

    const alldata = concatenateArrays(channelVolumes);
    return {
      metadata: imgData,
      data: {
        dtype: "uint8",
        shape: [channelVolumes.length, sizeZ, sizeY, sizeX],
        buffer: new DataView(alldata.buffer),
      },
    };
  };

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/files`);
      setFileData(response.data);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const handleFileSelect = async (category, fileName) => {
    setSelectedBodyPart(category);
    setSelectedFile(fileName);

    const fileUrl = `${API_URL}/${category}/${fileName}`;
    // console.log("Loading file:", fileUrl);

    await loadVolumeFromServer(fileUrl);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (viewerRef.current) {
      const container = viewerRef.current;
      container.appendChild(view3D.getDOMElement());

      const handleResize = () => view3D.resize();
      window.addEventListener("resize", handleResize);

      view3D.resize();

      return () => {
        window.removeEventListener("resize", handleResize);
        if (view3D.getDOMElement().parentNode) {
          view3D.getDOMElement().parentNode.removeChild(view3D.getDOMElement());
        }
        view3D.removeAllVolumes();
      };
    }
  }, [viewerRef, view3D]);

  useEffect(() => {
    if (!currentVolume || !view3D) return;
    const densityValue = settings.density / 100;
    view3D.updateDensity(currentVolume, densityValue);
    view3D.redraw();
  }, [settings.density]);

  useEffect(() => {
    if (!view3D) return;
    const brightnessValue = settings.brightness / 100;
    view3D.updateExposure(brightnessValue);
    view3D.redraw();
  }, [settings.brightness]);

  useEffect(() => {
    view3D.setVolumeRenderMode(
      isPT ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH,
    );
    view3D.redraw();
  }, [isPT, view3D]);

  useEffect(() => {
    if (currentVolume) {
      view3D.updateLights(lights);
      view3D.updateActiveChannels(currentVolume);
      view3D.redraw();
    }
  }, [lights, view3D]);

  useEffect(() => {
    if (currentVolume) {
      view3D.updateActiveChannels(currentVolume);
      view3D.updateLuts(currentVolume);
      view3D.redraw();
    }
  }, [channels]);

  useEffect(() => {
    view3D.setCameraMode(cameraMode);
  }, [cameraMode]);

  useEffect(() => {
    view3D.setAutoRotate(isTurntable);
  }, [isTurntable, view3D]);

  useEffect(() => {
    view3D.setShowAxis(showAxis);
  }, [showAxis, view3D]);

  useEffect(() => {
    if (currentVolume) {
      view3D.setShowBoundingBox(currentVolume, showBoundingBox);
    }
  }, [currentVolume, showBoundingBox, view3D]);

  useEffect(() => {
    view3D.setShowScaleBar(showScaleBar);
  }, [showScaleBar, view3D]);

  useEffect(() => {
    view3D.setBackgroundColor(backgroundColor);
  }, [backgroundColor, view3D]);

  useEffect(() => {
    if (currentVolume) {
      view3D.setBoundingBoxColor(currentVolume, boundingBoxColor);
    }
  }, [boundingBoxColor]);

  useEffect(() => {
    if (currentVolume) {
      view3D.setFlipVolume(currentVolume, flipX, flipY, flipZ);
    }
  }, [flipX, flipY, flipZ]);

  useEffect(() => {
    if (!currentVolume || !view3D) return;
    const [min, mid, max] = settings.levels.map((v) => v / 255);
    const diff = max - min;
    const x = (mid - min) / diff;
    const scale = 4 * x * x;
    view3D.setGamma(currentVolume, min, scale, max);
    view3D.redraw();
  }, [settings.levels]);

  useEffect(() => {
    if (currentVolume) {
      view3D.updateClipRegion(
        currentVolume,
        clipRegion.xmin,
        clipRegion.xmax,
        clipRegion.ymin,
        clipRegion.ymax,
        clipRegion.zmin,
        clipRegion.zmax,
      );
    }
  }, [clipRegion]);

  useEffect(() => {
    if (currentVolume) {
      view3D.updateCamera(fov, focalDistance, aperture);
      view3D.updateActiveChannels(currentVolume);
      view3D.redraw();
    }
  }, [fov, focalDistance, aperture]);

  useEffect(() => {
    if (currentVolume) {
      view3D.setRayStepSizes(currentVolume, primaryRay, secondaryRay);
      view3D.updateActiveChannels(currentVolume);
      view3D.redraw();
    }
  }, [primaryRay, secondaryRay]);

  useEffect(() => {
    if (!currentVolume || !view3D) return;
    const alphaValue = 1 - settings.maskAlpha / 100.0;
    view3D.updateMaskAlpha(currentVolume, alphaValue);
    view3D.updateActiveChannels(currentVolume);
    // view3D.redraw();
    // console.log("maskAlpha", settings.maskAlpha);
  }, [settings.maskAlpha]);

  useEffect(() => {
    if (view3D && lights[0]) {
      const skyLight = lights[0];
      skyLight.mColorTop = new Vector3(
        (skyTopColor[0] / 255.0) * skyTopIntensity,
        (skyTopColor[1] / 255.0) * skyTopIntensity,
        (skyTopColor[2] / 255.0) * skyTopIntensity,
      );
      skyLight.mColorMiddle = new Vector3(
        (skyMidColor[0] / 255.0) * skyMidIntensity,
        (skyMidColor[1] / 255.0) * skyMidIntensity,
        (skyMidColor[2] / 255.0) * skyMidIntensity,
      );
      skyLight.mColorBottom = new Vector3(
        (skyBotColor[0] / 255.0) * skyBotIntensity,
        (skyBotColor[1] / 255.0) * skyBotIntensity,
        (skyBotColor[2] / 255.0) * skyBotIntensity,
      );
      view3D.updateLights(lights);
      view3D.updateActiveChannels(currentVolume);
      view3D.redraw();
      // console.log([
      //   skyTopColor,
      //   skyTopIntensity,
      //   skyMidColor,
      //   skyMidIntensity,
      //   skyBotColor,
      //   skyBotIntensity,
      // ]);
    }
  }, [
    skyTopColor,
    skyTopIntensity,
    skyMidColor,
    skyMidIntensity,
    skyBotColor,
    skyBotIntensity,
  ]);

  // useEffect for area light
  useEffect(() => {
    if (view3D && lights[1]) {
      const areaLight = lights[1];
      areaLight.mColor = new Vector3(
        (lightColor[0] / 255.0) * lightIntensity,
        (lightColor[1] / 255.0) * lightIntensity,
        (lightColor[2] / 255.0) * lightIntensity,
      );
      areaLight.mTheta = (lightTheta * Math.PI) / 180.0;
      areaLight.mPhi = (lightPhi * Math.PI) / 180.0;
      view3D.updateLights(lights);
      view3D.updateActiveChannels(currentVolume);
      view3D.redraw();
    }
    // console.log([lightColor, lightIntensity, lightTheta, lightPhi]);
  }, [lightColor, lightIntensity, lightTheta, lightPhi]);

  // Effect for handling isosurface enable/disable
  useEffect(() => {
    if (!currentVolume || !view3D) return;

    channels.forEach((channel, index) => {
      view3D.setVolumeChannelOptions(currentVolume, index, {
        isosurfaceEnabled: channel.isosurfaceEnabled,
        isovalue: channel.isovalue,
        opacity: channel.opacity,
      });
    });

    view3D.updateMaterial(currentVolume);
    view3D.redraw();
  }, [channels.map((ch) => ch.isosurfaceEnabled).join(",")]); // Dependency on isosurfaceEnabled values

  // Effect for handling isovalue changes
  useEffect(() => {
    if (!currentVolume || !view3D) return;

    channels.forEach((channel, index) => {
      if (channel.isosurfaceEnabled) {
        view3D.setVolumeChannelOptions(currentVolume, index, {
          isosurfaceEnabled: true,
          isovalue: channel.isovalue,
          opacity: channel.opacity,
        });
      }
    });

    view3D.updateMaterial(currentVolume);
    view3D.redraw();
  }, [channels.map((ch) => ch.isovalue).join(",")]); // Dependency on isovalue changes

  // Effect for handling opacity changes
  useEffect(() => {
    if (!currentVolume || !view3D) return;

    channels.forEach((channel, index) => {
      if (channel.isosurfaceEnabled) {
        view3D.setVolumeChannelOptions(currentVolume, index, {
          isosurfaceEnabled: true,
          isovalue: channel.isovalue,
          isosurfaceOpacity: channel.opacity,
        });
      }
    });

    view3D.updateMaterial(currentVolume);
    view3D.redraw();
  }, [channels.map((ch) => ch.opacity).join(",")]); // Dependency on opacity changes

  useEffect(() => {
    if (!currentVolume || !view3D) return;
    channels.forEach((channel, index) => {
      if (channel.isosurfaceEnabled) {
        view3D.setVolumeChannelOptions(currentVolume, index, {
          isosurfaceEnabled: true,
          isovalue: channel.isovalue,
          isosurfaceOpacity: channel.opacity,
          opacity: channel.opacity, // Include both for compatibility
        });
        // Force material update
        view3D.updateMaterial(currentVolume);
      }
    });
    view3D.redraw();
  }, [channels.map((ch) => `${ch.isosurfaceEnabled}-${ch.opacity}`).join(",")]);

  const setInitialRenderMode = () => {
    view3D.setVolumeRenderMode(
      isPT ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH,
    );
    view3D.setMaxProjectMode(currentVolume, false);
  };

  const DEFAULT_CHANNEL_COLOR = [128, 128, 128]; // Medium gray

  // Modify your showChannelUI function
  const showChannelUI = (volume) => {
    const currentPresetColors = PRESET_COLOR_MAP[currentPreset].colors;

    const channelGui = volume.imageInfo.channelNames.map((name, index) => {
      const channelColor =
        currentPresetColors[index % currentPresetColors.length];

      return {
        name,
        enabled: index < 3,
        colorD: channelColor,
        colorS: [0, 0, 0],
        colorE: [0, 0, 0],
        glossiness: 0,
        window: 1,
        level: 0.5,
        isovalue: 128,
        isosurface: false,
        brightness: 1.2,
        contrast: 1.1,
      };
    });

    setChannels(channelGui);

    // Force update channel materials
    channelGui.forEach((channel, index) => {
      if (channel.enabled) {
        view3D.updateChannelMaterial(
          volume,
          index,
          channel.colorD,
          channel.colorS,
          channel.colorE,
          channel.glossiness,
        );
      }
    });

    view3D.updateMaterial(volume);
    view3D.redraw();
  };

  const updateChannel = (index, key, value) => {
    const updatedChannels = [...channels];
    updatedChannels[index][key] = value;
    setChannels(updatedChannels);

    if (currentVolume) {
      if (key === "enabled") {
        view3D.setVolumeChannelEnabled(currentVolume, index, value);
      } else if (key === "isosurface") {
        view3D.setVolumeChannelOptions(currentVolume, index, {
          isosurfaceEnabled: value,
        });
        if (value) {
          view3D.createIsosurface(
            currentVolume,
            index,
            updatedChannels[index].isovalue,
            1.0,
          );
        } else {
          view3D.clearIsosurface(currentVolume, index);
        }
      } else if (["colorD", "colorS", "colorE", "glossiness"].includes(key)) {
        view3D.updateChannelMaterial(
          currentVolume,
          index,
          updatedChannels[index].colorD,
          updatedChannels[index].colorS,
          updatedChannels[index].colorE,
          updatedChannels[index].glossiness,
        );
        view3D.updateMaterial(currentVolume);
      } else if (key === "window" || key === "level") {
        const lut = new Lut().createFromWindowLevel(
          updatedChannels[index].window,
          updatedChannels[index].level,
        );
        currentVolume.setLut(index, lut);
        view3D.updateLuts(currentVolume);
      }
      view3D.redraw();
    }
  };

  const updateChannelOptions = (index, options) => {
    if (!currentVolume || !view3D) return;

    const updatedChannels = [...channels];
    updatedChannels[index] = { ...updatedChannels[index], ...options };
    setChannels(updatedChannels);
  };

  const initializeChannelOptions = (volume) => {
    const channelOptions = volume.imageInfo.channelNames.map((name, index) => ({
      name,
      enabled: index < 3,
      color: volume.channelColorsDefault[index] || [128, 128, 128],
      specularColor: [0, 0, 0],
      emissiveColor: [0, 0, 0],
      glossiness: 0,
      isosurfaceEnabled: false,
      isovalue: 127,
      isosurfaceOpacity: 1.0,
    }));
    setChannels(channelOptions);
  };

  const updateIsovalue = (index, isovalue) => {
    if (!currentVolume || !view3D) return;

    const updatedChannels = [...channels];
    updatedChannels[index] = {
      ...updatedChannels[index],
      isovalue,
    };
    setChannels(updatedChannels);

    view3D.setVolumeChannelOptions(currentVolume, index, {
      isosurfaceEnabled: updatedChannels[index].isosurfaceEnabled,
      isovalue: isovalue,
      isosurfaceOpacity: updatedChannels[index].opacity,
    });

    view3D.updateMaterial(currentVolume);
    view3D.redraw();
  };

  // Histogram-based LUT adjustments
  const updateChannelLut = (index, type) => {
    if (currentVolume) {
      let lut;
      if (type === "autoIJ") {
        const [hmin, hmax] = currentVolume.getHistogram(index).findAutoIJBins();
        lut = new Lut().createFromMinMax(hmin, hmax);
      } else if (type === "auto0") {
        const [b, e] = currentVolume.getHistogram(index).findAutoMinMax();
        lut = new Lut().createFromMinMax(b, e);
      } else if (type === "bestFit") {
        const [hmin, hmax] = currentVolume
          .getHistogram(index)
          .findBestFitBins();
        lut = new Lut().createFromMinMax(hmin, hmax);
      } else if (type === "pct50_98") {
        const hmin = currentVolume.getHistogram(index).findBinOfPercentile(0.5);
        const hmax = currentVolume
          .getHistogram(index)
          .findBinOfPercentile(0.983);
        lut = new Lut().createFromMinMax(hmin, hmax);
      }

      currentVolume.setLut(index, lut);
      view3D.updateLuts(currentVolume);
      view3D.redraw();
    }
  };

  const setCameraModeHandler = (mode) => {
    const previousMode = cameraMode;
    setCameraMode(mode);

    if (!currentVolume || !view3D) return;

    if (mode === "3D") {
      // Reset scroll flag when switching back to 3D
      setHasScrolledOnce(false);
      // Remove padding when returning to 3D
      viewerRef.current.style.paddingBottom = "0";

      const fullClipRegion = {
        xmin: 0,
        xmax: 1,
        ymin: 0,
        ymax: 1,
        zmin: 0,
        zmax: 1,
      };

      setClipRegion(fullClipRegion);
      view3D.updateClipRegion(
        currentVolume,
        fullClipRegion.xmin,
        fullClipRegion.xmax,
        fullClipRegion.ymin,
        fullClipRegion.ymax,
        fullClipRegion.zmin,
        fullClipRegion.zmax,
      );

      view3D.setCameraMode(mode);
      view3D.setVolumeRenderMode(
        isPT ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH,
      );
      view3D.setMaxProjectMode(currentVolume, false);

      // Restore 3D settings
      view3D.updateDensity(currentVolume, settings.density / 100);
      view3D.updateExposure(settings.brightness / 100);
      view3D.updateMaskAlpha(currentVolume, 1 - settings.maskAlpha / 100);
      view3D.setRayStepSizes(currentVolume, primaryRay, secondaryRay);

      channels.forEach((channel, index) => {
        if (currentVolume) {
          view3D.setVolumeChannelEnabled(currentVolume, index, channel.enabled);
          if (channel.enabled) {
            view3D.setVolumeChannelOptions(currentVolume, index, {
              color: channel.color,
              opacity: 1.0,
              brightness: 1.2,
              contrast: 1.1,
            });
          }
        }
      });
    } else {
      // Add padding for the player in 2D modes
      if (viewerRef.current) {
        viewerRef.current.style.paddingBottom = "80px";
      }

      const defaultClipRegion = {
        xmin: 0,
        xmax: 1,
        ymin: 0,
        ymax: 1,
        zmin: 0,
        zmax: 1,
      };

      const sliceThickness = 0.01;
      if (mode === "X") {
        defaultClipRegion.xmin = 0;
        defaultClipRegion.xmax = sliceThickness;
      } else if (mode === "Y") {
        defaultClipRegion.ymin = 0;
        defaultClipRegion.ymax = sliceThickness;
      } else if (mode === "Z") {
        defaultClipRegion.zmin = 0;
        defaultClipRegion.zmax = sliceThickness;
      }

      setClipRegion(defaultClipRegion);
      view3D.updateClipRegion(
        currentVolume,
        defaultClipRegion.xmin,
        defaultClipRegion.xmax,
        defaultClipRegion.ymin,
        defaultClipRegion.ymax,
        defaultClipRegion.zmin,
        defaultClipRegion.zmax,
      );

      view3D.setCameraMode(mode);
      view3D.setVolumeRenderMode(RENDERMODE_RAYMARCH);
      view3D.setMaxProjectMode(currentVolume, false);

      // Set optimal 2D view settings
      view3D.updateDensity(currentVolume, 0.5);
      view3D.updateExposure(0.7);
      view3D.updateMaskAlpha(currentVolume, 0.5);
      view3D.setRayStepSizes(currentVolume, 1, 1);

      channels.forEach((channel, index) => {
        if (currentVolume) {
          view3D.setVolumeChannelEnabled(currentVolume, index, channel.enabled);
          if (channel.enabled) {
            view3D.setVolumeChannelOptions(currentVolume, index, {
              color: channel.color,
              opacity: 1.0,
              brightness: 1.2,
              contrast: 1.1,
            });
          }
        }
      });
    }

    setPersistentSettings((prev) => ({
      ...prev,
      mode: mode,
    }));

    view3D.updateActiveChannels(currentVolume);
    view3D.updateLuts(currentVolume);
    view3D.redraw();
  };

  const toggleTurntable = () => {
    setIsTurntable(!isTurntable);
  };

  const toggleAxis = () => {
    setShowAxis(!showAxis);
  };

  const toggleBoundingBox = () => {
    setShowBoundingBox(!showBoundingBox);
  };

  const toggleScaleBar = () => {
    setShowScaleBar(!showScaleBar);
  };

  const updateBackgroundColor = (color) => {
    setBackgroundColor(color);
  };

  const updateBoundingBoxColor = (color) => {
    setBoundingBoxColor(color);
  };

  const flipVolume = (axis) => {
    if (axis === "X") {
      setFlipX(flipX * -1);
    } else if (axis === "Y") {
      setFlipY(flipY * -1);
    } else if (axis === "Z") {
      setFlipZ(flipZ * -1);
    }
  };

  const gammaSliderToImageValues = (sliderValues) => {
    let min = Number(sliderValues[0]);
    let mid = Number(sliderValues[1]);
    let max = Number(sliderValues[2]);
    if (mid > max || mid < min) {
      mid = 0.5 * (min + max);
    }
    const div = 255;
    min /= div;
    max /= div;
    mid /= div;
    const diff = max - min;
    const x = (mid - min) / diff;
    let scale = 4 * x * x;
    if ((mid - 0.5) * (mid - 0.5) < 0.0005) {
      scale = 1.0;
    }
    return [min, max, scale];
  };

  const updateGamma = (newGamma) => {
    setGamma(newGamma);
  };

  const captureScreenshot = () => {
    view3D.capture((dataUrl) => {
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = "screenshot.png";
      anchor.click();
    });
  };

  const updateClipRegion = (axis, values) => {
    const [min, max] = values;
    const updates = {};

    if (axis === "X") {
      updates.xmin = min;
      updates.xmax = max;
    } else if (axis === "Y") {
      updates.ymin = min;
      updates.ymax = max;
    } else if (axis === "Z") {
      updates.zmin = min;
      updates.zmax = max;
    }

    const newClipRegion = { ...clipRegion, ...updates };
    setClipRegion(newClipRegion);

    if (currentVolume) {
      view3D.updateClipRegion(
        currentVolume,
        newClipRegion.xmin,
        newClipRegion.xmax,
        newClipRegion.ymin,
        newClipRegion.ymax,
        newClipRegion.zmin,
        newClipRegion.zmax,
      );
    }
  };

  const goToFrame = (frame) => {
    if (frame >= 0 && frame < totalFrames) {
      view3D.setTime(currentVolume, frame);
      setCurrentFrame(frame);
    }
  };

  const goToZSlice = (slice) => {
    if (currentVolume && view3D.setZSlice(currentVolume, slice)) {
      // Z slice updated successfully
      const zSlider = document.getElementById("zSlider");
      const zInput = document.getElementById("zValue");

      if (zInput) {
        zInput.value = slice;
      }
      if (zSlider) {
        zSlider.value = slice;
      }
    } else {
      console.log("Failed to update Z slice");
    }
  };

  const playTimeSeries = () => {
    if (timerId) {
      clearInterval(timerId);
    }
    setIsPlaying(true);
    const newTimerId = setInterval(() => {
      setCurrentFrame((prevFrame) => {
        const nextFrame = (prevFrame + 1) % totalFrames;
        view3D.setTime(currentVolume, nextFrame);
        return nextFrame;
      });
    }, 80);
    setTimerId(newTimerId);
  };

  const pauseTimeSeries = () => {
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }
    setIsPlaying(false);
  };

  const rgbToHex = (r, g, b) => {
    const toHex = (component) => {
      const hex = Math.round(component).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    // Ensure values are between 0-255
    r = Math.min(255, Math.max(0, Math.round(r)));
    g = Math.min(255, Math.max(0, Math.round(g)));
    b = Math.min(255, Math.max(0, Math.round(b)));

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const hexToRgb = (hex) => {
    // Remove the hash if present
    hex = hex.replace(/^#/, "");

    // Parse the hex values
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return [r, g, b];
  };

  const updatePixelSamplingRate = (rate) => {
    setSamplingRate(rate);
    view3D.updatePixelSamplingRate(rate);
    view3D.redraw();
  };

  const updateSkyLight = (position, intensity, color) => {
    if (position === "top") {
      setSkyTopIntensity(intensity);
      setSkyTopColor(color);
    } else if (position === "mid") {
      setSkyMidIntensity(intensity);
      setSkyMidColor(color);
    } else if (position === "bot") {
      setSkyBotIntensity(intensity);
      setSkyBotColor(color);
    }
    updateLights();
  };

  const updateAreaLight = (intensity, color, theta, phi) => {
    setLightIntensity(intensity);
    setLightColor(color);
    setLightTheta(theta);
    setLightPhi(phi);
    updateLights();
  };

  const updateLights = () => {
    const updatedLights = [...lights];
    // Update sky light
    updatedLights[0].mColorTop = new Vector3(
      (skyTopColor[0] / 255.0) * skyTopIntensity,
      (skyTopColor[1] / 255.0) * skyTopIntensity,
      (skyTopColor[2] / 255.0) * skyTopIntensity,
    );
    updatedLights[0].mColorMiddle = new Vector3(
      (skyMidColor[0] / 255.0) * skyMidIntensity,
      (skyMidColor[1] / 255.0) * skyMidIntensity,
      (skyMidColor[2] / 255.0) * skyMidIntensity,
    );
    updatedLights[0].mColorBottom = new Vector3(
      (skyBotColor[0] / 255.0) * skyBotIntensity,
      (skyBotColor[1] / 255.0) * skyBotIntensity,
      (skyBotColor[2] / 255.0) * skyBotIntensity,
    );

    // Update area light
    updatedLights[1].mColor = new Vector3(
      (lightColor[0] / 255.0) * lightIntensity,
      (lightColor[1] / 255.0) * lightIntensity,
      (lightColor[2] / 255.0) * lightIntensity,
    );
    updatedLights[1].mTheta = (lightTheta * Math.PI) / 180.0;
    updatedLights[1].mPhi = (lightPhi * Math.PI) / 180.0;

    setLights(updatedLights);
    view3D.updateLights(updatedLights);
    view3D.redraw();
  };

  const applyColorPreset = (presetIndex) => {
    if (!currentVolume) return;

    const preset = PRESET_COLOR_MAP[presetIndex].colors;

    const updatedChannels = channels.map((channel, index) => {
      const newColor = preset[index % preset.length];
      return {
        ...channel,
        colorD: newColor,
      };
    });

    // Update state
    setChannels(updatedChannels);
    setCurrentPreset(presetIndex);

    // Update each channel's material
    updatedChannels.forEach((channel, index) => {
      view3D.updateChannelMaterial(
        currentVolume,
        index,
        channel.colorD,
        channel.colorS,
        channel.colorE,
        channel.glossiness,
      );
    });

    view3D.updateMaterial(currentVolume);
    view3D.redraw();
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleClipRegionUpdate = (newClipRegion) => {
    setClipRegion(newClipRegion);

    if (currentVolume) {
      view3D.updateClipRegion(
        currentVolume,
        newClipRegion.xmin,
        newClipRegion.xmax,
        newClipRegion.ymin,
        newClipRegion.ymax,
        newClipRegion.zmin,
        newClipRegion.zmax,
      );
    }
  };

  // Optional: Add handler for slice changes if you need to do something when slices change
  const handleSliceChange = (newSlice) => {
    // Handle slice changes if needed
    console.log("Slice changed:", newSlice);
  };

  // Function to save current view settings
  const saveCurrentSettings = useCallback(() => {
    setPersistentSettings((prev) => ({
      ...prev,
      mode: cameraMode,
      density: settings.density,
      brightness: settings.brightness,
      maskAlpha: settings.maskAlpha,
      primaryRay: primaryRay,
      secondaryRay: secondaryRay,
      clipRegion: clipRegion,
      channelSettings: channels.reduce((acc, channel, index) => {
        acc[index] = {
          enabled: channel.enabled,
          color: channel.color,
          isosurfaceEnabled: channel.isosurfaceEnabled,
          isovalue: channel.isovalue,
          opacity: channel.opacity,
        };
        return acc;
      }, {}),
    }));
  }, [cameraMode, settings, primaryRay, secondaryRay, clipRegion, channels]);

  // Add effect to save settings when they change
  useEffect(() => {
    if (currentVolume) {
      saveCurrentSettings();
    }
  }, [
    cameraMode,
    settings.density,
    settings.brightness,
    settings.maskAlpha,
    primaryRay,
    secondaryRay,
    clipRegion,
    channels,
    saveCurrentSettings,
  ]);

  // Update the roundToSignificantFigure function:
  const roundToSignificantFigure = (value, sigFigs = 1) => {
    if (value === undefined || value === null) return "N/A";

    // Convert value to number if it's a string
    const numericValue = Number(value);

    // Return NaN if conversion failed
    if (isNaN(numericValue)) return "N/A";

    // Return 0 if the value is 0
    if (numericValue === 0) return "0µm";

    // Calculate scale for rounding
    const scale = Math.pow(
      10,
      Math.floor(Math.log10(Math.abs(numericValue))) + 1 - sigFigs,
    );

    // Perform rounding
    const roundedValue = Math.round(numericValue / scale) * scale;

    return `${roundedValue}`;
  };
  // console.log(currentVolume?.imageMetadata);

  const getDimensionOrder = (metadata) => {
    let order = [];
    if (metadata["Time series frames"] > 1) order.push("T");
    if (metadata.Channels > 1) order.push("C");
    order.push("Z", "Y", "X");
    return order.join("");
  };

  return (
    <Layout style={{ height: "100vh" }}>
      <div
        style={{
          width: "300px",
          overflowY: "auto",
          height: "100vh",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Sider
          width="100%"
          style={{
            background: "#fff",
            padding: "20px",
            paddingBottom: "60px",
            marginTop: "10px",
          }}
        >
          <Tabs defaultActiveKey="settings">
            {/* Files Tab */}
            <TabPane
              tab={
                <span>
                  <Files size={16} /> Files
                </span>
              }
              key="files"
            >
              <FilesList
                fileData={fileData}
                onFileSelect={(category, file) =>
                  handleFileSelect(category, file.name)
                }
              />
            </TabPane>
            {/* Settings Tab */}
            <TabPane
              tab={
                <span>
                  <Settings size={16} /> Settings
                </span>
              }
              key="settings"
            >
              <Collapse defaultActiveKey={[]}>
                {/* Channels */}
                <Collapse.Panel
                  header={
                    <span>
                      <Palette size={16} /> Channels
                    </span>
                  }
                  key="channels"
                >
                  <Row style={{ marginBottom: "16px" }}>
                    <Col span={12}>Color Preset</Col>
                    <Col span={12}>
                      <Select
                        value={currentPreset}
                        style={{ width: "100%" }}
                        onChange={applyColorPreset}
                      >
                        {PRESET_COLOR_MAP.map((preset) => (
                          <Select.Option key={preset.key} value={preset.key}>
                            {preset.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Col>
                  </Row>
                  {channels.map((channel, index) => (
                    <div key={index} className="channel-control">
                      <div className="channel-header">
                        {channel.name || `Channel ${index + 1}`}
                      </div>
                      <Row>
                        <Col span={12}>Enable Channel</Col>
                        <Col span={12}>
                          <Switch
                            checked={channel.enabled}
                            onChange={(enabled) =>
                              updateChannelOptions(index, { enabled })
                            }
                          />
                        </Col>
                      </Row>
                      <Row>
                        <Col span={12}>Enable Isosurface</Col>
                        <Col span={12}>
                          <Switch
                            checked={channel.isosurfaceEnabled}
                            onChange={(enabled) =>
                              updateChannelOptions(index, {
                                isosurfaceEnabled: enabled,
                              })
                            }
                          />
                        </Col>
                      </Row>
                      {channel.isosurfaceEnabled && (
                        <>
                          <Row>
                            <Col span={12}>Isovalue</Col>
                            <Col span={12}>
                              <Slider
                                min={0}
                                max={255}
                                value={channel.isovalue}
                                onChange={(value) =>
                                  updateChannelOptions(index, {
                                    isovalue: value,
                                  })
                                }
                              />
                            </Col>
                          </Row>
                          <Row>
                            <Col span={12}>Opacity</Col>
                            <Col span={12}>
                              <Slider
                                min={0}
                                max={100}
                                value={channel.opacity * 100}
                                onChange={(value) =>
                                  updateChannelOptions(index, {
                                    opacity: value / 100,
                                  })
                                }
                              />
                            </Col>
                          </Row>
                        </>
                      )}
                      <Row>
                        <Col span={12}>Color</Col>
                        <Col span={12}>
                          <Input
                            type="color"
                            value={rgbToHex(
                              channel.color[0],
                              channel.color[1],
                              channel.color[2],
                            )}
                            onChange={(e) => {
                              const newColor = hexToRgb(e.target.value);
                              updateChannelOptions(index, { color: newColor });
                              if (currentVolume && view3D) {
                                view3D.updateChannelMaterial(
                                  currentVolume,
                                  index,
                                  newColor,
                                  [0, 0, 0],
                                  [0, 0, 0],
                                  0,
                                );
                                view3D.updateMaterial(currentVolume);
                                view3D.redraw();
                              }
                            }}
                          />
                        </Col>
                      </Row>
                      <Row
                        style={{
                          marginTop: "8px",
                          marginRight: "-8px",
                          marginLeft: "-8px",
                        }}
                      >
                        <Col span={24}>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                              padding: "0 8px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "4px",
                                width: "100%",
                              }}
                            >
                              <Button
                                size="small"
                                style={{ flex: 1, minWidth: 0 }}
                                onClick={() =>
                                  updateChannelLut(index, "autoIJ")
                                }
                              >
                                Auto IJ
                              </Button>
                              <Button
                                size="small"
                                style={{ flex: 1, minWidth: 0 }}
                                onClick={() => updateChannelLut(index, "auto0")}
                              >
                                Min/Max
                              </Button>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "4px",
                                width: "100%",
                              }}
                            >
                              <Button
                                size="small"
                                style={{ flex: 1, minWidth: 0 }}
                                onClick={() =>
                                  updateChannelLut(index, "bestFit")
                                }
                              >
                                Best Fit
                              </Button>
                              <Button
                                size="small"
                                style={{ flex: 1, minWidth: 0 }}
                                onClick={() =>
                                  updateChannelLut(index, "pct50_98")
                                }
                              >
                                50-98%
                              </Button>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </Collapse.Panel>

                {/* Gamma */}
                <Collapse.Panel
                  header={
                    <span>
                      <Wand2 size={16} /> Gamma
                    </span>
                  }
                  key="gamma"
                >
                  <ThreePointGammaSlider
                    value={settings.levels}
                    onChange={(values) => updateSetting("levels", values)}
                  />
                </Collapse.Panel>

                {/* Exposure */}
                <Collapse.Panel
                  header={
                    <span>
                      <Sun size={16} /> Exposure
                    </span>
                  }
                  key="exposure"
                >
                  <Slider
                    min={0}
                    max={100}
                    value={settings.brightness}
                    onChange={(val) => updateSetting("brightness", val)}
                  />
                </Collapse.Panel>

                {/* Camera Mode */}
                <Collapse.Panel
                  header={
                    <span>
                      <Move3d size={16} /> Camera Mode
                    </span>
                  }
                  key="cameraMode"
                >
                  <Select
                    defaultValue={cameraMode}
                    style={{ width: "100%" }}
                    onChange={setCameraModeHandler}
                  >
                    <Select.Option value="X">X</Select.Option>
                    <Select.Option value="Y">Y</Select.Option>
                    <Select.Option value="Z">Z</Select.Option>
                    <Select.Option value="3D">3D</Select.Option>
                  </Select>
                </Collapse.Panel>

                {/* View Controls */}
                <Collapse.Panel
                  header={
                    <span>
                      <Box size={16} /> View Controls
                    </span>
                  }
                  key="controls"
                >
                  <Button
                    style={{ minWidth: "160px" }}
                    onClick={toggleTurntable}
                  >
                    {isTurntable ? "Stop Turntable" : "Start Turntable"}
                  </Button>
                  <Button style={{ minWidth: "160px" }} onClick={toggleAxis}>
                    {showAxis ? "Hide Axis" : "Show Axis"}
                  </Button>
                  <Button
                    style={{ minWidth: "160px" }}
                    onClick={toggleBoundingBox}
                  >
                    {showBoundingBox
                      ? "Hide Bounding Box"
                      : "Show Bounding Box"}
                  </Button>
                  <Button
                    style={{ minWidth: "160px" }}
                    onClick={toggleScaleBar}
                  >
                    {showScaleBar ? "Hide Scale Bar" : "Show Scale Bar"}
                  </Button>
                  <Row>
                    <Col span={12}>Background Color</Col>
                    <Col span={12}>
                      <Input
                        type="color"
                        value={rgbToHex(...backgroundColor)}
                        onChange={(e) => {
                          const [r, g, b] = hexToRgb(e.target.value);
                          const normalizedColor = [r / 255, g / 255, b / 255];
                          setBackgroundColor(normalizedColor);
                          if (view3D) {
                            view3D.setBackgroundColor(normalizedColor);
                            view3D.redraw();
                          }
                        }}
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col span={12}>Bounding Box Color</Col>
                    <Col span={12}>
                      <Input
                        type="color"
                        value={rgbToHex(...boundingBoxColor)}
                        onChange={(e) => {
                          const [r, g, b] = hexToRgb(e.target.value);
                          const normalizedColor = [r / 255, g / 255, b / 255];
                          setBoundingBoxColor(normalizedColor);
                          if (currentVolume && view3D) {
                            view3D.setBoundingBoxColor(
                              currentVolume,
                              normalizedColor,
                            );
                            view3D.redraw();
                          }
                        }}
                      />
                    </Col>
                  </Row>
                  <Button onClick={() => flipVolume("X")}>Flip X</Button>
                  <Button onClick={() => flipVolume("Y")}>Flip Y</Button>
                  <Button onClick={() => flipVolume("Z")}>Flip Z</Button>
                </Collapse.Panel>

                {/* Clip Region */}
                <Collapse.Panel
                  header={
                    <span>
                      <Scissors size={16} /> Clip Region
                    </span>
                  }
                  key="clipRegion"
                >
                  <div style={{ padding: "10px 0" }}>
                    {currentVolume && (
                      <>
                        <ClipRegionSlider
                          axis="X"
                          value={[clipRegion.xmin, clipRegion.xmax]}
                          onChange={(values) => updateClipRegion("X", values)}
                          totalSlices={currentVolume.imageMetadata.Dimensions.x}
                        />
                        <ClipRegionSlider
                          axis="Y"
                          value={[clipRegion.ymin, clipRegion.ymax]}
                          onChange={(values) => updateClipRegion("Y", values)}
                          totalSlices={currentVolume.imageMetadata.Dimensions.y}
                        />
                        <ClipRegionSlider
                          axis="Z"
                          value={[clipRegion.zmin, clipRegion.zmax]}
                          onChange={(values) => updateClipRegion("Z", values)}
                          totalSlices={currentVolume.imageMetadata.Dimensions.z}
                        />
                      </>
                    )}
                  </div>
                </Collapse.Panel>

                {/* Camera Settings */}
                <Collapse.Panel
                  header={
                    <span>
                      <Camera size={16} /> Camera Settings
                    </span>
                  }
                  key="camera"
                >
                  <Row>
                    <Col span={12}>FOV</Col>
                    <Col span={12}>
                      <Slider
                        min={0}
                        max={90}
                        step={1}
                        value={fov}
                        onChange={setFov}
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col span={12}>Focal Distance</Col>
                    <Col span={12}>
                      <Slider
                        min={0.1}
                        max={5.0}
                        step={0.01}
                        value={focalDistance}
                        onChange={setFocalDistance}
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col span={12}>Aperture</Col>
                    <Col span={12}>
                      <Slider
                        min={0.0}
                        max={0.1}
                        step={0.001}
                        value={aperture}
                        onChange={setAperture}
                      />
                    </Col>
                  </Row>
                </Collapse.Panel>

                {/* Render Mode */}
                <Collapse.Panel
                  header={
                    <span>
                      <Eye size={16} /> Render Mode
                    </span>
                  }
                  key="renderMode"
                >
                  <Row>
                    <Col span={12}>Path Trace</Col>
                    <Col span={12}>
                      <Switch
                        checked={isPT}
                        onChange={(checked) => setIsPT(checked)}
                      />
                    </Col>
                  </Row>
                </Collapse.Panel>
                {isPT && (
                  <>
                    {/* Density */}
                    <Collapse.Panel
                      header={
                        <span>
                          <Sliders size={16} /> Density
                        </span>
                      }
                      key="density"
                    >
                      <Slider
                        min={0}
                        max={100}
                        value={settings.density}
                        onChange={(val) => updateSetting("density", val)}
                      />
                    </Collapse.Panel>

                    {/* Ray Steps */}
                    <Collapse.Panel
                      header={
                        <span>
                          <Maximize2 size={16} /> Ray Steps
                        </span>
                      }
                      key="raySteps"
                    >
                      <div className="setting-group">
                        <label>Primary Ray</label>
                        <Slider
                          min={1}
                          max={40}
                          step={0.1}
                          value={primaryRay}
                          onChange={setPrimaryRay}
                        />
                      </div>
                      <div className="setting-group">
                        <label>Secondary Ray</label>
                        <Slider
                          min={1}
                          max={40}
                          step={0.1}
                          value={secondaryRay}
                          onChange={setSecondaryRay}
                        />
                      </div>
                    </Collapse.Panel>

                    {/* Sampling Rate */}
                    <Collapse.Panel
                      header={
                        <span>
                          <Box size={16} /> Sampling Rate
                        </span>
                      }
                      key="sampling"
                    >
                      <Row>
                        <Col span={12}>Pixel Sampling Rate</Col>
                        <Col span={12}>
                          <Slider
                            min={0.1}
                            max={1.0}
                            step={0.01}
                            value={samplingRate}
                            onChange={updatePixelSamplingRate}
                          />
                        </Col>
                      </Row>
                    </Collapse.Panel>

                    {/* Mask Alpha */}
                    <Collapse.Panel
                      header={
                        <span>
                          <Image size={16} /> Mask Alpha
                        </span>
                      }
                      key="maskAlpha"
                    >
                      <Slider
                        min={0}
                        max={100}
                        value={settings.maskAlpha}
                        onChange={(val) => updateSetting("maskAlpha", val)}
                      />
                    </Collapse.Panel>
                  </>
                )}
              </Collapse>
            </TabPane>

            {/* Metadata Tab */}
            <TabPane
              tab={
                <span>
                  <Info size={16} /> Info
                </span>
              }
              key="metadata"
            >
              {currentVolume && currentVolume.imageMetadata && (
                <div className="metadata-content">
                  <Tooltip title={currentVolume.name}>
                    <div className="name-value">{currentVolume.name}</div>
                  </Tooltip>

                  <div className="dimension-order">
                    Dimension order:{" "}
                    {(() => {
                      const order = [];
                      if (currentVolume.imageMetadata["Time series frames"] > 1)
                        order.push("T");
                      if (currentVolume.imageMetadata.Channels > 1)
                        order.push("C");
                      order.push("Z", "Y", "X");
                      return order.join("");
                    })()}
                  </div>

                  <Collapse defaultActiveKey={["1"]} ghost>
                    <Collapse.Panel header="Dimensions (voxels)" key="1">
                      <div className="dimension-group">
                        <div className="dim-row">
                          <span>x</span>
                          <span>
                            {currentVolume.imageMetadata.Dimensions.x}
                          </span>
                        </div>
                        <div className="dim-row">
                          <span>y</span>
                          <span>
                            {currentVolume.imageMetadata.Dimensions.y}
                          </span>
                        </div>
                        <div className="dim-row">
                          <span>z</span>
                          <span>
                            {currentVolume.imageMetadata.Dimensions.z}
                          </span>
                        </div>
                      </div>
                    </Collapse.Panel>

                    <Collapse.Panel
                      header="Original dimensions (voxels)"
                      key="2"
                    >
                      <div className="dimension-group">
                        <div className="dim-row">
                          <span>x</span>
                          <span>
                            {
                              currentVolume.imageMetadata["Original dimensions"]
                                .x
                            }
                          </span>
                        </div>
                        <div className="dim-row">
                          <span>y</span>
                          <span>
                            {
                              currentVolume.imageMetadata["Original dimensions"]
                                .y
                            }
                          </span>
                        </div>
                        <div className="dim-row">
                          <span>z</span>
                          <span>
                            {
                              currentVolume.imageMetadata["Original dimensions"]
                                .z
                            }
                          </span>
                        </div>
                      </div>
                    </Collapse.Panel>

                    <Collapse.Panel header="Physical size (μm)" key="3">
                      <div className="dimension-group">
                        <div className="dim-row">
                          <span>x</span>
                          <span>
                            {currentVolume.imageMetadata["Physical size"].x}
                          </span>
                        </div>
                        <div className="dim-row">
                          <span>y</span>
                          <span>
                            {currentVolume.imageMetadata["Physical size"].y}
                          </span>
                        </div>
                        <div className="dim-row">
                          <span>z</span>
                          <span>
                            {currentVolume.imageMetadata["Physical size"].z}
                          </span>
                        </div>
                      </div>
                    </Collapse.Panel>

                    <Collapse.Panel
                      header="Physical size per pixel (μm)"
                      key="4"
                    >
                      <div className="dimension-group">
                        <div className="dim-row">
                          <span>x</span>
                          <span>
                            {
                              currentVolume.imageMetadata[
                                "Physical size per pixel"
                              ].x
                            }
                          </span>
                        </div>
                        <div className="dim-row">
                          <span>y</span>
                          <span>
                            {
                              currentVolume.imageMetadata[
                                "Physical size per pixel"
                              ].y
                            }
                          </span>
                        </div>
                        <div className="dim-row">
                          <span>z</span>
                          <span>
                            {
                              currentVolume.imageMetadata[
                                "Physical size per pixel"
                              ].z
                            }
                          </span>
                        </div>
                      </div>
                    </Collapse.Panel>
                  </Collapse>

                  <div className="info-footer">
                    <div className="info-row">
                      <div>
                        Channels: {currentVolume.imageMetadata.Channels}
                      </div>
                      <div>
                        Time series frames:{" "}
                        {currentVolume.imageMetadata["Time series frames"]}
                      </div>
                    </div>
                    {currentVolume.imageMetadata.subresolutionLevels > 1 && (
                      <div className="resolution-info">
                        Subresolution levels:{" "}
                        {currentVolume.imageMetadata.subresolutionLevels}
                      </div>
                    )}
                  </div>

                  <style jsx>{`
                    .metadata-content {
                      padding: 8px;
                      color: #666;
                    }
                    .name-value {
                      word-wrap: break-word;
                      padding: 8px 24px;
                      font-weight: 500;
                    }
                    .dimension-order {
                      padding: 0 24px 8px;
                      font-size: 0.9em;
                      color: #888;
                    }
                    .dimension-group {
                      padding-left: 24px;
                    }
                    .dim-row {
                      display: flex;
                      justify-content: space-between;
                      padding: 4px 0;
                    }
                    .info-footer {
                      padding: 8px 24px;
                      border-top: 1px solid #eee;
                      margin-top: 8px;
                    }
                    .info-row {
                      display: flex;
                      justify-content: space-between;
                      padding: 4px 0;
                    }
                    .resolution-info {
                      padding: 4px 0;
                      color: #888;
                    }
                    :global(
                        .ant-collapse-ghost
                          > .ant-collapse-item
                          > .ant-collapse-content
                          > .ant-collapse-content-box
                      ) {
                      padding: 0;
                    }
                  `}</style>
                </div>
              )}
            </TabPane>
          </Tabs>
        </Sider>
      </div>

      <Content
        style={{
          overflowY: "auto",
          height: "100vh",
          flex: 1,
          padding: 0,
          position: "relative",
        }}
      >
        <Spin spinning={isLoading} tip="Loading volume data..." size="large">
          <div
            id="volume-viewer"
            ref={viewerRef}
            style={{
              width: "100%",
              height: "100vh",
              position: "relative",
              paddingBottom: cameraMode !== "3D" ? "80px" : "0", // Add space for the player
            }}
          >
            {/* Planar slice player */}
            {cameraMode !== "3D" && currentVolume && (
              <PlanarSlicePlayer
                currentVolume={currentVolume}
                cameraMode={cameraMode}
                updateClipRegion={handleClipRegionUpdate}
                clipRegion={clipRegion}
                onSliceChange={handleSliceChange}
              />
            )}
          </div>
        </Spin>
      </Content>

      <style jsx>{`
        .setting-group {
          margin-bottom: 16px;
        }
        .setting-group label {
          display: block;
          margin-bottom: 8px;
        }
        .channel-control {
          margin-bottom: 12px;
          padding: 8px;
          border-radius: 4px;
          background: #f5f5f5;
        }
        .channel-header {
          background: #e6e6e6;
          padding: 8px;
          margin: -8px -8px 8px -8px;
          border-radius: 4px 4px 0 0;
          font-weight: 500;
        }
        .file-listing {
          padding: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #f0f0f0;
        }
        .file-listing:hover {
          background: #f5f5f5;
        }
        .metadata-content {
          padding: 16px;
        }
        .metadata-item {
          margin-bottom: 8px;
        }
        .metadata-item label {
          font-weight: 500;
          margin-right: 8px;
        }
        .file-icon {
          margin-right: 8px;
        }
        .file-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .file-name-tooltip {
          display: none;
        }
        .file-listing:hover .file-name-tooltip {
          display: block;
          position: absolute;
          background: rgba(0, 0, 0, 0.75);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 1000;
        }
        .planar-controls-container {
          position: absolute;
          bottom: 10%;
          left: 50%;
          transform: translateX(-50%);
          width: min(99%, 808px);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(4px);
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 16px;
          z-index: 100;
        }
      `}</style>
    </Layout>
  );
};

export default VolumeViewer;
