
import React from 'react';

const ChatBubbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.722.234c-.383.024-.74.153-1.034.372l-2.16 1.44c-.396.264-.92.264-1.316 0l-2.16-1.44a2.25 2.25 0 00-1.034-.372l-3.722-.234A2.25 2.25 0 013 14.894V10.607c0-.97.616-1.813 1.5-2.097m14.25-3.866A2.25 2.25 0 0017.25 2.25H6.75A2.25 2.25 0 004.5 4.5v.75m13.5 0V4.5" />
  </svg>
);

export default ChatBubbleIcon;
