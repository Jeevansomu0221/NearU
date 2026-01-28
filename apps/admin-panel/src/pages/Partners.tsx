// apps/admin-panel/src/pages/Partners.tsx
import React, { useState, useEffect } from "react";
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
  address: string;
  category: string;
  status: string;
  createdAt: string;
  documents?: any;
}

const Partners: React.FC = () => {
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

  const loadPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Loading partners...");
      
      const [pendingRes, allRes] = await Promise.all([
        getPendingPartners(),
        getAllPartners()
      ]);
      
      console.log("Pending partners response:", pendingRes);
      console.log("All partners response:", allRes);
      
      setPendingPartners(pendingRes.data?.data || []);
      setAllPartners(allRes.data?.data || []);
      
    } catch (error: any) {
      console.error("Failed to load partners:", error);
      setError(`API Error: ${error.message}`);
      
      if (error.response) {
        console.error("Error response:", error.response);
        console.error("Error status:", error.response.status);
        console.error("Error data:", error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const handleApprove = async (partnerId: string) => {
    if (!window.confirm("Approve this partner?")) return;
    
    try {
      await updatePartnerStatus(partnerId, "APPROVED");
      alert("Partner approved successfully");
      loadPartners(); // Reload the list
    } catch (error) {
      alert("Failed to approve partner");
      console.error(error);
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
    } catch (error) {
      alert("Failed to reject partner");
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-500";
      case "APPROVED": return "bg-green-500";
      case "REJECTED": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  // Test API directly
  const testApi = async () => {
    try {
      const response = await fetch('http://10.3.128.220:5000/api/partners/admin/pending');
      const data = await response.json();
      console.log('Direct fetch test:', data);
      alert(`Test: ${response.status}\nData: ${JSON.stringify(data, null, 2)}`);
    } catch (err: any) {
      console.error('Direct fetch error:', err);
      alert(`Direct fetch failed: ${err.message}`);
    }
  };

  const partnersToShow = activeTab === "pending" ? pendingPartners : allPartners;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Partner Management</h1>
      
      {/* Debug button */}
      <button 
        onClick={testApi}
        className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        Test API Connection
      </button>
      
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
        <div className="text-center py-8">Loading partners...</div>
      ) : partnersToShow.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No {activeTab === "pending" ? "pending" : ""} partners found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border text-left">Owner</th>
                <th className="py-2 px-4 border text-left">Restaurant</th>
                <th className="py-2 px-4 border text-left">Phone</th>
                <th className="py-2 px-4 border text-left">Category</th>
                <th className="py-2 px-4 border text-left">Status</th>
                <th className="py-2 px-4 border text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partnersToShow.map((partner) => (
                <tr key={partner._id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">{partner.ownerName}</td>
                  <td className="py-2 px-4 border">{partner.restaurantName}</td>
                  <td className="py-2 px-4 border">{partner.phone}</td>
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
                      <button className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">
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
              placeholder="Enter rejection reason..."
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
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Partners;