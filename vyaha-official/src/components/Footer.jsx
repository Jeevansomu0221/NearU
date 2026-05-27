import { Link } from 'react-router-dom';

const socialLinks = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/vyaha_official/',
    path: 'M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 2a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Zm5.25-2.55a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z'
  },
  {
    name: 'X',
    href: 'https://x.com/vyaha_official',
    path: 'M17.53 3h3.07l-6.7 7.66L21.78 21h-6.17l-4.83-6.32L5.25 21H2.18l7.16-8.19L1.78 3h6.33l4.37 5.78L17.53 3Zm-1.08 16.18h1.7L7.18 4.73H5.35l11.1 14.45Z'
  },
  {
    name: 'YouTube',
    href: 'https://youtube.com/@vyaha_official?si=WHP9cnu8xtHpGkL_',
    path: 'M21.58 7.19a2.8 2.8 0 0 0-1.97-1.98C17.87 4.75 12 4.75 12 4.75s-5.87 0-7.61.46a2.8 2.8 0 0 0-1.97 1.98A29.2 29.2 0 0 0 2 12a29.2 29.2 0 0 0 .42 4.81 2.8 2.8 0 0 0 1.97 1.98c1.74.46 7.61.46 7.61.46s5.87 0 7.61-.46a2.8 2.8 0 0 0 1.97-1.98A29.2 29.2 0 0 0 22 12a29.2 29.2 0 0 0-.42-4.81ZM10 15.3V8.7l5.75 3.3L10 15.3Z'
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61589375487793',
    path: 'M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.25c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z'
  }
];

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <Link className="footer-logo" to="/">
            <img src="/vyaha-logo.png" alt="Vyaha" />
            <span>vyaha</span>
          </Link>
        </div>

        <div className="footer-links-grid">
          <div className="footer-column">
            <h4>About</h4>
            <ul>
              <li><Link to="/about">Who We Are</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/partner">Work With Us</Link></li>
              <li><Link to="/about">Investor Relations</Link></li>
              <li><Link to="/fraud">Report Fraud</Link></li>
              <li><Link to="/support">Contact Us</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Learn More</h4>
            <ul>
              <li><Link to="/policies">Guidelines and Policies</Link></li>
              <li><Link to="/privacy">Privacy</Link></li>
              <li><Link to="/security">Security</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/refunds">Cancellation and Refunds</Link></li>
              <li><Link to="/community-guidelines">Community Guidelines</Link></li>
              <li><Link to="/cookie-policy">Cookie Policy</Link></li>
              <li><Link to="/delete-account">Delete Account</Link></li>
              <li><Link to="/support">Help and Support</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>For Partners</h4>
            <ul>
              <li><Link to="/restaurants">Partner With Us</Link></li>
              <li><Link to="/partner-policy">Restaurant Partner Policy</Link></li>
              <li><Link to="/delivery">Become a Delivery Partner</Link></li>
              <li><Link to="/delivery-policy">Delivery Partner Policy</Link></li>
              <li><Link to="/apps">Apps For You</Link></li>
              <li><Link to="/consulting">Restaurant Consulting</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Social Links</h4>
            <div className="social-links">
              {socialLinks.map((item) => (
                <a key={item.name} href={item.href} className="social-icon" aria-label={item.name} target="_blank" rel="noreferrer">
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d={item.path} />
                  </svg>
                </a>
              ))}
            </div>
            <div className="footer-app-links" style={{ marginTop: '20px' }}>
              <Link to="/apps" className="store-badge-small" style={{ display: 'block', marginBottom: '10px' }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App access page" style={{ width: '120px' }} />
              </Link>
              <Link to="/apps" className="store-badge-small" style={{ display: 'block' }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="App access page" style={{ width: '120px' }} />
              </Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>By continuing past this page, you agree to our Terms of Service, Cookie Policy, Privacy Policy, and Content Policies. All trademarks are properties of their respective owners. © 2026 Vyaha. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
