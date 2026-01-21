import clsx from "clsx";
import gsap from "gsap";
import { useWindowScroll } from "react-use";
import { useEffect, useRef, useState } from "react";
import { TiLocationArrow } from "react-icons/ti";
import { Link, useNavigate } from "react-router-dom"; // Added for routing

import Button from "./Home/Button";

const Navbar = () => {
  // ----------------------------------------------------------------
  // 1. TEAM'S LOGIC (Auth & Routing)
  // ----------------------------------------------------------------
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // ----------------------------------------------------------------
  // 2. YOUR LOGIC (Animations, Audio, Scroll)
  // ----------------------------------------------------------------
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isIndicatorActive, setIsIndicatorActive] = useState(false);
  const audioElementRef = useRef(null);
  const navContainerRef = useRef(null);

  const { y: currentScrollY } = useWindowScroll();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const toggleAudioIndicator = () => {
    setIsAudioPlaying((prev) => !prev);
    setIsIndicatorActive((prev) => !prev);
  };

  useEffect(() => {
    if (isAudioPlaying) {
      audioElementRef.current.play();
    } else {
      audioElementRef.current.pause();
    }
  }, [isAudioPlaying]);

  useEffect(() => {
    if (currentScrollY === 0) {
      setIsNavVisible(true);
      navContainerRef.current.classList.remove("floating-nav");
    } else if (currentScrollY > lastScrollY) {
      setIsNavVisible(false);
      navContainerRef.current.classList.add("floating-nav");
    } else if (currentScrollY < lastScrollY) {
      setIsNavVisible(true);
      navContainerRef.current.classList.add("floating-nav");
    }
    setLastScrollY(currentScrollY);
  }, [currentScrollY, lastScrollY]);

  useEffect(() => {
    gsap.to(navContainerRef.current, {
      y: isNavVisible ? 0 : -100,
      opacity: isNavVisible ? 1 : 0,
      duration: 0.2,
    });
  }, [isNavVisible]);

  // ----------------------------------------------------------------
  // 3. THE MERGED UI
  // ----------------------------------------------------------------
  return (
    <div
      ref={navContainerRef}
      className="fixed inset-x-0 top-4 z-50 h-16 border-none transition-all duration-700 sm:inset-x-6"
    >
      <header className="absolute top-1/2 w-full -translate-y-1/2">
        <nav className="flex size-full items-center justify-between p-4">
          
          {/* --- LEFT SIDE: LOGO --- */}
          <div className="flex items-center gap-7">
            <Link to="/">
              <img src="/img/logo.png" alt="logo" className="w-10" />
            </Link>

            {/* Optional: Kept your decorative Product button */}
            {/* <Button
              id="product-button"
              title="Products"
              rightIcon={<TiLocationArrow />}
              containerClass="bg-blue-50 md:flex hidden items-center justify-center gap-1"
            /> */}
          </div>

          {/* --- RIGHT SIDE: LINKS & AUDIO --- */}
          <div className="flex h-full items-center">
            
            {/* 1. DYNAMIC NAV LINKS (Team's Logic + Your Style) */}
            <div className="hidden md:block">
              {/* Common Link */}
              <Link to="/" className="nav-hover-btn">
                Home
              </Link>

              {/* Conditional Links based on Login Status */}
              {token ? (
                <>
                  <Link to="/dashboard" className="nav-hover-btn">
                    Dashboard
                  </Link>
                  
                  <Link to="/my-results" className="nav-hover-btn">
                    My Results
                  </Link>

                  {/* Admin Only Link */}
                  {user.role === "ADMIN" && (
                    <Link to="/create-test" className="nav-hover-btn text-green-400">
                      + Create Test
                    </Link>
                  )}

                  <Link to="/profile" className="nav-hover-btn">
                    Profile
                  </Link>

                  {/* Logout Button (Styled like a link) */}
                  <button onClick={handleLogout} className="nav-hover-btn">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-hover-btn">
                    Login
                  </Link>
                  <Link to="/register" className="nav-hover-btn">
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* 2. AUDIO BUTTON (Your Original Feature) */}
            <button
              onClick={toggleAudioIndicator}
              className="ml-10 flex items-center space-x-0.5"
            >
              <audio
                ref={audioElementRef}
                className="hidden"
                src="/audio/loop.mp3"
                loop
              />
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={clsx("indicator-line", {
                    active: isIndicatorActive,
                  })}
                  style={{
                    animationDelay: `${bar * 0.1}s`,
                  }}
                />
              ))}
            </button>
          </div>
        </nav>
      </header>
    </div>
  );
};

export default Navbar;