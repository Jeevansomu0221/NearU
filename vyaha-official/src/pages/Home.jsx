import { Link } from 'react-router-dom';
import { vyahaLogos } from '../assets/logos';

function Home() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content animate-rise">
          <img className="hero-logo-image" src={vyahaLogos.hero} alt="Vyaha" />
          <h1 className="hero-title">
            Your Hyperlocal Food Delivery App
          </h1>
          <p className="hero-subtitle">
            Enjoy your favorite local dishes at genuine menu prices<br />
            with the Vyaha app
          </p>
          <div className="hero-download-buttons">
            <Link to="/apps" className="store-badge">
              <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Vyaha Play Store release information" />
            </Link>
          </div>
          <a href="mailto:support@vyaha.com" className="hero-email-link">support@vyaha.com &rarr;</a>
        </div>
      </section>

      <main className="main-content">
        <section className="better-food-section">
          <h2 className="section-heading">Hyperlocal delivery,<br />genuine prices</h2>
          <p className="section-desc">We connect you with the best local flavors without hidden markups.<br />Experience true community dining, delivered.</p>

          <div className="stats-container">
            <div className="stat-box animate-float">
              <h3>100%</h3>
              <p>Genuine Prices</p>
            </div>
            <div className="stat-box animate-float delay-1">
              <h3>Fast</h3>
              <p>Hyperlocal Delivery</p>
            </div>
            <div className="stat-box animate-float delay-2">
              <h3>Local</h3>
              <p>Community First</p>
            </div>
          </div>
        </section>

        <section className="features-section">
          <h2 className="section-heading">What's waiting for you<br />on the app?</h2>
          <p className="section-desc">Order, track, pay, and support local restaurants from one simple app.</p>
          <div className="features-mockup-container">
            <div className="phone-mockup-outline">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <img src={vyahaLogos.hero} alt="Vyaha app preview" />
                <div className="phone-chip">Live order tracking</div>
                <div className="phone-row"></div>
                <div className="phone-row short"></div>
              </div>
            </div>
          </div>
        </section>

        <section className="value-section">
          <div className="value-content">
            <p className="value-kicker">We value your money</p>
            <h2>Fair prices. Local restaurants. No unnecessary surprises.</h2>
            <p>Vyaha is built for everyday ordering: genuine menu prices, clear delivery fees, and a local-first model that helps customers and nearby businesses win together.</p>
            <div className="value-points">
              <div>
                <span>01</span>
                <h3>Transparent totals</h3>
                <p>Know what you are paying before confirming an order.</p>
              </div>
              <div>
                <span>02</span>
                <h3>Genuine menu prices</h3>
                <p>Discover local food without inflated listing experiences.</p>
              </div>
              <div>
                <span>03</span>
                <h3>Built for neighborhoods</h3>
                <p>Shorter local routes can mean faster delivery and better reliability.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="eternal-section">
          <p className="ecosystem-kicker">One local network</p>
          <h2 className="eternal-logo">Built for every side of the order</h2>
          <p className="eternal-desc">Customers, restaurants, and riders get their own focused tools, connected by one Vyaha platform.</p>

          <div className="apps-grid">
            <div className="app-card vyaha-card">
              <img className="app-icon-image" src={vyahaLogos.customer} alt="Vyaha customer app" />
              <span className="app-label">For customers</span>
              <h3>Discover nearby food without the price confusion.</h3>
              <p>Browse local restaurants, review clear totals, place orders, and track delivery from one simple app.</p>
              <Link to="/apps">Explore Customer App <span>&rarr;</span></Link>
            </div>
            <div className="app-card partner-card">
              <img className="app-icon-image" src={vyahaLogos.partner} alt="Vyaha partner app" />
              <span className="app-label">For restaurants</span>
              <h3>Run orders, menus, and growth from a cleaner workspace.</h3>
              <p>Accept orders, keep menus current, manage verification, and serve your neighborhood with fewer moving parts.</p>
              <Link to="/restaurants">Partner With Vyaha <span>&rarr;</span></Link>
            </div>
            <div className="app-card delivery-card">
              <img className="app-icon-image" src={vyahaLogos.delivery} alt="Vyaha delivery app" />
              <span className="app-label">For delivery partners</span>
              <h3>Accept local jobs and keep earnings easy to follow.</h3>
              <p>Go available, view nearby orders, update delivery status, and track work with a delivery-first app.</p>
              <Link to="/delivery">Start Delivering <span>&rarr;</span></Link>
            </div>
          </div>
        </section>

        <section className="download-section">
          <div className="download-box">
            <div className="download-text">
              <h2>Vyaha Customer is preparing for Play Store release</h2>
              <p>Official store links will be published here after review approval. For early access or support, contact the Vyaha team directly.</p>
              <div className="hero-download-buttons">
                <Link to="/apps" className="store-badge">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Vyaha Play Store release information" />
                </Link>
                <a href="mailto:support@vyaha.com" className="launch-link">Contact support</a>
              </div>
            </div>
            <div className="launch-card" aria-label="Vyaha app launch status">
              <span className="launch-status">Release status</span>
              <strong>Android app under review</strong>
              <p>Use only links from vyaha.com or official app stores.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default Home;
