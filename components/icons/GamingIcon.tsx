import React from 'react';

const GamingIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.25 8.25H8.75a.75.75 0 00-.75.75v5.25c0 .414.336.75.75.75h6.5a.75.75 0 00.75-.75V9a.75.75 0 00-.75-.75z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12h-2.25m0 0V9.75M6 12v2.25m12-4.5h2.25m0 0v2.25m0-2.25V9.75M12 15.75V18m0 0h2.25m-2.25 0H9.75M12 8.25V6m0 0h2.25m-2.25 0H9.75" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12a8.25 8.25 0 1116.5 0 8.25 8.25 0 01-16.5 0z" />
  </svg>
);

export default GamingIcon;