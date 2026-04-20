'use client';

import Image from 'next/image';
import type { CSSProperties, FormEventHandler } from 'react';
import styles from '@/components/portal-login-shell.module.css';

type Feature = {
  title: string;
  body: string;
};

type PromoPoint = {
  label: string;
  value: string;
};

type Testimonial = {
  quote: string;
  attribution: string;
};

type HeroImageVariant = 'portrait' | 'landscape';

type ThemeVars = CSSProperties & {
  '--page-background': string;
  '--brand-background': string;
  '--brand-shadow': string;
  '--button-background': string;
  '--accent-color': string;
  '--mark-background': string;
};

type PortalLoginShellProps = {
  badge: string;
  heroTitle: string;
  heroText: string;
  promoLabel: string;
  promoTitle: string;
  promoText: string;
  promoPoints: PromoPoint[];
  services: string[];
  testimonial: Testimonial;
  features: Feature[];
  heroImageSrc: string;
  heroImageAlt: string;
  heroImageWidth: number;
  heroImageHeight: number;
  heroImageVariant?: HeroImageVariant;
  trustPills: string[];
  cardEyebrow: string;
  cardTitle: string;
  cardText: string;
  emailLabel: string;
  emailPlaceholder: string;
  email: string;
  onEmailChange: (value: string) => void;
  passwordLabel: string;
  passwordPlaceholder: string;
  password: string;
  onPasswordChange: (value: string) => void;
  submitLabel: string;
  submitLoadingLabel: string;
  loading: boolean;
  message: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  theme: ThemeVars;
  brandMark:
    | {
        kind: 'image';
        src: string;
        alt: string;
      }
    | {
        kind: 'badge';
        label: string;
      };
};

export default function PortalLoginShell({
  badge,
  heroTitle,
  heroText,
  promoLabel,
  promoTitle,
  promoText,
  promoPoints,
  services,
  testimonial,
  features,
  heroImageSrc,
  heroImageAlt,
  heroImageWidth,
  heroImageHeight,
  heroImageVariant = 'landscape',
  trustPills,
  cardEyebrow,
  cardTitle,
  cardText,
  emailLabel,
  emailPlaceholder,
  email,
  onEmailChange,
  passwordLabel,
  passwordPlaceholder,
  password,
  onPasswordChange,
  submitLabel,
  submitLoadingLabel,
  loading,
  message,
  onSubmit,
  theme,
  brandMark,
}: PortalLoginShellProps) {
  return (
    <main className={styles.page} style={theme}>
      <div className={styles.shell}>
        <section className={styles.brandPanel}>
          <div className={styles.brandBadge}>{badge}</div>

          {brandMark.kind === 'image' ? (
            <Image
              src={brandMark.src}
              alt={brandMark.alt}
              width={88}
              height={88}
              className={styles.brandImage}
            />
          ) : (
            <div className={styles.brandBadgeMark}>{brandMark.label}</div>
          )}

          <h1 className={styles.heroTitle}>{heroTitle}</h1>
          <p className={styles.heroText}>{heroText}</p>

          <div className={styles.featureGrid}>
            {features.map((feature) => (
              <div key={feature.title} className={styles.featureCard}>
                <div className={styles.featureTitle}>{feature.title}</div>
                <p className={styles.featureBody}>{feature.body}</p>
              </div>
            ))}
          </div>

          <div
            className={`${styles.imageFrame} ${
              heroImageVariant === 'portrait' ? styles.imageFramePortrait : styles.imageFrameLandscape
            }`}
          >
            <Image
              src={heroImageSrc}
              alt={heroImageAlt}
              width={heroImageWidth}
              height={heroImageHeight}
              sizes="(max-width: 768px) 100vw, 50vw"
              className={`${styles.heroImage} ${
                heroImageVariant === 'portrait' ? styles.heroImagePortrait : styles.heroImageLandscape
              }`}
            />
          </div>

          <div className={styles.trustRow}>
            {trustPills.map((pill) => (
              <div key={pill} className={styles.trustPill}>
                {pill}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardEyebrow}>{cardEyebrow}</div>
          <h2 className={styles.cardTitle}>{cardTitle}</h2>
          <p className={styles.cardText}>{cardText}</p>

          <div className={`${styles.promoCard} ${styles.cardPromo}`}>
            <div className={styles.promoLabel}>{promoLabel}</div>
            <div className={styles.promoTitle}>{promoTitle}</div>
            <p className={styles.promoText}>{promoText}</p>

            <div className={styles.servicesRibbon}>
              {services.map((service) => (
                <span key={service} className={styles.serviceChip}>
                  {service}
                </span>
              ))}
            </div>

            <div className={styles.promoGrid}>
              {promoPoints.map((point) => (
                <div key={point.label} className={styles.promoMetric}>
                  <div className={styles.promoMetricLabel}>{point.label}</div>
                  <div className={styles.promoMetricValue}>{point.value}</div>
                </div>
              ))}
            </div>

            <blockquote className={styles.testimonial}>
              <p className={styles.testimonialQuote}>
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <footer className={styles.testimonialAttribution}>
                {testimonial.attribution}
              </footer>
            </blockquote>
          </div>

          <form onSubmit={onSubmit} className={styles.form}>
            <label className={styles.label}>{emailLabel}</label>
            <input
              type="email"
              placeholder={emailPlaceholder}
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className={styles.input}
              required
            />

            <label className={styles.label}>{passwordLabel}</label>
            <input
              type="password"
              placeholder={passwordPlaceholder}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className={styles.input}
              required
            />

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? submitLoadingLabel : submitLabel}
            </button>

            {message && <div className={styles.message}>{message}</div>}
          </form>
        </section>
      </div>
    </main>
  );
}
