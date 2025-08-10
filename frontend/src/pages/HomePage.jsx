import { Link } from "react-router-dom";
import "./home.css";

export default function HomePage() {
  return (
    <div className="home-page">
      <main id="main" className="container">
        <section className="hero">
          <div className="hero-inner">
            <h1 className="hero-title">
              {"You're not cooked,"}
              <br className="hide-sm" />
              <span className="nowrap">{"You're just not prepared"}</span>
            </h1>

            <p className="hero-subtitle">
              Prepping for technical coding interviews can feel hard and isolating... but does it have to be?
            </p>

            <div className="cta">
              <Link to="/code" className="btn" aria-label="Simulate Coding Interview">
                <span>Simulate Coding Interview</span>
                <svg className="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M5 12h12m0 0-5-5m5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>
        </section>

        <section className="info">
          <div className="info-inner">
            <h2>What is Interviewly?</h2>
            <p>
              A more realistic way to simulate technical coding interviews. We add an AI assistant to not only lead the
              interview, but also serve as a resource for clarifying questions.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
