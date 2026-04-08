export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '2rem',
      backgroundColor: '#1f1f1f',
    }}>
      <h1 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
        🔒 This app runs inside Sitecore
      </h1>
      <p style={{ color: '#a7a7a7', maxWidth: '400px', lineHeight: '1.6' }}>
        You can't open this directly in the browser. <br/> This app is a Sitecore Marketplace extension -
        it only works when loaded through the Sitecore XM Cloud environment via its configured extension points.
      </p>
      <p style={{ color: '#747474', fontSize: '0.8rem', marginTop: '1rem' }}>
        If you're a developer, run "<code>npm run dev</code>" and register the app in App Studio.
      </p>
    </main>
  );
}