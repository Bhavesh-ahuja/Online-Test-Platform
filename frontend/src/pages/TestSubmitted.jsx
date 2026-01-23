import { useNavigate } from "react-router-dom";

export default function TestSubmitted() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>✅ Test submitted successfully</h2>
      <p>Your responses have been recorded.</p>
      <button onClick={() => navigate("/dashboard")}>
        Back to Dashboard
      </button>
    </div>
  );
}
