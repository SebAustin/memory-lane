import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { SiteChrome } from "./SiteChrome";
import styles from "./MessagePage.module.css";

/** A calm, branded full-page message: errors, missing pages, stubs. Keeps the chrome and footer. */
export function MessagePage({
  kicker,
  title,
  children,
  actions,
}: {
  kicker?: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <SiteChrome>
      <Container className={styles.wrap}>
        {kicker !== undefined && <p className={styles.kicker}>{kicker}</p>}
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.body}>{children}</div>
        {actions !== undefined && <div className={styles.actions}>{actions}</div>}
      </Container>
    </SiteChrome>
  );
}

export function PrimaryLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} className={styles.primary} />;
}

export function SecondaryLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} className={styles.secondary} />;
}

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={styles.primary} />;
}
