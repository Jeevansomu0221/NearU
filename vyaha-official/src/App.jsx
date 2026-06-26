import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';

import Home from './pages/Home';
import Footer from './components/Footer';
import SiteNav from './components/SiteNav';

import LegalPage from './pages/LegalPage';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <SiteNav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/policies" element={<LegalPage pageType="policies" />} />
          <Route path="/about" element={<LegalPage pageType="about" />} />
          <Route path="/blog" element={<LegalPage pageType="blog" />} />
          <Route path="/partner" element={<LegalPage pageType="partner" />} />
          <Route path="/fraud" element={<LegalPage pageType="fraud" />} />
          <Route path="/support" element={<LegalPage pageType="support" />} />
          <Route path="/privacy" element={<LegalPage pageType="privacy" />} />
          <Route path="/security" element={<LegalPage pageType="security" />} />
          <Route path="/terms" element={<LegalPage pageType="terms" />} />
          <Route path="/refunds" element={<LegalPage pageType="refunds" />} />
          <Route path="/community-guidelines" element={<LegalPage pageType="community" />} />
          <Route path="/partner-policy" element={<LegalPage pageType="partnerPolicy" />} />
          <Route path="/delivery-policy" element={<LegalPage pageType="deliveryPolicy" />} />
          <Route path="/cookie-policy" element={<LegalPage pageType="cookie" />} />
          <Route path="/acceptable-use" element={<LegalPage pageType="acceptableUse" />} />
          <Route path="/payment-terms" element={<LegalPage pageType="paymentTerms" />} />
          <Route path="/kyc-verification" element={<LegalPage pageType="kycVerification" />} />
          <Route path="/marketing-consent" element={<LegalPage pageType="marketingConsent" />} />
          <Route path="/data-retention" element={<LegalPage pageType="dataRetention" />} />
          <Route path="/delete-account" element={<LegalPage pageType="deleteAccount" />} />
          <Route path="/restaurants" element={<LegalPage pageType="restaurants" />} />
          <Route path="/apps" element={<LegalPage pageType="apps" />} />
          <Route path="/consulting" element={<LegalPage pageType="consulting" />} />
          <Route path="/delivery" element={<LegalPage pageType="delivery" />} />
          <Route path="/license" element={<LegalPage pageType="license" />} />
          <Route path="/api-policy" element={<LegalPage pageType="apiPolicy" />} />
          <Route path="/corporate-social-responsibility" element={<LegalPage pageType="csr" />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
