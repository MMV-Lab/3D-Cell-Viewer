// PlanarSlicePlayer.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Slider,
  InputNumber,
  Row,
  Col,
  Typography,
  Switch,
} from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
} from "@ant-design/icons";
import styles from "./PlanarSlicePlayer.module.css";

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
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  const play = useCallback(() => {
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
      play();
    }
  }, [playbackSpeed, play, isPlaying]);

  const axisInfo = getAxisInfo();
  if (!axisInfo) return null;

  return (
    <div
      className={`${styles.playerContainer} ${isCollapsed ? styles.collapsed : styles.expanded}`}
    >
      <div
        className={styles.toggleBar}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className={styles.toggleText}>
          {isCollapsed ? "▲ Expand Player" : "▼ Collapse Player"}
        </div>
      </div>

      <div className={styles.playerContent}>
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
              style={{ marginBottom: "16px" }}
            />
          </Col>
        </Row>

        <div className={styles.controlsRow}>
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
            <Button onClick={pause} icon={<PauseCircleOutlined />}>
              Pause
            </Button>
          )}
          <Button onClick={stop} icon={<StopOutlined />}>
            Stop
          </Button>
          <Button
            onClick={forward}
            icon={<StepForwardOutlined />}
            disabled={currentSlice === totalSlices - 1}
          >
            Forward
          </Button>
        </div>

        <div className={styles.settingsRow}>
          <span className={styles.label}>Loop Playback:</span>
          <Switch
            checked={isLooping}
            onChange={setIsLooping}
            checkedChildren="On"
            unCheckedChildren="Off"
          />
        </div>

        <div className={styles.settingsRow}>
          <span className={styles.label}>Speed (fps):</span>
          <InputNumber
            min={0.1}
            max={30}
            step={0.1}
            value={playbackSpeed}
            onChange={(value) => setPlaybackSpeed(value)}
          />
        </div>

        <div className={styles.settingsRow}>
          <span className={styles.label}>Current Slice:</span>
          <InputNumber
            min={0}
            max={totalSlices - 1}
            value={currentSlice}
            onChange={updateSlice}
          />
        </div>
      </div>
    </div>
  );
};

export default PlanarSlicePlayer;
