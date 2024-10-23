import React from 'react';
import DatasetCard from './DatasetCard';

function WelcomePage() {

  const gridContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)', // 2x2 grid layout
    gap: '20px',
    marginTop: '60px' // Adjust according to navbar height
  };

  return (
    <section style={{ paddingTop: '60px', color: 'black', backgroundColor: 'white' }}>

      <div style={{ padding: '20px' }}>
        <h1>Welcome to the ISAS Platform for 3D visualization</h1>
        <p>This platform provides a comprehensive exploration and download functionality for various data on migrating cells, developed in collaboration with the Leibniz-Institut für Analytische Wissenschaften.</p>
        <p>With a repository of over 1000 videos comprising more than 400,000 individual images, our platform provides a reliable source for detailed analysis. Intuitive widgets will allow users to selectively engage with different datasets, each presenting specific biological questions.</p>
        <p>So far, we have provided the dataset "ComplexEye". Dive deep into the data by clicking on the corresponding widget.</p>
        <p>More datasets will follow.</p>
      </div>

      <main style={{ padding: '20px' }}>
        <h2>Load a dataset to get started</h2>
        <div style={gridContainerStyle}>
          {/* Example DatasetCard usage */}
          <DatasetCard title="3D VesselExpress" description="Explore and visualize 3D volumetric data across various mouse body parts. This dataset includes high-resolution scans of organs such as the brain, available in multiple formats like OME-TIFF and Zarr. Dive into detailed biological structures with advanced rendering and analysis tools." datasetId="1" />
          <DatasetCard title="Dataset 2" description="Coming soon..." datasetId="2" />
          <DatasetCard title="Dataset 3" description="Coming soon..." datasetId="3" />
          <DatasetCard title="Dataset 4" description="Coming soon..." datasetId="4" />
          {/* Additional DatasetCards can be added here as more datasets become available */}
        </div>
      </main>     
    </section>
  );
}

export default WelcomePage;
