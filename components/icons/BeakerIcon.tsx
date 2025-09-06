
import React from 'react';

const BeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.512 1.424L6.38 13.5h11.24l-2.858-3.258a2.25 2.25 0 01-.512-1.424V3.104a2.25 2.25 0 00-2.25-2.25H12a2.25 2.25 0 00-2.25 2.25z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5h12v5.25a2.25 2.25 0 01-2.25 2.25H8.25a2.25 2.25 0 01-2.25-2.25V13.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 16.5h6" />
  </svg>
);

export default BeakerIcon;