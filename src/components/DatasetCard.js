import React from 'react';
import { useNavigate } from 'react-router-dom';

function DatasetCard({ title, description, datasetId }) {
    const navigate = useNavigate();

    const cardStyle = {
        display: 'flex',
        flexDirection: 'column',
        margin: '10px',
        padding: '20px',
        border: '1px solid black',
        borderRadius: '5px',
        backgroundColor: 'white',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', // Shadow for depth
        transition: 'transform 0.2s' // Smooth transition for hover effect
    };

    const buttonStyle = {
        marginTop: '10px',
        backgroundColor: 'black',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '4px',
        cursor: 'pointer',
        textAlign: 'center'
    };

    const handleLoadClick = () => {
        navigate(`/dataset/${datasetId}`);
    };

    return (
        <div style={cardStyle} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
            <div><strong>{title}</strong></div>
            <br></br>
            <div>{description}</div>
            <button style={buttonStyle} onClick={handleLoadClick}>Load</button>
        </div>
    );
}

export default DatasetCard;
