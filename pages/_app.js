import "@/styles/globals.css";
import Aurora from '../components/Aurora';

export default function App({ Component, pageProps }) {
  return (
    <>
      <div className="aurora-bg">
        <Aurora
          colorStops={['#7cff67', '#B19EEF', '#ff2986']}
          blend={0.5}
          amplitude={1.0}
          speed={0.3}
        />
      </div>
      <div className="app-content">
        <Component {...pageProps} />
      </div>
    </>
  );
}
