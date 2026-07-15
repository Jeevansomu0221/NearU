import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { vyahaLogos } from '../assets/logos';
import { effectiveDate } from '../content/legalConfig';
import { pageData } from '../content/policyPages';
import PolicySidebar, { PolicyMobileNav } from '../components/PolicySidebar';
import './LegalPage.css';

function LegalPage({ pageType }) {
  const data = pageData[pageType] || {
    title: 'Page Not Found',
    content: <p>The content you are looking for does not exist.</p>,
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pageType]);

  return (
    <div className="legal-page-container">
      <div className="legal-brand-row">
        <Link className="legal-brand" to="/">
          <img src={vyahaLogos.brand} alt="Vyaha" />
          <span>Vyaha</span>
        </Link>
      </div>

      <div className="legal-page-layout">
        <PolicySidebar activePageType={pageType} />

        <div className="legal-page-main">
          <PolicyMobileNav activePageType={pageType} />

          <div className="legal-header">
            <Link className="policy-back-link" to="/policies">Guidelines and Policies</Link>
            <h1>{data.title}</h1>
            <p>Last updated: {effectiveDate}</p>
          </div>

          <div className="legal-content">
            {data.content}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LegalPage;
