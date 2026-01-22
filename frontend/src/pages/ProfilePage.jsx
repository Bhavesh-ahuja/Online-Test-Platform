import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../utils/authFetch";

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      try {
        const response = await authFetch("/api/users/me");

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }


        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        My Profile
      </h1>

      
<div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 space-y-4">
  <div>
    <p className="text-sm text-gray-500">Full Name</p>
    <p className="text-lg font-medium text-gray-800">
      {user.fullName || "Not Set"}
    </p>
  </div>

  <div>
    <p className="text-sm text-gray-500">PRN / Badge Number</p>
    <p className="text-lg font-medium text-gray-800">
      {user.prn || "N/A"} / {user.badgeNumber || "N/A"}
    </p>
  </div>

  <div>
    <p className="text-sm text-gray-500">Year</p>
    <p className="text-lg font-medium text-gray-800">
      {user.year || "N/A"}
    </p>
  </div>

  <div className="pt-2 border-t">
    <p className="text-sm text-gray-500">Email (Authentication)</p>
    <p className="text-md text-gray-600">
      {user.email}
    </p>
  </div>

  {/* Keep the Admin Badge and Logout button as they were */}
</div>

    
     
        <div>
          <p className="text-sm text-gray-500">Role</p>
          <p className="text-lg font-medium text-gray-800">
            {user.role}
          </p>
        </div>

        {user.role === "ADMIN" && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
            <p className="font-semibold text-yellow-800">
              Administrator
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              You can create tests and also attempt tests.
            </p>
          </div>
        )}

        <div className="pt-6 border-t mt-6">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      
    </div>  
  );
}

export default ProfilePage;
