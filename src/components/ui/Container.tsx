import type { ReactNode } from "react";
import styles from "./Container.module.css";

/** The page column: fluid gutters, 80rem max (96rem on very wide screens). */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ? `${styles.container} ${className}` : styles.container}>{children}</div>;
}
