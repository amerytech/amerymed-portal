export default function HomePage() {
  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div style={heroCopyStyle}>
          <div style={eyebrowStyle}>AmeryMed Secure Exchange</div>
          <h1 style={titleStyle}>Medical document upload with separate spaces for clients and staff.</h1>
          <p style={descriptionStyle}>
            The portal is designed for secure intake, cleaner handoff to your billing team,
            and faster review of EOBs, claims, face sheets, and related documents.
          </p>

          <div style={ctaRowStyle}>
            <a href="/login" style={primaryLinkStyle}>
              Open Unified Login
            </a>
            <a href="/client/login" style={secondaryLinkStyle}>
              Client Login
            </a>
          </div>
        </div>

        <div style={infoGridStyle}>
          <article style={infoCardStyle}>
            <div style={cardLabelStyle}>For clients</div>
            <div style={cardTitleStyle}>Upload documents and review history</div>
            <p style={cardTextStyle}>
              Submit files with notes, patient references, and category details in one place.
            </p>
          </article>

          <article style={infoCardStyle}>
            <div style={cardLabelStyle}>For admins</div>
            <div style={cardTitleStyle}>Review intake and track activity</div>
            <p style={cardTextStyle}>
              Access the admin dashboard to triage uploads and monitor recent actions.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  padding: '24px',
  background:
    'radial-gradient(circle at top left, rgba(15, 118, 110, 0.18), transparent 28%), linear-gradient(135deg, #eff8f6 0%, #eef4fb 52%, #f9fbff 100%)',
  fontFamily: 'Arial, sans-serif',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const heroStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '1180px',
  borderRadius: '30px',
  padding: '34px',
  background: 'linear-gradient(155deg, #0f766e 0%, #123c7a 60%, #102848 100%)',
  color: '#fff',
  boxShadow: '0 24px 70px rgba(18, 60, 122, 0.22)',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '24px',
};

const heroCopyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

const eyebrowStyle: React.CSSProperties = {
  display: 'inline-flex',
  width: 'fit-content',
  padding: '8px 12px',
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.18)',
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: '16px',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'clamp(2.1rem, 4vw, 4rem)',
  lineHeight: 1,
  maxWidth: '12ch',
};

const descriptionStyle: React.CSSProperties = {
  margin: '16px 0 0 0',
  maxWidth: '58ch',
  color: 'rgba(239, 246, 255, 0.9)',
  fontSize: '17px',
  lineHeight: 1.7,
};

const ctaRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '14px',
  flexWrap: 'wrap',
  marginTop: '24px',
};

const baseLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  padding: '14px 18px',
  borderRadius: '16px',
  fontWeight: 800,
};

const primaryLinkStyle: React.CSSProperties = {
  ...baseLinkStyle,
  background: '#f97316',
  color: '#fff',
};

const secondaryLinkStyle: React.CSSProperties = {
  ...baseLinkStyle,
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.18)',
};

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: '16px',
  alignContent: 'center',
};

const infoCardStyle: React.CSSProperties = {
  padding: '22px',
  borderRadius: '22px',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.14)',
  backdropFilter: 'blur(8px)',
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#bfdbfe',
  marginBottom: '8px',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 800,
  lineHeight: 1.1,
  marginBottom: '10px',
};

const cardTextStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(239, 246, 255, 0.88)',
  lineHeight: 1.65,
};
