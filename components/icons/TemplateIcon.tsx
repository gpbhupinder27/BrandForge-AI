import React from 'react';

const TemplateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M10.5 16.5h3m-3.75 3h6.5a2.25 2.25 0 002.25-2.25v-1.5a2.25 2.25 0 00-2.25-2.25h-6.5a2.25 2.25 0 00-2.25 2.25v1.5A2.25 2.25 0 006.75 19.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 3.75H9A2.25 2.25 0 006.75 6v1.5h10.5V6A2.25 2.25 0 0015 3.75z" />
  </svg>
);

export default TemplateIcon;
