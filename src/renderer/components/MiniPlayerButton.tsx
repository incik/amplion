import type { ReactNode } from "react";

interface MiniPlayerButtonProps {
  id: string;
  onClick: () => void;
  title: string;
  children: ReactNode;
}

export const MiniPlayerButton = ({
  id,
  onClick,
  title,
  children,
}: MiniPlayerButtonProps) => (
  <button onClick={onClick} className="mp-btn" id={id} title={title}>
    {children}
  </button>
);
