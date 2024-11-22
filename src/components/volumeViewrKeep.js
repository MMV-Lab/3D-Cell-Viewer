import React, { useEffect, useRef, useState } from 'react';
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
    Lut
} from "@aics/volume-viewer";
import * as THREE from 'three';
import { loaderContext, PREFETCH_DISTANCE, MAX_PREFETCH_CHUNKS, myState } from "./appConfig";
import { useConstructor } from './useConstructor';
import { Slider, Switch, InputNumber, Row, Col, Collapse, Layout, Button, Select, Input, Tooltip, Spin, Menu, Tabs, Card} from 'antd';
import axios from 'axios';
import { API_URL } from '../config'; // Importing API_URL from your config

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
}

const { Header, Sider, Content, Footer } = Layout;
const { Panel } = Collapse;
const { Option } = Select;
const { Vector3 } = THREE;
const { TabPane } = Tabs;

const VolumeViewer = () => {
    const viewerRef = useRef(null);
    const view3D = useConstructor(() => new View3d({ parentElement: viewerRef.current }));
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
        new Light(AREA_LIGHT)
    ]);
    const [isPT, setIsPT] = useState(myState.isPT);
    const [channels, setChannels] = useState([]);
    const [cameraMode, setCameraMode] = useState('3D');
    const [isTurntable, setIsTurntable] = useState(false);
    const [showAxis, setShowAxis] = useState(false);
    const [showBoundingBox, setShowBoundingBox] = useState(false);
    const [showScaleBar, setShowScaleBar] = useState(true);
    const [backgroundColor, setBackgroundColor] = useState(myState.backgroundColor);
    const [boundingBoxColor, setBoundingBoxColor] = useState(myState.boundingBoxColor);
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
        zmax: myState.zmax
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



    const [skyTopIntensity, setSkyTopIntensity] = useState(myState.skyTopIntensity);
    const [skyMidIntensity, setSkyMidIntensity] = useState(myState.skyMidIntensity);
    const [skyBotIntensity, setSkyBotIntensity] = useState(myState.skyBotIntensity);
    const [skyTopColor, setSkyTopColor] = useState(myState.skyTopColor);
    const [skyMidColor, setSkyMidColor] = useState(myState.skyMidColor);
    const [skyBotColor, setSkyBotColor] = useState(myState.skyBotColor);
    const [lightColor, setLightColor] = useState(myState.lightColor);
    const [lightIntensity, setLightIntensity] = useState(myState.lightIntensity);
    const [lightTheta, setLightTheta] = useState(myState.lightTheta);
    const [lightPhi, setLightPhi] = useState(myState.lightPhi);

    const densitySliderToView3D = (density) => density / 50.0;

    const onChannelDataArrived = (v, channelIndex) => {
        view3D.onVolumeData(v, [channelIndex]);
        if (channels[channelIndex]) {
            view3D.setVolumeChannelEnabled(v, channelIndex, channels[channelIndex].enabled);
        }
        view3D.updateActiveChannels(v);
        view3D.updateLuts(v);
        if (v.isLoaded()) {
            console.log("Volume " + v.name + " is loaded");
        }
        view3D.redraw();
    };

    const onVolumeCreated = (volume) => {
        initializeChannelOptions(volume);
        
        // volume.channelColorsDefault = volume.imageInfo.channelNames.map(() => DEFAULT_CHANNEL_COLOR);

        setCurrentVolume(volume);
        view3D.removeAllVolumes();
        view3D.addVolume(volume);


        // Log the channel colors to verify the change
        console.log("Channel Default Colors:", volume.channelColors);


        setInitialRenderMode();
        showChannelUI(volume);
        view3D.updateActiveChannels(volume);
        view3D.updateLuts(volume);
        view3D.updateLights(lights);
        view3D.updateDensity(volume, densitySliderToView3D(density));
        view3D.updateMaskAlpha(volume, maskAlpha);
        view3D.setRayStepSizes(volume, primaryRay, secondaryRay);
        view3D.updateExposure(exposure);
        view3D.updateCamera(fov, focalDistance, aperture);
        // view3D.updatePixelSamplingRate(samplingRate);
        view3D.redraw();
    };

    const loadVolume = async (loadSpec, loader) => {
        const volume = await loader.createVolume(loadSpec, onChannelDataArrived);
        onVolumeCreated(volume);
        
        console.log(volume.imageInfo, volume.imageInfo.times)
        // Set total frames based on the volume's metadata (assuming 'times' represents the number of frames)
        setTotalFrames(volume.imageInfo.times || 1);
        await loader.loadVolumeData(volume);
    };

    const loadVolumeFromServer = async (url) => {
        setIsLoading(true);
        try {
            const loadSpec = new LoadSpec();
            const fileExtension = url.split('.').pop();
            const volumeFileType = (fileExtension === 'tiff' || fileExtension === 'tif' || fileExtension === 'ome.tiff' || fileExtension === 'ome.tif') ? VolumeFileFormat.TIFF : VolumeFileFormat.ZARR;
            const loader = await loadContext.createLoader(url, {
                fileType: volumeFileType,
                fetchOptions: { maxPrefetchDistance: PREFETCH_DISTANCE, maxPrefetchChunks: MAX_PREFETCH_CHUNKS },
            });

            setLoader(loader);
            await loadVolume(loadSpec, loader);
        } catch (error) {
            console.error('Error loading volume:', error);
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
            console.error('Error fetching files:', error);
        }
    };

    const handleFileSelect = async (bodyPart, file) => {
        setSelectedBodyPart(bodyPart);
        setSelectedFile(file);
        await loadVolumeFromServer(`${API_URL}/${bodyPart}/${file}`);
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
        if (currentVolume) {
            view3D.updateDensity(currentVolume, densitySliderToView3D(density));
            view3D.redraw();
        }
    }, [density]);

    useEffect(() => {
        if (currentVolume) {
            view3D.updateExposure(exposure);
            view3D.redraw();
        }
    }, [currentVolume, exposure, view3D]);

    useEffect(() => {
        view3D.setVolumeRenderMode(isPT ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH);
        view3D.redraw();
    }, [isPT, view3D]);

    useEffect(() => {
        view3D.updateLights(lights);
        view3D.redraw();
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
        if (currentVolume) {
            const gammaValues = gammaSliderToImageValues(gamma);
            view3D.setGamma(currentVolume, gammaValues[0], gammaValues[1], gammaValues[2]);
        }
    }, [gamma]);

    useEffect(() => {
        if (currentVolume) {
            view3D.updateClipRegion(
                currentVolume,
                clipRegion.xmin,
                clipRegion.xmax,
                clipRegion.ymin,
                clipRegion.ymax,
                clipRegion.zmin,
                clipRegion.zmax
            );
        }
    }, [clipRegion]);

    useEffect(() => {
        if (currentVolume) {
            view3D.updateCamera(fov, focalDistance, aperture);
            view3D.redraw();
        }
    }, [fov, focalDistance, aperture]);


    useEffect(() => {
        if (currentVolume) {
            view3D.setRayStepSizes(currentVolume, primaryRay, secondaryRay);
            view3D.redraw();
        }
    }, [primaryRay, secondaryRay]);

    useEffect(() => {
        if (currentVolume) {
            view3D.updateMaskAlpha(currentVolume, maskAlpha);
            view3D.redraw();
        }
    }, [maskAlpha])

    useEffect(() => {
        if (view3D && lights[0]) {
            const skyLight = lights[0];
            skyLight.mColorTop = new Vector3(
                (skyTopColor[0] / 255.0) * skyTopIntensity,
                (skyTopColor[1] / 255.0) * skyTopIntensity,
                (skyTopColor[2] / 255.0) * skyTopIntensity
            );
            skyLight.mColorMiddle = new Vector3(
                (skyMidColor[0] / 255.0) * skyMidIntensity,
                (skyMidColor[1] / 255.0) * skyMidIntensity,
                (skyMidColor[2] / 255.0) * skyMidIntensity
            );
            skyLight.mColorBottom = new Vector3(
                (skyBotColor[0] / 255.0) * skyBotIntensity,
                (skyBotColor[1] / 255.0) * skyBotIntensity,
                (skyBotColor[2] / 255.0) * skyBotIntensity
            );
            view3D.updateLights(lights);
            // view3D.redraw();
            console.log([skyTopColor, skyTopIntensity, skyMidColor, skyMidIntensity, skyBotColor, skyBotIntensity]);
        }
        
    }, [skyTopColor, skyTopIntensity, skyMidColor, skyMidIntensity, skyBotColor, skyBotIntensity]);

    // useEffect for area light
    useEffect(() => {
        if (view3D && lights[1]) {
            const areaLight = lights[1];
            areaLight.mColor = new Vector3(
                (lightColor[0] / 255.0) * lightIntensity,
                (lightColor[1] / 255.0) * lightIntensity,
                (lightColor[2] / 255.0) * lightIntensity
            );
            areaLight.mTheta = (lightTheta * Math.PI) / 180.0;
            areaLight.mPhi = (lightPhi * Math.PI) / 180.0;
            view3D.updateLights(lights);
            // view3D.redraw();
        }
        console.log([lightColor, lightIntensity, lightTheta, lightPhi]);
    }, [lightColor, lightIntensity, lightTheta, lightPhi]);

    const setInitialRenderMode = () => {
        view3D.setVolumeRenderMode(isPT ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH);
        view3D.setMaxProjectMode(currentVolume, false);
    };

    const DEFAULT_CHANNEL_COLOR = [128, 128, 128]; // Medium gray

      const showChannelUI = (volume) => {
        const channelGui = volume.imageInfo.channelNames.map((name, index) => ({
            name,
            enabled: index < 3,
            colorD: volume.channelColorsDefault[index] || DEFAULT_CHANNEL_COLOR,
            colorS: [0, 0, 0],
            colorE: [0, 0, 0],
            glossiness: 0,
            window: 1,
            level: 0.5,
            isovalue: 128,
            isosurface: false
        }));
        setChannels(channelGui);
    
        // Log channel colors for verification
        channelGui.forEach((channel, index) => {
            console.log(`Channel ${index} (${channel.name}) color:`, channel.colorD);
        });
    };

    const updateChannel = (index, key, value) => {
        const updatedChannels = [...channels];
        updatedChannels[index][key] = value;
        setChannels(updatedChannels);
    
        if (currentVolume) {
            if (key === 'enabled') {
                view3D.setVolumeChannelEnabled(currentVolume, index, value);
            } else if (key === 'isosurface') {
                view3D.setVolumeChannelOptions(currentVolume, index, { isosurfaceEnabled: value });
                if (value) {
                    view3D.createIsosurface(currentVolume, index, updatedChannels[index].isovalue, 1.0);
                } else {
                    view3D.clearIsosurface(currentVolume, index);
                }
            } else if (['colorD', 'colorS', 'colorE', 'glossiness'].includes(key)) {
                view3D.updateChannelMaterial(
                    currentVolume,
                    index,
                    updatedChannels[index].colorD,
                    updatedChannels[index].colorS,
                    updatedChannels[index].colorE,
                    updatedChannels[index].glossiness
                );
                view3D.updateMaterial(currentVolume);
            } else if (key === 'window' || key === 'level') {
                const lut = new Lut().createFromWindowLevel(
                    updatedChannels[index].window,
                    updatedChannels[index].level
                );
                currentVolume.setLut(index, lut);
                view3D.updateLuts(currentVolume);
            }
            view3D.redraw();
        }
    }


    const updateChannelOptions = (index, options) => {
        const updatedChannels = [...channels];
        updatedChannels[index] = { ...updatedChannels[index], ...options };
        setChannels(updatedChannels);
    
        if (view3D) {
            view3D.setVolumeChannelOptions(index, options);
            if (options.isosurfaceEnabled !== undefined) {
                if (options.isosurfaceEnabled) {
                    const channel = updatedChannels[index];
                    view3D.createIsosurface(
                        index,
                        channel.color,
                        channel.isovalue,
                        channel.isosurfaceOpacity,
                        channel.isosurfaceOpacity < 0.95
                    );
                } else {
                    view3D.clearIsosurface(index);
                }
            }
            if (options.isovalue !== undefined || options.isosurfaceOpacity !== undefined) {
                const channel = updatedChannels[index];
                view3D.updateIsosurface(index, channel.isovalue);
                view3D.updateChannelMaterial(
                    index,
                    channel.color,
                    channel.specularColor,
                    channel.emissiveColor,
                    channel.glossiness
                );
                view3D.updateOpacity(index, channel.isosurfaceOpacity);
            }
            view3D.redraw();
        }
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
            isosurfaceOpacity: 1.0
        }));
        setChannels(channelOptions);
    };

    const updateIsovalue = (index, isovalue) => {
        if (currentVolume) {
            view3D.updateIsosurface(currentVolume, index, isovalue);
            view3D.redraw();
        }
    };

    // Histogram-based LUT adjustments
    const updateChannelLut = (index, type) => {
        if (currentVolume) {
            let lut;
            if (type === 'autoIJ') {
                const [hmin, hmax] = currentVolume.getHistogram(index).findAutoIJBins();
                lut = new Lut().createFromMinMax(hmin, hmax);
            } else if (type === 'auto0') {
                const [b, e] = currentVolume.getHistogram(index).findAutoMinMax();
                lut = new Lut().createFromMinMax(b, e);
            } else if (type === 'bestFit') {
                const [hmin, hmax] = currentVolume.getHistogram(index).findBestFitBins();
                lut = new Lut().createFromMinMax(hmin, hmax);
            } else if (type === 'pct50_98') {
                const hmin = currentVolume.getHistogram(index).findBinOfPercentile(0.5);
                const hmax = currentVolume.getHistogram(index).findBinOfPercentile(0.983);
                lut = new Lut().createFromMinMax(hmin, hmax);
            }

            currentVolume.setLut(index, lut);
            view3D.updateLuts(currentVolume);
            view3D.redraw();
        }
    };

    const setCameraModeHandler = (mode) => {
        setCameraMode(mode);
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
        if (axis === 'X') {
            setFlipX(flipX * -1);
        } else if (axis === 'Y') {
            setFlipY(flipY * -1);
        } else if (axis === 'Z') {
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

    const updateClipRegion = (key, value) => {
        const updatedClipRegion = { ...clipRegion, [key]: value };
        setClipRegion(updatedClipRegion);
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
            console.log('Failed to update Z slice');
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
            return hex.length === 1 ? '0' + hex : hex; // Ensures two digits
        };
        
        // Ensure r, g, b are valid numbers and fall back to 0 if undefined or invalid
        r = isNaN(r) ? 0 : r;
        g = isNaN(g) ? 0 : g;
        b = isNaN(b) ? 0 : b;
    
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const updatePixelSamplingRate = (rate) => {
        setSamplingRate(rate);
        view3D.updatePixelSamplingRate(rate);
        view3D.redraw();
    };


    const updateSkyLight = (position, intensity, color) => {
        if (position === 'top') {
            setSkyTopIntensity(intensity);
            setSkyTopColor(color);
        } else if (position === 'mid') {
            setSkyMidIntensity(intensity);
            setSkyMidColor(color);
        } else if (position === 'bot') {
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
            (skyTopColor[2] / 255.0) * skyTopIntensity
        );
        updatedLights[0].mColorMiddle = new Vector3(
            (skyMidColor[0] / 255.0) * skyMidIntensity,
            (skyMidColor[1] / 255.0) * skyMidIntensity,
            (skyMidColor[2] / 255.0) * skyMidIntensity
        );
        updatedLights[0].mColorBottom = new Vector3(
            (skyBotColor[0] / 255.0) * skyBotIntensity,
            (skyBotColor[1] / 255.0) * skyBotIntensity,
            (skyBotColor[2] / 255.0) * skyBotIntensity
        );

        // Update area light
        updatedLights[1].mColor = new Vector3(
            (lightColor[0] / 255.0) * lightIntensity,
            (lightColor[1] / 255.0) * lightIntensity,
            (lightColor[2] / 255.0) * lightIntensity
        );
        updatedLights[1].mTheta = (lightTheta * Math.PI) / 180.0;
        updatedLights[1].mPhi = (lightPhi * Math.PI) / 180.0;

        setLights(updatedLights);
        view3D.updateLights(updatedLights);
        view3D.redraw();
    };

    return (
        <Layout style={{ height: '100vh' }}>
            <Header style={{ background: '#fff', padding: 0 }}>
                <Menu mode="horizontal" defaultSelectedKeys={['1']}>
                    <Menu.Item key="1">Home</Menu.Item>
                    <Menu.Item key="2">About</Menu.Item>
                    <Menu.Item key="3">Help</Menu.Item>
                </Menu>
            </Header>
            <Layout>
                <Sider width={300} style={{ background: '#fff', padding: '20px', overflowY: 'auto' }}>
                    <Collapse accordion>
                        {Object.keys(fileData).map((bodyPart) => (
                            <Panel header={bodyPart} key={bodyPart}>
                                {fileData[bodyPart].map((file) => (
                                    <div key={file} style={{ padding: '8px 0', cursor: 'pointer', color: 'blue' }}
                                        onClick={() => handleFileSelect(bodyPart, file)}
                                    >
                                        {file}
                                    </div>
                                ))}
                            </Panel>
                        ))}
                    </Collapse>
                </Sider>
                <Layout style={{ flexGrow: 1, overflow: 'hidden' }}>
                   <Content style={{ display: 'flex', padding: '20px', overflow: 'hidden' }}>
                   <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', marginRight: '20px', overflow: 'hidden' }}>
                            <div style={{ flex: 1, position: 'relative', marginRight: '20px' }}>
                                <Spin spinning={isLoading} tip="Loading volume data..." size="large">
                                    <div id="volume-viewer" ref={viewerRef} style={{ width: '100%', height: '100%', position: 'relative' }}></div>
                                </Spin>
                            </div>
                            <Card style={{ width: '300px', overflowY: 'auto' }}>
                                <Tabs defaultActiveKey="1" tabPosition="left">
                                    <TabPane tab="Render" key="1">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div>
                                                <Switch checked={isPT} onChange={(checked) => setIsPT(checked)} /> Path Trace
                                            </div>
                                            <div>
                                                Density: <Slider min={0} max={100} step={0.1} value={density} onChange={setDensity} />
                                            </div>
                                            <div>
                                                Mask Alpha: <Slider min={0} max={1} step={0.01} value={maskAlpha} onChange={setMaskAlpha} />
                                            </div>
                                            <div>
                                                Primary Ray: <Slider min={1} max={40} step={0.1} value={primaryRay} onChange={setPrimaryRay} />
                                            </div>
                                            <div>
                                                Secondary Ray: <Slider min={1} max={40} step={0.1} value={secondaryRay} onChange={setSecondaryRay} />
                                            </div>
                                            <div>
                                                Exposure: <Slider min={0} max={1} step={0.01} value={exposure} onChange={setExposure} />
                                            </div>
                                        </div>
                                    </TabPane>
                                    <TabPane tab="Camera" key="2">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div>
                                                FOV: <InputNumber min={0} max={90} step={1} value={fov} onChange={setFov} />
                                            </div>
                                            <div>
                                                Focal Distance: <InputNumber min={0.1} max={5.0} step={0.01} value={focalDistance} onChange={setFocalDistance} />
                                            </div>
                                            <div>
                                                Aperture: <InputNumber min={0.0} max={0.1} step={0.001} value={aperture} onChange={setAperture} />
                                            </div>
                                            <div>
                                                Pixel Sampling Rate: <InputNumber min={0.1} max={1.0} step={0.01} value={samplingRate} onChange={updatePixelSamplingRate} />
                                            </div>
                                            <div>
                                                Camera Mode: 
                                                <Select defaultValue={cameraMode} style={{ width: '100%' }} onChange={setCameraModeHandler}>
                                                    <Option value="X">X</Option>
                                                    <Option value="Y">Y</Option>
                                                    <Option value="Z">Z</Option>
                                                    <Option value="3D">3D</Option>
                                                </Select>
                                            </div>
                                        </div>
                                    </TabPane>
                                    <TabPane tab="Lighting" key="3">
                                        <Tabs>
                                            <TabPane tab="Sky Light" key="1">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <div>
                                                        Top Intensity:
                                                        <Slider
                                                            min={0}
                                                            max={1}
                                                            step={0.01}
                                                            value={skyTopIntensity}
                                                            onChange={(value) => updateSkyLight('top', value, skyTopColor)}
                                                        />
                                                    </div>
                                                    <div>
                                                        Top Color:
                                                        <Input
                                                            type="color"
                                                            value={rgbToHex(skyTopColor[0], skyTopColor[1], skyTopColor[2])}
                                                            onChange={(e) => updateSkyLight('top', skyTopIntensity, e.target.value.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16)))}
                                                        />
                                                    </div>
                                                    <div>
                                                        Mid Intensity:
                                                        <Slider
                                                            min={0}
                                                            max={1}
                                                            step={0.01}
                                                            value={skyMidIntensity}
                                                            onChange={(value) => updateSkyLight('mid', value, skyMidColor)}
                                                        />
                                                    </div>
                                                    <div>
                                                        Mid Color:
                                                        <Input
                                                            type="color"
                                                            value={rgbToHex(skyMidColor[0], skyMidColor[1], skyMidColor[2])}
                                                            onChange={(e) => updateSkyLight('mid', skyMidIntensity, e.target.value.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16)))}
                                                        />
                                                    </div>
                                                </div>
                                            </TabPane>
                                            <TabPane tab="Area Light" key="2">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <div>
                                                        Intensity:
                                                        <Slider
                                                            min={0}
                                                            max={200}
                                                            step={1}
                                                            value={lightIntensity}
                                                            onChange={(value) => updateAreaLight(value, lightColor, lightTheta, lightPhi)}
                                                        />
                                                    </div>
                                                    <div>
                                                        Color:
                                                        <Input
                                                            type="color"
                                                            value={rgbToHex(lightColor[0], lightColor[1], lightColor[2])}
                                                            onChange={(e) => updateAreaLight(lightIntensity, e.target.value.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16)), lightTheta, lightPhi)}
                                                        />
                                                    </div>
                                                    <div>
                                                        Theta (deg):
                                                        <Slider
                                                            min={0}
                                                            max={360}
                                                            step={1}
                                                            value={lightTheta}
                                                            onChange={(value) => updateAreaLight(lightIntensity, lightColor, value, lightPhi)}
                                                        />
                                                    </div>
                                                    <div>
                                                        Phi (deg):
                                                        <Slider
                                                            min={0}
                                                            max={180}
                                                            step={1}
                                                            value={lightPhi}
                                                            onChange={(value) => updateAreaLight(lightIntensity, lightColor, lightTheta, value)}
                                                        />
                                                    </div>
                                                </div>
                                            </TabPane>
                                        </Tabs>
                                    </TabPane>
                                    <TabPane tab="Controls" key="4">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <Button onClick={toggleTurntable}>{isTurntable ? "Stop Turntable" : "Start Turntable"}</Button>
                                            <Button onClick={toggleAxis}>{showAxis ? "Hide Axis" : "Show Axis"}</Button>
                                            <Button onClick={toggleBoundingBox}>{showBoundingBox ? "Hide Bounding Box" : "Show Bounding Box"}</Button>
                                            <Button onClick={toggleScaleBar}>{showScaleBar ? "Hide Scale Bar" : "Show Scale Bar"}</Button>
                                            <Button onClick={() => flipVolume('X')}>Flip X</Button>
                                            <Button onClick={() => flipVolume('Y')}>Flip Y</Button>
                                            <Button onClick={() => flipVolume('Z')}>Flip Z</Button>
                                            <div>
                                                Background Color:
                                                <Input type="color" value={`#${backgroundColor.map(c => c.toString(16).padStart(2, '0')).join('')}`}
                                                    onChange={(e) => updateBackgroundColor(e.target.value.match(/.{1,2}/g).map(c => parseInt(c, 16)))} />
                                            </div>
                                            <div>
                                                Bounding Box Color:
                                                <Input type="color" value={`#${boundingBoxColor.map(c => c.toString(16).padStart(2, '0')).join('')}`}
                                                    onChange={(e) => updateBoundingBoxColor(e.target.value.match(/.{1,2}/g).map(c => parseInt(c, 16)))} />
                                            </div>
                                        </div>
                                    </TabPane>
                                    <TabPane tab="Channels" key="5">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {channels.map((channel, index) => (
                                                <div key={index}>
                                                    <div>
                                                        <Switch checked={channel.enabled} onChange={(checked) => updateChannel(index, 'enabled', checked)} /> Enable
                                                    </div>
                                                    {channel.isosurfaceEnabled && (
                                                        <>
                                                            <div>
                                                                Isovalue:
                                                                <Slider
                                                                    min={0}
                                                                    max={255}
                                                                    value={channel.isovalue}
                                                                    onChange={(value) => updateChannelOptions(index, { isovalue: value })}
                                                                />
                                                            </div>
                                                            <div>
                                                                Isosurface Opacity:
                                                                <Slider
                                                                    min={0}
                                                                    max={1}
                                                                    step={0.01}
                                                                    value={channel.isosurfaceOpacity}
                                                                    onChange={(value) => updateChannelOptions(index, { isosurfaceOpacity: value })}
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                    <div>
                                                        Diffuse Color:
                                                        <Input type="color" value={rgbToHex(channel.colorD[0], channel.colorD[1], channel.colorD[2])}
                                                            onChange={(e) => updateChannel(index, 'colorD', e.target.value.match(/.{1,2}/g).map(c => parseInt(c, 16)))} />
                                                    </div>
                                                    <div>
                                                        <Button onClick={() => updateChannelLut(index, 'autoIJ')}>Auto IJ</Button>
                                                        <Button onClick={() => updateChannelLut(index, 'auto0')}>Auto Min/Max</Button>
                                                        <Button onClick={() => updateChannelLut(index, 'bestFit')}>Best Fit</Button>
                                                        <Button onClick={() => updateChannelLut(index, 'pct50_98')}>50-98 Percentile</Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabPane>
                                    <TabPane tab="Clip Region" key="6">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div>
                                                X Min:
                                                <Slider min={0} max={1} step={0.01} value={clipRegion.xmin} onChange={(value) => updateClipRegion('xmin', value)} />
                                            </div>
                                            <div>
                                                X Max:
                                                <Slider min={0} max={1} step={0.01} value={clipRegion.xmax} onChange={(value) => updateClipRegion('xmax', value)} />
                                            </div>
                                            <div>
                                                Y Min:
                                                <Slider min={0} max={1} step={0.01} value={clipRegion.ymin} onChange={(value) => updateClipRegion('ymin', value)} />
                                            </div>
                                            <div>
                                                Y Max:
                                                <Slider min={0} max={1} step={0.01} value={clipRegion.ymax} onChange={(value) => updateClipRegion('ymax', value)} />
                                            </div>
                                            <div>
                                                Z Min:
                                                <Slider min={0} max={1} step={0.01} value={clipRegion.zmin} onChange={(value) => updateClipRegion('zmin', value)} />
                                            </div>
                                            <div>
                                                Z Max:
                                                <Slider min={0} max={1} step={0.01} value={clipRegion.zmax} onChange={(value) => updateClipRegion('zmax', value)} />
                                            </div>
                                        </div>
                                    </TabPane>
                                    <TabPane tab="Playback" key="7">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div>
                                                <Button onClick={playTimeSeries} disabled={isPlaying}>Play</Button>
                                                <Button onClick={pauseTimeSeries} disabled={!isPlaying}>Pause</Button>
                                                <Button onClick={() => goToFrame(currentFrame + 1)}>Forward</Button>
                                                <Button onClick={() => goToFrame(currentFrame - 1)}>Backward</Button>
                                            </div>
                                            <div>
                                                Frame: <InputNumber min={0} max={totalFrames - 1} value={currentFrame} onChange={goToFrame} />
                                            </div>
                                            <div>
                                                Z Slice: <InputNumber
                                                    id="zValue"
                                                    min={0}
                                                    max={currentVolume ? currentVolume.imageInfo.volumeSize.z - 1 : 0}
                                                    value={currentVolume ? currentVolume.currentZSlice : 0}
                                                    onChange={goToZSlice}
                                                />
                                            </div>
                                            <div>
                                                <Slider
                                                    id="zSlider"
                                                    min={0}
                                                    max={currentVolume ? currentVolume.imageInfo.volumeSize.z - 1 : 0}
                                                    value={currentVolume ? currentVolume.currentZSlice : 0}
                                                    onChange={goToZSlice}
                                                />
                                            </div>
                                        </div>
                                    </TabPane>
                                    <TabPane tab="Gamma" key="8">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div>
                                                Min: <InputNumber min={0} max={255} value={gamma[0]}
                                                    onChange={(value) => updateGamma([value, gamma[1], gamma[2]])} />
                                            </div>
                                            <div>
                                                Mid: <InputNumber min={0} max={255} value={gamma[1]}
                                                    onChange={(value) => updateGamma([gamma[0], value, gamma[2]])} />
                                            </div>
                                            <div>
                                                Max: <InputNumber min={0} max={255} value={gamma[2]}
                                                    onChange={(value) => updateGamma([gamma[0], gamma[1], value])} />
                                            </div>
                                        </div>
                                    </TabPane>
                                </Tabs>
                            </Card>
                        </div>
                    </Content>
                </Layout>
            </Layout>
        </Layout>
    );
}

export default VolumeViewer;