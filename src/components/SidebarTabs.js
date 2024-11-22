import React, { useState } from 'react';
import { Layout, Tabs, Collapse, Switch, Slider, InputNumber, Row, Col, Select, Input, Button, Tooltip } from 'antd';
import {
    SettingOutlined,
    FolderOutlined,
    EyeOutlined,
    CameraOutlined,
    ControlOutlined,
    BgColorsOutlined,
    ApartmentOutlined,
    BorderOutlined,
    FileImageOutlined,
    BulbOutlined // Changed from LightOutlined
} from '@ant-design/icons';
import { PRESET_COLOR_MAP } from './constants';

const { Sider } = Layout;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Option } = Select;

export const SidebarTabs = ({
    settings,
    updateSetting,
    channels,
    updateChannelOptions,
    clipRegion,
    updateClipRegion,
    fileData,
    handleFileSelect,
    metadata,
    lights,
    updateLights,
    currentPreset,
    applyColorPreset
}) => {
    const [activeKey, setActiveKey] = useState('settings');

    // Helper function to format color for input
    const rgbToHex = (r, g, b) => {
        const toHex = x => ('0' + Math.round(x).toString(16)).slice(-2);
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    // Helper function to parse hex color
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : null;
    };

    return (
        <Sider
            width={300}
            className="site-layout-background"
            collapsible
            breakpoint="lg"
            style={{ 
                background: '#fff', 
                overflowY: 'auto', 
                height: '100vh' 
            }}
        >
            <Tabs
                activeKey={activeKey}
                onChange={setActiveKey}
                tabPosition="left"
                type="card"
            >
                {/* Settings Tab */}
                <TabPane
                    tab={
                        <Tooltip title="Volume Settings">
                            <SettingOutlined />
                        </Tooltip>
                    }
                    key="settings"
                >
                    <Collapse defaultActiveKey={['render']}>
                        {/* Render Settings */}
                        <Panel
                            header={
                                <span>
                                    <EyeOutlined /> Render Mode
                                </span>
                            }
                            key="render"
                        >
                            <Row align="middle" className="setting-row">
                                <Col span={12}>Path Trace</Col>
                                <Col span={12}>
                                    <Switch
                                        checked={settings.pathTrace}
                                        onChange={val => updateSetting('pathTrace', val)}
                                    />
                                </Col>
                            </Row>
                            <Row align="middle" className="setting-row">
                                <Col span={12}>Density</Col>
                                <Col span={12}>
                                    <Slider
                                        min={0}
                                        max={100}
                                        value={settings.density}
                                        onChange={val => updateSetting('density', val)}
                                    />
                                </Col>
                            </Row>
                            <Row align="middle" className="setting-row">
                                <Col span={12}>Brightness</Col>
                                <Col span={12}>
                                    <Slider
                                        min={0}
                                        max={100}
                                        value={settings.brightness}
                                        onChange={val => updateSetting('brightness', val)}
                                    />
                                </Col>
                            </Row>
                            <Row align="middle" className="setting-row">
                                <Col span={12}>Mask Alpha</Col>
                                <Col span={12}>
                                    <Slider
                                        min={0}
                                        max={100}
                                        value={settings.maskAlpha}
                                        onChange={val => updateSetting('maskAlpha', val)}
                                    />
                                </Col>
                            </Row>
                        </Panel>

                        {/* Camera Settings */}
                        <Panel
                            header={
                                <span>
                                    <CameraOutlined /> Camera
                                </span>
                            }
                            key="camera"
                        >
                            <Row align="middle" className="setting-row">
                                <Col span={12}>Mode</Col>
                                <Col span={12}>
                                    <Select
                                        value={settings.cameraMode}
                                        onChange={val => updateSetting('cameraMode', val)}
                                        style={{ width: '100%' }}
                                    >
                                        <Option value="X">X</Option>
                                        <Option value="Y">Y</Option>
                                        <Option value="Z">Z</Option>
                                        <Option value="3D">3D</Option>
                                    </Select>
                                </Col>
                            </Row>
                            <Row align="middle" className="setting-row">
                                <Col span={12}>FOV</Col>
                                <Col span={12}>
                                    <InputNumber
                                        min={0}
                                        max={90}
                                        value={settings.fov}
                                        onChange={val => updateSetting('fov', val)}
                                        style={{ width: '100%' }}
                                    />
                                </Col>
                            </Row>
                            <Row align="middle" className="setting-row">
                                <Col span={12}>Focal Distance</Col>
                                <Col span={12}>
                                    <InputNumber
                                        min={0.1}
                                        max={5.0}
                                        step={0.1}
                                        value={settings.focalDistance}
                                        onChange={val => updateSetting('focalDistance', val)}
                                        style={{ width: '100%' }}
                                    />
                                </Col>
                            </Row>
                            <Row align="middle" className="setting-row">
                                <Col span={12}>Aperture</Col>
                                <Col span={12}>
                                    <InputNumber
                                        min={0}
                                        max={0.1}
                                        step={0.001}
                                        value={settings.aperture}
                                        onChange={val => updateSetting('aperture', val)}
                                        style={{ width: '100%' }}
                                    />
                                </Col>
                            </Row>
                        </Panel>

                        {/* Display Settings */}
                        <Panel
                            header={
                                <span>
                                    <ControlOutlined /> Display
                                </span>
                            }
                            key="display"
                        >
                            <Row align="middle" className="setting-row">
                                <Col span={12}>Show Axis</Col>
                                <Col span={12}>
                                    <Switch
                                        checked={settings.showAxis}
                                        onChange={val => updateSetting('showAxis', val)}
                                    />
                                </Col>
                            </Row>
                            <Row align="middle" className="setting-row">
                                <Col span={12}>Show Scale Bar</Col>
                                <Col span={12}>
                                    <Switch
                                        checked={settings.showScaleBar}
                                        onChange={val => updateSetting('showScaleBar', val)}
                                    />
                                </Col>
                            </Row>
                            <Row align="middle" className="setting-row">
                                <Col span={12}>Show Bounding Box</Col>
                                <Col span={12}>
                                    <Switch
                                        checked={settings.showBoundingBox}
                                        onChange={val => updateSetting('showBoundingBox', val)}
                                    />
                                </Col>
                            </Row>
                            <Row align="middle" className="setting-row">
                                <Col span={12}>Background Color</Col>
                                <Col span={12}>
                                    <Input
                                        type="color"
                                        value={rgbToHex(...settings.backgroundColor)}
                                        onChange={e => {
                                            const rgb = hexToRgb(e.target.value);
                                            if (rgb) updateSetting('backgroundColor', rgb);
                                        }}
                                    />
                                </Col>
                            </Row>
                        </Panel>

                        {/* Channel Settings */}
                        <Panel
                            header={
                                <span>
                                    <BgColorsOutlined /> Channels
                                </span>
                            }
                            key="channels"
                        >
                            <Row align="middle" className="setting-row">
                                <Col span={12}>Color Preset</Col>
                                <Col span={12}>
                                    <Select
                                        value={currentPreset}
                                        onChange={applyColorPreset}
                                        style={{ width: '100%' }}
                                    >
                                        {PRESET_COLOR_MAP.map(preset => (
                                            <Option key={preset.key} value={preset.key}>
                                                {preset.name}
                                            </Option>
                                        ))}
                                    </Select>
                                </Col>
                            </Row>
                            {channels.map((channel, index) => (
                                <div key={index} className="channel-control">
                                    <h4>{channel.name || `Channel ${index + 1}`}</h4>
                                    <Row align="middle" className="setting-row">
                                        <Col span={12}>Enable</Col>
                                        <Col span={12}>
                                            <Switch
                                                checked={channel.enabled}
                                                onChange={val => updateChannelOptions(index, { enabled: val })}
                                            />
                                        </Col>
                                    </Row>
                                    <Row align="middle" className="setting-row">
                                    <Col span={12}>Opacity</Col>
                                        <Col span={12}>
                                            <Slider
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                value={channel.opacity}
                                                onChange={val => updateChannelOptions(index, { opacity: val })}
                                            />
                                        </Col>
                                    </Row>
                                    <Row align="middle" className="setting-row">
                                        <Col span={12}>Color</Col>
                                        <Col span={12}>
                                            <Input
                                                type="color"
                                                value={rgbToHex(...channel.color)}
                                                onChange={e => {
                                                    const rgb = hexToRgb(e.target.value);
                                                    if (rgb) updateChannelOptions(index, { color: rgb });
                                                }}
                                            />
                                        </Col>
                                    </Row>
                                    <Row align="middle" className="setting-row">
                                        <Col span={12}>Isosurface</Col>
                                        <Col span={12}>
                                            <Switch
                                                checked={channel.isosurfaceEnabled}
                                                onChange={val => updateChannelOptions(index, { 
                                                    isosurfaceEnabled: val 
                                                })}
                                            />
                                        </Col>
                                    </Row>
                                    {channel.isosurfaceEnabled && (
                                        <>
                                            <Row align="middle" className="setting-row">
                                                <Col span={12}>Isovalue</Col>
                                                <Col span={12}>
                                                    <Slider
                                                        min={0}
                                                        max={255}
                                                        value={channel.isovalue}
                                                        onChange={val => updateChannelOptions(index, { 
                                                            isovalue: val 
                                                        })}
                                                    />
                                                </Col>
                                            </Row>
                                            <Row align="middle" className="setting-row">
                                                <Col span={12}>Surface Opacity</Col>
                                                <Col span={12}>
                                                    <Slider
                                                        min={0}
                                                        max={1}
                                                        step={0.01}
                                                        value={channel.isosurfaceOpacity}
                                                        onChange={val => updateChannelOptions(index, { 
                                                            isosurfaceOpacity: val 
                                                        })}
                                                    />
                                                </Col>
                                            </Row>
                                        </>
                                    )}
                                </div>
                            ))}
                        </Panel>

                        {/* Clipping Settings */}
                        <Panel
                            header={
                                <span>
                                    <BorderOutlined /> Clipping
                                </span>
                            }
                            key="clipping"
                        >
                            {['X', 'Y', 'Z'].map(axis => (
                                <div key={axis} className="clip-control">
                                    <h4>{axis} Axis Clipping</h4>
                                    <Slider
                                        range
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={[
                                            clipRegion[`${axis.toLowerCase()}min`],
                                            clipRegion[`${axis.toLowerCase()}max`]
                                        ]}
                                        onChange={([min, max]) => {
                                            updateClipRegion({
                                                ...clipRegion,
                                                [`${axis.toLowerCase()}min`]: min,
                                                [`${axis.toLowerCase()}max`]: max
                                            });
                                        }}
                                    />
                                </div>
                            ))}
                        </Panel>

                        {/* Lighting Settings */}
                        <Panel
                            header={
                                <span>
                                    <BulbOutlined /> Lighting
                                </span>
                            }
                            key="lighting"
                        >
                            {/* Sky Light Controls */}
                            <div className="light-section">
                                <h4>Sky Light</h4>
                                {['Top', 'Middle', 'Bottom'].map((position, index) => (
                                    <div key={position} className="light-control">
                                        <h5>{position}</h5>
                                        <Row align="middle" className="setting-row">
                                            <Col span={12}>Intensity</Col>
                                            <Col span={12}>
                                                <Slider
                                                    min={0}
                                                    max={1}
                                                    step={0.01}
                                                    value={lights[0][`m${position}Intensity`]}
                                                    onChange={val => updateLights('sky', position.toLowerCase(), 'intensity', val)}
                                                />
                                            </Col>
                                        </Row>
                                        <Row align="middle" className="setting-row">
                                            <Col span={12}>Color</Col>
                                            <Col span={12}>
                                                <Input
                                                    type="color"
                                                    value={rgbToHex(...lights[0][`m${position}Color`])}
                                                    onChange={e => {
                                                        const rgb = hexToRgb(e.target.value);
                                                        if (rgb) updateLights('sky', position.toLowerCase(), 'color', rgb);
                                                    }}
                                                />
                                            </Col>
                                        </Row>
                                    </div>
                                ))}
                            </div>

                            {/* Area Light Controls */}
                            <div className="light-section">
                                <h4>Area Light</h4>
                                <Row align="middle" className="setting-row">
                                    <Col span={12}>Intensity</Col>
                                    <Col span={12}>
                                        <Slider
                                            min={0}
                                            max={200}
                                            value={lights[1].intensity}
                                            onChange={val => updateLights('area', null, 'intensity', val)}
                                        />
                                    </Col>
                                </Row>
                                <Row align="middle" className="setting-row">
                                    <Col span={12}>Color</Col>
                                    <Col span={12}>
                                        <Input
                                            type="color"
                                            value={rgbToHex(...lights[1].color)}
                                            onChange={e => {
                                                const rgb = hexToRgb(e.target.value);
                                                if (rgb) updateLights('area', null, 'color', rgb);
                                            }}
                                        />
                                    </Col>
                                </Row>
                                <Row align="middle" className="setting-row">
                                    <Col span={12}>Direction (θ)</Col>
                                    <Col span={12}>
                                        <Slider
                                            min={0}
                                            max={360}
                                            value={lights[1].theta * (180 / Math.PI)}
                                            onChange={val => updateLights('area', null, 'theta', val * (Math.PI / 180))}
                                        />
                                    </Col>
                                </Row>
                                <Row align="middle" className="setting-row">
                                    <Col span={12}>Direction (φ)</Col>
                                    <Col span={12}>
                                        <Slider
                                            min={0}
                                            max={180}
                                            value={lights[1].phi * (180 / Math.PI)}
                                            onChange={val => updateLights('area', null, 'phi', val * (Math.PI / 180))}
                                        />
                                    </Col>
                                </Row>
                            </div>
                        </Panel>

                        {/* Metadata Panel */}
                        <Panel
                            header={
                                <span>
                                    <ApartmentOutlined /> Metadata
                                </span>
                            }
                            key="metadata"
                        >
                            {metadata ? (
                                <div className="metadata-section">
                                    <Row className="metadata-row">
                                        <Col span={12}>Name:</Col>
                                        <Col span={12}>{metadata.name}</Col>
                                    </Row>
                                    <Row className="metadata-row">
                                        <Col span={12}>Dimensions:</Col>
                                        <Col span={12}>
                                            {`${metadata.dimensions.x} × ${metadata.dimensions.y} × ${metadata.dimensions.z}`}
                                        </Col>
                                    </Row>
                                    <Row className="metadata-row">
                                        <Col span={12}>Channels:</Col>
                                        <Col span={12}>{metadata.dimensions.channels}</Col>
                                    </Row>
                                    <Row className="metadata-row">
                                        <Col span={12}>Pixel Size:</Col>
                                        <Col span={12}>
                                            {metadata.pixelSize.map(size => size.toFixed(2)).join(' × ')} {metadata.spatialUnit}
                                        </Col>
                                    </Row>
                                </div>
                            ) : (
                                <div>No volume loaded</div>
                            )}
                        </Panel>
                    </Collapse>
                </TabPane>

                {/* Files Tab */}
                <TabPane
                    tab={
                        <Tooltip title="File Browser">
                            <FolderOutlined />
                        </Tooltip>
                    }
                    key="files"
                >
                    <div className="file-browser">
                        <Collapse>
                            {Object.entries(fileData).map(([category, files]) => (
                                <Panel 
                                    header={
                                        <span className="category-header">
                                            <FolderOutlined /> {category}
                                        </span>
                                    } 
                                    key={category}
                                >
                                    {files.map(file => (
                                        <div
                                            key={file}
                                            className="file-item"
                                            onClick={() => handleFileSelect(category, file)}
                                        >
                                            <FileImageOutlined /> {file}
                                        </div>
                                    ))}
                                </Panel>
                            ))}
                        </Collapse>
                    </div>
                </TabPane>
            </Tabs>

            <style jsx>{`
                .setting-row {
                    margin-bottom: 16px;
                }
                .channel-control {
                    padding: 12px;
                    border-bottom: 1px solid #f0f0f0;
                    margin-bottom: 16px;
                }
                .clip-control {
                    margin-bottom: 24px;
                }
                .light-section {
                    margin-bottom: 24px;
                }
                .metadata-section {
                    padding: 12px;
                }
                .metadata-row {
                    margin-bottom: 8px;
                }
                .file-browser {
                    height: calc(100vh - 48px);
                    overflow-y: auto;
                }
                .file-item {
                    padding: 8px 16px;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }
                .file-item:hover {
                    background-color: #f5f5f5;
                }
                .category-header {
                    font-weight: 500;
                }
            `}</style>
        </Sider>
    );
};

export default SidebarTabs;