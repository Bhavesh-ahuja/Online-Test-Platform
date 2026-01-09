import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const TestInstructions = () => {
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  const handleStartTest = () => {
    if (!accepted) return;
    navigate(`/test/${id}`);
  };

  const handleClose = () => {
    navigate("/dashboard");
  };

  return (
    /* Overlay */
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      
      {/* Modal Card */}
      <div className="bg-white w-full max-w-xl rounded-xl shadow-xl p-6 relative animate-fadeIn">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition text-xl"

          aria-label="Close"
        >
          ✕
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Test Instructions
        </h2>

        {/* Instructions */}
        <ul className="space-y-2 text-gray-700 text-sm leading-relaxed">
          <li>• The test has a fixed duration and a running timer.</li>
          <li>• Do not switch tabs or minimize the browser.</li>
          <li>• Multiple violations may terminate the test.</li>
          <li>• The test auto-submits when time ends.</li>
          <li>• Once submitted, answers cannot be changed.</li>
        </ul>

        {/* Checkbox */}
        <div className="flex items-start gap-3 mt-6">
          <input
            type="checkbox"
            id="accept"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 accent-blue-600 cursor-pointer"
          />
          <label
            htmlFor="accept"
            className="text-sm text-gray-700 cursor-pointer"
          >
            I have read and understood all the instructions and agree to follow
            the rules during the test.
          </label>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleStartTest}
            disabled={!accepted}
            className={`px-6 py-2 rounded-md font-semibold transition
              ${
                accepted
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
          >
            Start Test
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestInstructions;
