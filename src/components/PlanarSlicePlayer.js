// PlanarSlicePlayer.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Slider, InputNumber, Row, Col, Typography, Switch } from 'antd';
import { 
    PlayCircleOutlined, 
    PauseCircleOutlined, 
    StopOutlined, 
    StepForwardOutlined, 
    StepBackwardOutlined 
} from '@ant-design/icons';

const { Text } = Typography;

const PlanarSlicePlayer = ({
    currentVolume,
    cameraMode,
    updateClipRegion,
    clipRegion,
    onSliceChange,
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [currentSlice, setCurrentSlice] = useState(0);
    const [totalSlices, setTotalSlices] = useState(100);
    const [isLooping, setIsLooping] = useState(true);
    
    // Use useRef for the interval to prevent issues with closure stale values
    const playbackIntervalRef = useRef(null);
    // Store current slice in ref to access latest value in interval
    const currentSliceRef = useRef(currentSlice);
    
    // Update ref when slice changes
    useEffect(() => {
        currentSliceRef.current = currentSlice;
    }, [currentSlice]);

    const getAxisInfo = useCallback(() => {
        switch (cameraMode) {
            case 'X': 
                return { 
                    min: 'xmin', 
                    max: 'xmax', 
                    label: 'X',
                    size: currentVolume?.imageInfo?.volumeSize?.x
                };
            case 'Y': 
                return { 
                    min: 'ymin', 
                    max: 'ymax', 
                    label: 'Y',
                    size: currentVolume?.imageInfo?.volumeSize?.y
                };
            case 'Z': 
                return { 
                    min: 'zmin', 
                    max: 'zmax', 
                    label: 'Z',
                    size: currentVolume?.imageInfo?.volumeSize?.z
                };
            default: 
                return null;
        }
    }, [cameraMode, currentVolume]);

    const updateSlice = useCallback((newSlice) => {
        if (!currentVolume) return;
        
        const axisInfo = getAxisInfo();
        if (!axisInfo) return;

        const normalizedPos = newSlice / (totalSlices - 1);
        const sliceThickness = 0.01;
        
        const newClipRegion = {
            ...clipRegion,
            [axisInfo.min]: Math.max(0, normalizedPos - sliceThickness/2),
            [axisInfo.max]: Math.min(1, normalizedPos + sliceThickness/2)
        };

        updateClipRegion(newClipRegion);
        setCurrentSlice(newSlice);
        onSliceChange?.(newSlice);
    }, [currentVolume, getAxisInfo, clipRegion, totalSlices, updateClipRegion, onSliceChange]);

    const stopPlayback = useCallback(() => {
        if (playbackIntervalRef.current) {
            clearInterval(playbackIntervalRef.current);
            playbackIntervalRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    const play = useCallback(() => {
        // Clear any existing interval first
        stopPlayback();
        
        setIsPlaying(true);
        
        // Create new interval with looping logic
        playbackIntervalRef.current = setInterval(() => {
            const nextSlice = currentSliceRef.current + 1;
            
            if (nextSlice >= totalSlices) {
                if (isLooping) {
                    // If looping is enabled, go back to start
                    updateSlice(0);
                } else {
                    // If not looping, stop at the end
                    stopPlayback();
                }
                return;
            }
            
            updateSlice(nextSlice);
        }, 1000 / playbackSpeed);
    }, [playbackSpeed, totalSlices, updateSlice, stopPlayback, isLooping]);

    const pause = useCallback(() => {
        stopPlayback();
    }, [stopPlayback]);

    const stop = useCallback(() => {
        stopPlayback();
        updateSlice(0);
    }, [stopPlayback, updateSlice]);

    const forward = useCallback(() => {
        const nextSlice = Math.min(currentSliceRef.current + 1, totalSlices - 1);
        updateSlice(nextSlice);
    }, [totalSlices, updateSlice]);

    const backward = useCallback(() => {
        const prevSlice = Math.max(currentSliceRef.current - 1, 0);
        updateSlice(prevSlice);
    }, [updateSlice]);

    // Update total slices when volume changes
    useEffect(() => {
        const axisInfo = getAxisInfo();
        if (axisInfo?.size) {
            setTotalSlices(axisInfo.size);
            setCurrentSlice(prev => Math.min(prev, axisInfo.size - 1));
        }
    }, [getAxisInfo]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (playbackIntervalRef.current) {
                clearInterval(playbackIntervalRef.current);
            }
        };
    }, []);

    // Handle camera mode changes
    useEffect(() => {
        stopPlayback();
        setCurrentSlice(0);
    }, [cameraMode, stopPlayback]);

    // Handle playback speed changes
    useEffect(() => {
        if (isPlaying) {
            // Restart playback with new speed
            play();
        }
    }, [playbackSpeed, play, isPlaying]);

    const axisInfo = getAxisInfo();
    if (!axisInfo) return null;

    return (
        <div className="planar-slice-player">
            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Text strong>{axisInfo.label} Plane Navigation</Text>
                </Col>
                <Col span={24}>
                    <Slider
                        min={0}
                        max={totalSlices - 1}
                        value={currentSlice}
                        onChange={updateSlice}
                        style={{ marginBottom: '16px' }}
                    />
                </Col>
            </Row>
            <Row gutter={[16, 16]}>
                <Col span={24} style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <Button 
                        onClick={backward} 
                        icon={<StepBackwardOutlined />}
                        disabled={currentSlice === 0}
                    >
                        Back
                    </Button>
                    {!isPlaying ? (
                        <Button 
                            onClick={play} 
                            icon={<PlayCircleOutlined />}
                            disabled={!isLooping && currentSlice === totalSlices - 1}
                        >
                            Play
                        </Button>
                    ) : (
                        <Button 
                            onClick={pause} 
                            icon={<PauseCircleOutlined />}
                        >
                            Pause
                        </Button>
                    )}
                    <Button 
                        onClick={stop} 
                        icon={<StopOutlined />}
                    >
                        Stop
                    </Button>
                    <Button 
                        onClick={forward} 
                        icon={<StepForwardOutlined />}
                        disabled={currentSlice === totalSlices - 1}
                    >
                        Forward
                    </Button>
                </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                <Col span={12}>
                    <Text>Loop Playback:</Text>
                </Col>
                <Col span={12}>
                    <Switch
                        checked={isLooping}
                        onChange={setIsLooping}
                        checkedChildren="On"
                        unCheckedChildren="Off"
                    />
                </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                <Col span={12}>
                    <Text>Speed (fps):</Text>
                </Col>
                <Col span={12}>
                    <InputNumber
                        min={0.1}
                        max={30}
                        step={0.1}
                        value={playbackSpeed}
                        onChange={value => setPlaybackSpeed(value)}
                    />
                </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: '8px' }}>
                <Col span={12}>
                    <Text>Current Slice:</Text>
                </Col>
                <Col span={12}>
                    <InputNumber
                        min={0}
                        max={totalSlices - 1}
                        value={currentSlice}
                        onChange={updateSlice}
                    />
                </Col>
            </Row>
        </div>
    );
};

export default PlanarSlicePlayer;