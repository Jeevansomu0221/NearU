// apps/admin-panel/src/pages/Partners.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPendingPartners,
  getAllPartners,
  updatePartnerStatus
} from "../api/admin.api";

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
      case "PENDING": return "bg-yellow-500";
      case "APPROVED": return "bg-green-500";
      case "REJECTED": return "bg-red-500";
      case "SUSPENDED": return "bg-orange-500";
      default: return "bg-gray-500";
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Partner Management</h1>
      
      {/* Debug buttons */}
      <div className="flex space-x-2 mb-4">
        <button 
          onClick={testApi}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Test API Connection
        </button>
        
        <button 
          onClick={testAuth}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Check Auth Status
        </button>
        
        <button 
          onClick={() => {
            localStorage.clear();
            alert("LocalStorage cleared. Redirecting to login...");
            navigate("/login");
          }}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear & Logout
        </button>
      </div>
      
      {/* Authentication Status */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="flex items-center justify-between">
          <div>
            <strong>Authentication Status:</strong>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${checkAuth() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {checkAuth() ? 'Authenticated (Admin)' : 'Not Authenticated'}
            </span>
          </div>
          <button
            onClick={loadPartners}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>
      
      {/* Show error if exists */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium ${activeTab === "pending" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending ({pendingPartners.length})
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === "all" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"}`}
          onClick={() => setActiveTab("all")}
        >
          All Partners ({allPartners.length})
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading partners...</p>
        </div>
      ) : partnersToShow.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">No {activeTab === "pending" ? "pending" : ""} partners found</p>
          <p className="text-sm mt-2">When partners register, they will appear here for approval.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border text-left">Owner</th>
                <th className="py-2 px-4 border text-left">Restaurant</th>
                <th className="py-2 px-4 border text-left">Phone</th>
                <th className="py-2 px-4 border text-left">Address</th>
                <th className="py-2 px-4 border text-left">Category</th>
                <th className="py-2 px-4 border text-left">Status</th>
                <th className="py-2 px-4 border text-left">Registered</th>
                <th className="py-2 px-4 border text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partnersToShow.map((partner) => (
                <tr key={partner._id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">{partner.ownerName}</td>
                  <td className="py-2 px-4 border font-medium">{partner.restaurantName}</td>
                  <td className="py-2 px-4 border font-mono">{partner.phone}</td>
                  <td className="py-2 px-4 border text-sm">
                    {formatAddress(partner.address)}
                  </td>
                  <td className="py-2 px-4 border">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {partner.category.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-4 border">
                    <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(partner.status)}`}>
                      {partner.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 border text-sm">
                    {new Date(partner.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4 border">
                    <div className="flex space-x-2">
                      {partner.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleApprove(partner._id)}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(partner)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => alert(`Partner ID: ${partner._id}\nFull details in console`)}
                        className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">
              Reject {rejectModal.partner?.ownerName}'s Application
            </h2>
            <p className="mb-2">Please provide a reason for rejection:</p>
            <textarea
              className="w-full border rounded p-2 mb-4"
              rows={4}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Enter rejection reason (e.g., incomplete documents, location not serviced, etc.)"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setRejectModal({ show: false, partner: null, reason: "" })}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
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