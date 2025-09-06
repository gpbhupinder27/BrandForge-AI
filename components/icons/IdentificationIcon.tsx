import React from 'react';

const IdentificationIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 6a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-4.5 0v-1.5A2.25 2.25 0 019.75 6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 15.75a4.5 4.5 0 019 0" />
  </svg>
);

export default IdentificationIcon;
