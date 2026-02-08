// apps/admin-panel/src/pages/Partners.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPendingPartners,
  getAllPartners,
  updatePartnerStatus
} from "../api/admin.api";
import "../styles/Partner.css"; // Import the CSS file

interface Partner {
  _id: string;
  ownerName: string;
  restaurantName: string;
  phone: string;
  address: any;
  category: string;
  status: string;
  createdAt: string;
  documents?: any;
}

const Partners: React.FC = () => {
  const navigate = useNavigate();
  const [pendingPartners, setPendingPartners] = useState<Partner[]>([]);
  const [allPartners, setAllPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [rejectModal, setRejectModal] = useState<{
    show: boolean;
    partner: Partner | null;
    reason: string;
  }>({
    show: false,
    partner: null,
    reason: ""
  });

  // Check authentication
  const checkAuth = (): boolean => {
    console.log("🔍 Partners.tsx - Checking authentication...");
    
    const token = localStorage.getItem('adminToken');
    const userStr = localStorage.getItem('adminUser');
    
    console.log("Token exists:", !!token);
    console.log("User exists:", !!userStr);
    
    if (!token || !userStr) {
      console.warn("❌ Not authenticated - Missing token or user");
      return false;
    }
    
    try {
      const user = JSON.parse(userStr);
      console.log("User role:", user.role);
      
      if (user.role !== "admin") {
        console.error("❌ User is not admin, role is:", user.role);
        return false;
      }
      
      // Decode token to verify
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("🔍 Token payload role:", payload.role);
          if (payload.role !== "admin") {
            console.error("❌ Token role mismatch. Token has:", payload.role);
            return false;
          }
        }
      } catch (e) {
        console.error("Failed to decode token:", e);
      }
      
      return true;
    } catch (e) {
      console.error("❌ Failed to parse user:", e);
      return false;
    }
  };

  const loadPartners = async () => {
    // Check authentication first
    if (!checkAuth()) {
      setError("Not authenticated. Please login again.");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      console.log("Loading partners...");
      
      // Load one at a time for better debugging
      console.log("Fetching pending partners...");
      const pendingRes = await getPendingPartners();
      console.log("Pending partners response:", pendingRes.data);
      
      console.log("Fetching all partners...");
      const allRes = await getAllPartners();
      console.log("All partners response:", allRes.data);
      
      setPendingPartners(pendingRes.data?.data || []);
      setAllPartners(allRes.data?.data || []);
      
    } catch (error: any) {
      console.error("Failed to load partners:", error);
      
      if (error.response) {
        console.error("Error response:", error.response);
        console.error("Error status:", error.response.status);
        console.error("Error data:", error.response.data);
        
        if (error.response.status === 401) {
          setError("Session expired. Please login again.");
          localStorage.clear();
          navigate("/login");
        } else if (error.response.status === 403) {
          setError("Access denied. You don't have admin privileges.");
          
          // Debug: Check token
          const token = localStorage.getItem('adminToken');
          if (token) {
            try {
              const tokenParts = token.split('.');
              const payload = JSON.parse(atob(tokenParts[1]));
              console.error("Current token role:", payload.role);
            } catch (e) {
              console.error("Cannot decode token:", e);
            }
          }
        } else {
          setError(`API Error: ${error.response.data?.message || error.message}`);
        }
      } else {
        setError(`Network Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check auth before loading
    console.log("🔍 Partners.tsx - Component mounted");
    
    if (!checkAuth()) {
      console.log("❌ Not authenticated, redirecting to login");
      setError("Please login to access partner management");
      setTimeout(() => navigate("/login"), 1000);
      return;
    }
    
    console.log("✅ Authenticated, loading partners...");
    loadPartners();
  }, [navigate]);

  const handleApprove = async (partnerId: string) => {
    if (!window.confirm("Approve this partner?")) return;
    
    try {
      await updatePartnerStatus(partnerId, "APPROVED");
      alert("Partner approved successfully");
      loadPartners(); // Reload the list
    } catch (error: any) {
      console.error("Approve error:", error);
      alert(`Failed to approve partner: ${error.response?.data?.message || error.message}`);
    }
  };

  const openRejectModal = (partner: Partner) => {
    setRejectModal({
      show: true,
      partner,
      reason: ""
    });
  };

  const handleReject = async () => {
    if (!rejectModal.partner) return;
    
    if (!rejectModal.reason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    try {
      await updatePartnerStatus(
        rejectModal.partner._id, 
        "REJECTED", 
        rejectModal.reason
      );
      alert("Partner rejected");
      setRejectModal({ show: false, partner: null, reason: "" });
      loadPartners(); // Reload the list
    } catch (error: any) {
      console.error("Reject error:", error);
      alert(`Failed to reject partner: ${error.response?.data?.message || error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "status-pending";
      case "APPROVED": return "status-approved";
      case "REJECTED": return "status-rejected";
      case "SUSPENDED": return "status-suspended";
      default: return "status-default";
    }
  };

  // Format address for display
  const formatAddress = (address: any) => {
    if (!address) return "No address";
    if (typeof address === "string") return address;
    
    const parts = [];
    if (address.area) parts.push(address.area);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    
    return parts.join(", ") || "Address not specified";
  };

  // Test API directly with authentication
  const testApi = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      console.log("🔍 Test API - Using token:", token ? "Yes" : "No");
      
      const headers: any = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log("🔍 Test API - Making request to /api/partners/admin/pending");
      const response = await fetch('http://10.3.128.220:5000/api/partners/admin/pending', {
        headers: headers,
        method: 'GET'
      });
      
      const data = await response.json();
      console.log('Direct fetch test result:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
        ok: response.ok
      });
      
      alert(`Test Result:\nStatus: ${response.status}\nMessage: ${data.message || "No message"}\nData: ${JSON.stringify(data.data || [], null, 2)}`);
    } catch (err: any) {
      console.error('Direct fetch error:', err);
      alert(`Direct fetch failed: ${err.message}`);
    }
  };

  // Test authentication endpoint
  const testAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const userStr = localStorage.getItem('adminUser');
      
      console.log("🔍 Auth Debug Info:");
      console.log("Token:", token);
      console.log("User:", userStr);
      
      if (token) {
        try {
          const tokenParts = token.split('.');
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("Decoded token:", payload);
          alert(`Token decoded:\nRole: ${payload.role}\nPhone: ${payload.phone}\nID: ${payload.id}`);
        } catch (e) {
          console.error("Token decode error:", e);
        }
      }
      
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          alert(`User stored:\nRole: ${user.role}\nPhone: ${user.phone}\nID: ${user.id}`);
        } catch (e) {
          console.error("User parse error:", e);
        }
      }
    } catch (err: any) {
      console.error('Auth test error:', err);
    }
  };

  const partnersToShow = activeTab === "pending" ? pendingPartners : allPartners;

  return (
    <div className="partners-container">
      <h1 className="partners-title">Partner Management</h1>
      
      {/* Debug buttons */}
      <div className="debug-buttons">
        <button 
          onClick={testApi}
          className="debug-button test-api"
        >
          Test API Connection
        </button>
        
        <button 
          onClick={testAuth}
          className="debug-button check-auth"
        >
          Check Auth Status
        </button>
        
        <button 
          onClick={() => {
            localStorage.clear();
            alert("LocalStorage cleared. Redirecting to login...");
            navigate("/login");
          }}
          className="debug-button clear-logout"
        >
          Clear & Logout
        </button>
      </div>
      
      {/* Authentication Status */}
      <div className="auth-status">
        <div className="auth-status-content">
          <div>
            <strong>Authentication Status:</strong>
            <span className={`auth-badge ${checkAuth() ? 'auth-success' : 'auth-error'}`}>
              {checkAuth() ? 'Authenticated (Admin)' : 'Not Authenticated'}
            </span>
          </div>
          <button
            onClick={loadPartners}
            className="refresh-button"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>
      
      {/* Show error if exists */}
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === "pending" ? "tab-active" : "tab-inactive"}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending ({pendingPartners.length})
        </button>
        <button
          className={`tab-button ${activeTab === "all" ? "tab-active" : "tab-inactive"}`}
          onClick={() => setActiveTab("all")}
        >
          All Partners ({allPartners.length})
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading partners...</p>
        </div>
      ) : partnersToShow.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No {activeTab === "pending" ? "pending" : ""} partners found</p>
          <p className="empty-subtitle">When partners register, they will appear here for approval.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="partners-table">
            <thead>
              <tr>
                <th className="table-header">Owner</th>
                <th className="table-header">Restaurant</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Address</th>
                <th className="table-header">Category</th>
                <th className="table-header">Status</th>
                <th className="table-header">Registered</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partnersToShow.map((partner) => (
                <tr key={partner._id} className="table-row">
                  <td className="table-cell">{partner.ownerName}</td>
                  <td className="table-cell restaurant-name">{partner.restaurantName}</td>
                  <td className="table-cell phone-number">{partner.phone}</td>
                  <td className="table-cell address">
                    {formatAddress(partner.address)}
                  </td>
                  <td className="table-cell">
                    <span className="category-badge">
                      {partner.category.toUpperCase()}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`status-badge ${getStatusColor(partner.status)}`}>
                      {partner.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    {new Date(partner.createdAt).toLocaleDateString()}
                  </td>
                  <td className="table-cell">
                    <div className="action-buttons">
                      {partner.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleApprove(partner._id)}
                            className="action-button approve-button"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(partner)}
                            className="action-button reject-button"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => alert(`Partner ID: ${partner._id}\nFull details in console`)}
                        className="action-button view-button"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModal.show && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">
              Reject {rejectModal.partner?.ownerName}'s Application
            </h2>
            <p className="modal-description">Please provide a reason for rejection:</p>
            <textarea
              className="modal-textarea"
              rows={4}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Enter rejection reason (e.g., incomplete documents, location not serviced, etc.)"
            />
            <div className="modal-buttons">
              <button
                onClick={() => setRejectModal({ show: false, partner: null, reason: "" })}
                className="modal-button cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="modal-button confirm-button"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Partners;