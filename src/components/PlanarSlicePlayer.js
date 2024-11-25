// PlanarSlicePlayer.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button, Slider, InputNumber, Typography, Switch, Tooltip } from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
} from "@ant-design/icons";

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
  const playbackIntervalRef = useRef(null);
  const currentSliceRef = useRef(currentSlice);

  useEffect(() => {
    currentSliceRef.current = currentSlice;
  }, [currentSlice]);

  const getAxisInfo = useCallback(() => {
    switch (cameraMode) {
      case "X":
        return {
          min: "xmin",
          max: "xmax",
          label: "X",
          size: currentVolume?.imageInfo?.volumeSize?.x,
        };
      case "Y":
        return {
          min: "ymin",
          max: "ymax",
          label: "Y",
          size: currentVolume?.imageInfo?.volumeSize?.y,
        };
      case "Z":
        return {
          min: "zmin",
          max: "zmax",
          label: "Z",
          size: currentVolume?.imageInfo?.volumeSize?.z,
        };
      default:
        return null;
    }
  }, [cameraMode, currentVolume]);

  const updateSlice = useCallback(
    (newSlice) => {
      if (!currentVolume) return;

      const axisInfo = getAxisInfo();
      if (!axisInfo) return;

      const normalizedPos = newSlice / (totalSlices - 1);
      const sliceThickness = 0.01;

      const newClipRegion = {
        ...clipRegion,
        [axisInfo.min]: Math.max(0, normalizedPos - sliceThickness / 2),
        [axisInfo.max]: Math.min(1, normalizedPos + sliceThickness / 2),
      };

      updateClipRegion(newClipRegion);
      setCurrentSlice(newSlice);
      onSliceChange?.(newSlice);
    },
    [
      currentVolume,
      getAxisInfo,
      clipRegion,
      totalSlices,
      updateClipRegion,
      onSliceChange,
    ],
  );

  const stopPlayback = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    stopPlayback();
    setIsPlaying(true);

    playbackIntervalRef.current = setInterval(() => {
      const nextSlice = currentSliceRef.current + 1;

      if (nextSlice >= totalSlices) {
        if (isLooping) {
          updateSlice(0);
        } else {
          stopPlayback();
        }
        return;
      }

      updateSlice(nextSlice);
    }, 1000 / playbackSpeed);
  }, [playbackSpeed, totalSlices, updateSlice, stopPlayback, isLooping]);

  const pausePlayback = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  const resetToStart = useCallback(() => {
    stopPlayback();
    updateSlice(0);
  }, [stopPlayback, updateSlice]);

  const stepForward = useCallback(() => {
    const nextSlice = Math.min(currentSliceRef.current + 1, totalSlices - 1);
    updateSlice(nextSlice);
  }, [totalSlices, updateSlice]);

  const stepBackward = useCallback(() => {
    const prevSlice = Math.max(currentSliceRef.current - 1, 0);
    updateSlice(prevSlice);
  }, [updateSlice]);

  useEffect(() => {
    const axisInfo = getAxisInfo();
    if (axisInfo?.size) {
      setTotalSlices(axisInfo.size);
      setCurrentSlice((prev) => Math.min(prev, axisInfo.size - 1));
    }
  }, [getAxisInfo]);

  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    stopPlayback();
    setCurrentSlice(0);
  }, [cameraMode, stopPlayback]);

  useEffect(() => {
    if (isPlaying) {
      startPlayback();
    }
  }, [playbackSpeed, startPlayback, isPlaying]);

  const axisInfo = getAxisInfo();
  if (!axisInfo) return null;

  return (
    <div className="planar-slice-player-horizontal">
      <div className="controls-container">
        <Tooltip title={`Currently viewing ${axisInfo.label}-axis plane`}>
          <div className="axis-label">
            <Text strong>{`${axisInfo.label} Plane`}</Text>
          </div>
        </Tooltip>

        <div className="playback-controls">
          <Tooltip title="Previous slice">
            <Button
              onClick={stepBackward}
              icon={<StepBackwardOutlined />}
              disabled={currentSlice === 0}
            />
          </Tooltip>

          <Tooltip title={isPlaying ? "Pause playback" : "Start playback"}>
            {!isPlaying ? (
              <Button onClick={startPlayback} icon={<PlayCircleOutlined />}>
                Play
              </Button>
            ) : (
              <Button onClick={pausePlayback} icon={<PauseCircleOutlined />}>
                Pause
              </Button>
            )}
          </Tooltip>

          <Tooltip title="Stop and return to first slice">
            <Button onClick={resetToStart} icon={<StopOutlined />}>
              Stop
            </Button>
          </Tooltip>

          <Tooltip title="Next slice">
            <Button
              onClick={stepForward}
              icon={<StepForwardOutlined />}
              disabled={currentSlice === totalSlices - 1}
            />
          </Tooltip>
        </div>

        <div className="slider-container">
          <Tooltip title="Drag to navigate through slices">
            <Slider
              min={0}
              max={totalSlices - 1}
              value={currentSlice}
              onChange={updateSlice}
              className="horizontal-slider"
              tooltip={{
                formatter: (value) => `Slice ${value + 1} of ${totalSlices}`,
              }}
            />
          </Tooltip>
        </div>

        <div className="settings-container">
          <Tooltip title="Current slice number">
            <div className="slice-indicator">
              <Text>Slice:</Text>
              <InputNumber
                min={0}
                max={totalSlices - 1}
                value={currentSlice}
                onChange={updateSlice}
                size="small"
              />
              <Text>/ {totalSlices - 1}</Text>
            </div>
          </Tooltip>

          <Tooltip title="Playback speed in frames per second">
            <div className="speed-control">
              <Text>Speed (fps):</Text>
              <InputNumber
                min={0.1}
                max={30}
                step={0.1}
                value={playbackSpeed}
                onChange={setPlaybackSpeed}
                size="small"
              />
            </div>
          </Tooltip>

          <Tooltip title="Toggle continuous playback loop">
            <div className="loop-control">
              <Text>Loop:</Text>
              <Switch
                checked={isLooping}
                onChange={setIsLooping}
                size="small"
              />
            </div>
          </Tooltip>
        </div>
      </div>
      <style jsx>{`
        .planar-slice-player-horizontal {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: white;
          border-top: 1px solid #e0e0e0;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          padding: 0 16px;
        }

        .controls-container {
          display: flex;
          align-items: center;
          height: 100%;
          gap: 16px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .axis-label {
          min-width: 80px;
          cursor: help;
        }

        .playback-controls {
          display: flex;
          gap: 8px;
        }

        .slider-container {
          flex: 1;
          margin: 0 16px;
        }

        .horizontal-slider {
          margin: 0;
        }

        .settings-container {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .slice-indicator,
        .speed-control,
        .loop-control {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: help;
        }

        .slice-indicator :global(.ant-input-number),
        .speed-control :global(.ant-input-number) {
          width: 70px;
        }

        /* Ensure tooltips appear above other elements */
        :global(.ant-tooltip) {
          z-index: 1001;
        }
      `}</style>
    </div>
  );
};

export default PlanarSlicePlayer;
