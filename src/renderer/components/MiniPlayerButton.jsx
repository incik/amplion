import React from "react";

export const MiniPlayerButton = ({ id, onClick, title, children }) => (
  <button onClick={onClick} className="mp-btn" id={id} title={title}>
    {children}
  </button>
);
