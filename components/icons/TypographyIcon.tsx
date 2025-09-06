import React from 'react';

const TypographyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12.75h16.5m-16.5-9h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" transform="matrix(1 0 0 1 0 -2)" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.375L7.5 4.875l.75 1.5M16.5 19.125h.75a2.25 2.25 0 002.25-2.25v-1.5a2.25 2.25 0 00-2.25-2.25h-.75m-6 4.5v-1.5a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25v1.5m-6 0h6" />
  </svg>
);

export default TypographyIcon;