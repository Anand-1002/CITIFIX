import { Helmet } from "react-helmet";
import Beams from "../components/Background";
import Navbar from "../components/Navbar";
import Footer from "../components/ui/Footer";
import CTA from "../components/Cta";
import Features from "../components/Features";
import Hero from "../components/Hero";

const LandingPage = () => {
  return (
    <>
      <Helmet>
        <title>CITIFIX - Transform Your City, One Report at a Time</title>
        <meta
          name="description"
          content="AI-powered civic engagement platform. Report issues, earn rewards, and create lasting change in your community."
        />
      </Helmet>
      <div className="fixed inset-0 z-0">
        <Beams
          beamWidth={2}
          beamHeight={15}
          beamNumber={12}
          lightColor="#ffffff"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={0}
        />
      </div>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-hidden">
        <Navbar />
        <Hero />
        <Features />
        <CTA />
        <Footer />
      </div>
    </>
  );
};
export default LandingPage;