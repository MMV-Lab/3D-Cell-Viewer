import React from 'react';

const Footer = () => {
  return (
    <footer className="app-footer">
      <p>We extend our gratitude to all contributors involved in this research, particularly <strong>Prof. Axel Mosig</strong> from <strong>Ruhr University Bochum</strong> and <strong>Prof. Dirk M. Hermann</strong> from <strong>University Hospital Essen</strong>, for their collaboration on this work. The <strong>ISAS</strong> team received substantial support from the <strong>Ministry of Culture and Science of the State of North Rhine-Westphalia (MKW NRW)</strong>. Further funding for the <strong>AMBIOM</strong> group was provided by the <strong>Federal Ministry of Education and Research (BMBF)</strong> in Germany under the funding reference <strong>161L0272</strong>.</p>
      <p>For data-related inquiries, please reach out to <strong>Dr. Jianxu Chen</strong> at <a href="mailto:jianxu.chen@isas.de">jianxu.chen@isas.de</a>. The dataset is available on <a href="https://zenodo.org/records/6025935" target="_blank" rel="noopener noreferrer">Zenodo</a> under the <strong>Creative Commons Attribution 4.0 International</strong> license.</p>
      <p>If you use the data from this portal, please cite the following paper: <strong>Spangenberg, Philippa, et al. "Rapid and fully automated blood vasculature analysis in 3D light-sheet image volumes of different organs." Cell Reports Methods 3.3 (2023).</strong></p>
    </footer>
  );
};

export default Footer;
