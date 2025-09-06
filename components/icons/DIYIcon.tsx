import React from 'react';

const DIYIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.47-2.47a.375.375 0 00-.53-.53l-2.47 2.47m0 0a.375.375 0 00.53.53l2.47-2.47m-2.47 2.47L3 21m0 0l2.04-2.04M3 21h3.75" />
  </svg>
);

export default DIYIcon;
