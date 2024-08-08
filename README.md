# 3D Volume Viewer Application

This application is a 3D volume viewer designed to visualize medical imaging data of mouse body parts. The frontend is built with React and communicates with a Node.js backend that serves the volume files. Users can select different body parts and view the corresponding 3D volume files.

## Table of Contents

1. [Features](#features)
2. [Installation](#installation)
3. [Usage](#usage)
4. [File Structure](#file-structure)
5. [API Endpoints](#api-endpoints)
6. [Technologies Used](#technologies-used)
7. [Contributing](#contributing)
8. [License](#license)

## Features

- Visualize 3D volume data in various formats (OME-TIFF, OME-ZARR, TIFF).
- Control rendering modes (Path Trace, Ray March).
- Adjust visualization parameters such as density, exposure, and gamma.
- Manipulate lighting settings and camera modes.
- Playback functionality for time-series data.
- Dynamic channel controls to adjust color and material properties.
- Set clipping regions and view bounding boxes.
- Flip volume along different axes.
- Screenshot capturing functionality.
- RESTful API for serving volume files.

## Installation

### Prerequisites

- Node.js (v12 or later)
- npm (v6 or later)

### Backend Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/3d-volume-viewer.git
    cd 3d-volume-viewer
    ```

2. Navigate to the backend directory:
    ```bash
    cd server
    ```

3. Install dependencies:
    ```bash
    npm install
    ```

4. Start the server:
    ```bash
    npm start
    ```

### Frontend Setup

1. Navigate to the frontend directory:
    ```bash
    cd ../client
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Start the development server:
    ```bash
    npm start
    ```

4. Open your browser and navigate to `http://localhost:3000`.

## Usage

### Upload Files

1. Place your volume files in the appropriate directories under `server/uploads`. Each directory represents a different body part (e.g., `liver`, `brain`).

### View and Manipulate Volumes

1. Use the file selector in the frontend to choose a body part and a specific volume file.
2. Adjust rendering and visualization settings using the provided controls.
3. Use playback controls to navigate through time-series data.
4. Capture screenshots using the screenshot button.

## File Structure

