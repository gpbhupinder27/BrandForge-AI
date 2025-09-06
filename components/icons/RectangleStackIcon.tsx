import React from 'react';

const RectangleStackIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-5.571 3-5.571-3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 12 17.25 21.75 12" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m6.429 14.25 5.571 3 5.571-3" />
  </svg>
);

export default RectangleStackIcon;