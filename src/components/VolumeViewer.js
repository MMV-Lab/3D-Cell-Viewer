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
import { Slider, Switch, InputNumber, Row, Col, Collapse, Layout, Button, Select, Input, Tooltip, Spin } from 'antd';
import axios from 'axios';
import { API_URL } from '../config';  // Importing API_URL from your config

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

const { Sider, Content } = Layout;
const { Panel } = Collapse;
const { Option } = Select;
const { Vector3 } = THREE;

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
        setCurrentVolume(volume);
        view3D.removeAllVolumes();
        view3D.addVolume(volume);
        setInitialRenderMode();
        showChannelUI(volume);
        view3D.updateActiveChannels(volume);
        view3D.updateLuts(volume);
        view3D.updateLights(lights);
        view3D.updateDensity(volume, densitySliderToView3D(density));
        view3D.updateExposure(exposure);
        view3D.redraw();
    };

    const loadVolume = async (loadSpec, loader) => {
        const volume = await loader.createVolume(loadSpec, onChannelDataArrived);
        onVolumeCreated(volume);
        await loader.loadVolumeData(volume);
    };

    const loadVolumeFromServer = async (url) => {
        setIsLoading(true);
        try {
            const loadSpec = new LoadSpec();
            const fileExtension = url.split('.').pop();
            console.log(fileExtension)
            const volumeFileType = (fileExtension === 'tiff' || fileExtension === 'tif' || fileExtension === 'ome.tiff' || fileExtension === 'ome.tif') ? VolumeFileFormat.TIFF : VolumeFileFormat.ZARR;
            console.log(volumeFileType)
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

    // Various useEffect hooks for updating the volume based on user controls
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

    const setInitialRenderMode = () => {
        view3D.setVolumeRenderMode(isPT ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH);
        view3D.setMaxProjectMode(currentVolume, false);
    };

    const showChannelUI = (volume) => {
        const channelGui = volume.imageInfo.channelNames.map((name, index) => ({
            name,
            enabled: index < 3,
            colorD: volume.channelColorsDefault[index],
            colorS: [0, 0, 0],
            colorE: [0, 0, 0],
            glossiness: 0,
            window: 1,
            level: 0.5,
            isovalue: 128,
            isosurface: false
        }));
        setChannels(channelGui);
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

    return (
        <Layout style={{ height: '100vh' }}>
            <Sider width={300} style={{ background: '#fff', padding: '20px' }}>
                <Collapse defaultActiveKey={['1']}>
                    <Panel header="Render Mode" key="1">
                        <Row>
                            <Col span={12}>Path Trace</Col>
                            <Col span={12}>
                                <Switch checked={isPT} onChange={(checked) => {
                                    setIsPT(checked);
                                }} />
                            </Col>
                        </Row>
                    </Panel>
                    <Panel header="Density" key="2">
                        <Slider
                            min={0}
                            max={100}
                            step={0.1}
                            value={density}
                            onChange={(value) => {
                                setDensity(value);
                            }}
                        />
                    </Panel>
                    <Panel header="Exposure" key="3">
                        <Slider
                            min={0}
                            max={1}
                            step={0.01}
                            value={exposure}
                            onChange={(value) => {
                                setExposure(value);
                            }}
                        />
                    </Panel>
                    <Panel header="Lights" key="4">
                        {lights.map((light, index) => (
                            <div key={index}>
                                <Row>
                                    <Col span={12}>Intensity</Col>
                                    <Col span={12}>
                                        <InputNumber
                                            min={0}
                                            max={1000}
                                            value={light.mColor.x * 255}
                                            onChange={(value) => {
                                                const updatedLights = [...lights];
                                                updatedLights[index].mColor.setScalar(value / 255);
                                                setLights(updatedLights);
                                            }}
                                        />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={12}>Theta</Col>
                                    <Col span={12}>
                                        <InputNumber
                                            min={0}
                                            max={360}
                                            value={light.mTheta * (180 / Math.PI)}
                                            onChange={(value) => {
                                                const updatedLights = [...lights];
                                                updatedLights[index].mTheta = value * (Math.PI / 180);
                                                setLights(updatedLights);
                                            }}
                                        />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={12}>Phi</Col>
                                    <Col span={12}>
                                        <InputNumber
                                            min={0}
                                            max={360}
                                            value={light.mPhi * (180 / Math.PI)}
                                            onChange={(value) => {
                                                const updatedLights = [...lights];
                                                updatedLights[index].mPhi = value * (Math.PI / 180);
                                                setLights(updatedLights);
                                            }}
                                        />
                                    </Col>
                                </Row>
                            </div>
                        ))}
                    </Panel>
                    <Panel header="Camera Mode" key="5">
                        <Select defaultValue={cameraMode} style={{ width: '100%' }} onChange={setCameraModeHandler}>
                            <Option value="X">X</Option>
                            <Option value="Y">Y</Option>
                            <Option value="Z">Z</Option>
                            <Option value="3D">3D</Option>
                        </Select>
                    </Panel>
                    <Panel header="Controls" key="6">
                        <Button onClick={toggleTurntable}>{isTurntable ? "Stop Turntable" : "Start Turntable"}</Button>
                        <Button onClick={toggleAxis}>{showAxis ? "Hide Axis" : "Show Axis"}</Button>
                        <Button onClick={toggleBoundingBox}>{showBoundingBox ? "Hide Bounding Box" : "Show Bounding Box"}</Button>
                        <Button onClick={toggleScaleBar}>{showScaleBar ? "Hide Scale Bar" : "Show Scale Bar"}</Button>
                        <Row>
                            <Col span={12}>Background Color</Col>
                            <Col span={12}>
                                <Input type="color" value={`#${backgroundColor.map(c => c.toString(16).padStart(2, '0')).join('')}`} onChange={(e) => updateBackgroundColor(e.target.value.match(/.{1,2}/g).map(c => parseInt(c, 16)))} />
                            </Col>
                        </Row>
                        <Row>
                            <Col span={12}>Bounding Box Color</Col>
                            <Col span={12}>
                                <Input type="color" value={`#${boundingBoxColor.map(c => c.toString(16).padStart(2, '0')).join('')}`} onChange={(e) => updateBoundingBoxColor(e.target.value.match(/.{1,2}/g).map(c => parseInt(c, 16)))} />
                            </Col>
                        </Row>
                        <Button onClick={() => flipVolume('X')}>Flip X</Button>
                        <Button onClick={() => flipVolume('Y')}>Flip Y</Button>
                        <Button onClick={() => flipVolume('Z')}>Flip Z</Button>
                    </Panel>
                    <Panel header="Gamma" key="7">
                        <Row>
                            <Col span={8}>Min</Col>
                            <Col span={16}>
                                <InputNumber
                                    min={0}
                                    max={255}
                                    value={gamma[0]}
                                    onChange={(value) => updateGamma([value, gamma[1], gamma[2]])}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col span={8}>Mid</Col>
                            <Col span={16}>
                                <InputNumber
                                    min={0}
                                    max={255}
                                    value={gamma[1]}
                                    onChange={(value) => updateGamma([gamma[0], value, gamma[2]])}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col span={8}>Max</Col>
                            <Col span={16}>
                                <InputNumber
                                    min={0}
                                    max={255}
                                    value={gamma[2]}
                                    onChange={(value) => updateGamma([gamma[0], gamma[1], value])}
                                />
                            </Col>
                        </Row>
                    </Panel>
                    <Panel header="Channels" key="8">
                        {channels.map((channel, index) => (
                            <div key={index}>
                                <Row>
                                    <Col span={12}>Enable</Col>
                                    <Col span={12}>
                                        <Switch checked={channel.enabled} onChange={(checked) => updateChannel(index, 'enabled', checked)} />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={12}>Isosurface</Col>
                                    <Col span={12}>
                                        <Switch checked={channel.isosurface} onChange={(checked) => updateChannel(index, 'isosurface', checked)} />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={12}>Diffuse Color</Col>
                                    <Col span={12}>
                                        <Input type="color" value={`#${channel.colorD.map(c => c.toString(16).padStart(2, '0')).join('')}`} onChange={(e) => updateChannel(index, 'colorD', e.target.value.match(/.{1,2}/g).map(c => parseInt(c, 16)))} />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={12}>Specular Color</Col>
                                    <Col span={12}>
                                        <Input type="color" value={`#${channel.colorS.map(c => c.toString(16).padStart(2, '0')).join('')}`} onChange={(e) => updateChannel(index, 'colorS', e.target.value.match(/.{1,2}/g).map(c => parseInt(c, 16)))} />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={12}>Emissive Color</Col>
                                    <Col span={12}>
                                        <Input type="color" value={`#${channel.colorE.map(c => c.toString(16).padStart(2, '0')).join('')}`} onChange={(e) => updateChannel(index, 'colorE', e.target.value.match(/.{1,2}/g).map(c => parseInt(c, 16)))} />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={12}>Glossiness</Col>
                                    <Col span={12}>
                                        <Slider
                                            min={0}
                                            max={100}
                                            value={channel.glossiness}
                                            onChange={(value) => updateChannel(index, 'glossiness', value)}
                                        />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={12}>Window</Col>
                                    <Col span={12}>
                                        <Slider
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            value={channel.window}
                                            onChange={(value) => updateChannel(index, 'window', value)}
                                        />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={12}>Level</Col>
                                    <Col span={12}>
                                        <Slider
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            value={channel.level}
                                            onChange={(value) => updateChannel(index, 'level', value)}
                                        />
                                    </Col>
                                </Row>
                            </div>
                        ))}
                    </Panel>
                    <Panel header="Clip Region" key="9">
                        <Row>
                            <Col span={8}>X Min</Col>
                            <Col span={16}>
                                <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={clipRegion.xmin}
                                    onChange={(value) => updateClipRegion('xmin', value)}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col span={8}>X Max</Col>
                            <Col span={16}>
                                <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={clipRegion.xmax}
                                    onChange={(value) => updateClipRegion('xmax', value)}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col span={8}>Y Min</Col>
                            <Col span={16}>
                                <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={clipRegion.ymin}
                                    onChange={(value) => updateClipRegion('ymin', value)}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col span={8}>Y Max</Col>
                            <Col span={16}>
                                <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={clipRegion.ymax}
                                    onChange={(value) => updateClipRegion('ymax', value)}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col span={8}>Z Min</Col>
                            <Col span={16}>
                                <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={clipRegion.zmin}
                                    onChange={(value) => updateClipRegion('zmin', value)}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col span={8}>Z Max</Col>
                            <Col span={16}>
                                <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={clipRegion.zmax}
                                    onChange={(value) => updateClipRegion('zmax', value)}
                                />
                            </Col>
                        </Row>
                    </Panel>
                    <Panel header="Playback" key="10">
                        <Row>
                            <Button onClick={playTimeSeries} disabled={isPlaying}>Play</Button>
                            <Button onClick={pauseTimeSeries} disabled={!isPlaying}>Pause</Button>
                            <Button onClick={() => goToFrame(currentFrame + 1)}>Forward</Button>
                            <Button onClick={() => goToFrame(currentFrame - 1)}>Backward</Button>
                        </Row>
                        <Row>
                            <Col span={12}>Frame</Col>
                            <Col span={12}>
                                <InputNumber
                                    min={0}
                                    max={totalFrames - 1}
                                    value={currentFrame}
                                    onChange={goToFrame}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col span={12}>Z Slice</Col>
                            <Col span={12}>
                                <InputNumber
                                    min={0}
                                    max={currentVolume ? currentVolume.imageInfo.volumeSize.z - 1 : 0}
                                    value={currentVolume ? currentVolume.currentZSlice : 0}
                                    onChange={goToZSlice}
                                />
                            </Col>
                        </Row>
                    </Panel>
                </Collapse>
                <div>
                    <Collapse accordion>
                        {Object.keys(fileData).map((bodyPart) => (
                            <Panel header={bodyPart} key={bodyPart}>
                                {fileData[bodyPart].map((file) => (
                                    <div
                                        key={file}
                                        style={{ padding: '8px 0', cursor: 'pointer', color: 'blue' }}
                                        onClick={() => handleFileSelect(bodyPart, file)}
                                    >
                                        {file}
                                    </div>
                                ))}
                            </Panel>
                        ))}
                    </Collapse>
                </div>
            </Sider>
            <Content style={{ padding: 0, margin: 0, position: 'relative' }}>
                <Spin spinning={isLoading} tip="Loading volume data..." size="large">
                    <div id="volume-viewer" ref={viewerRef} style={{ width: '100%', height: '100vh', position: 'relative' }}></div>
                </Spin>
            </Content>
        </Layout>
    );
}

export default VolumeViewer;