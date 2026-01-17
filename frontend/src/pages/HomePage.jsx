import React from 'react';
import Navbar from "../components/Navbar"; 
import Hero from "../components/Home/Hero";
import About from "../components/Home/About";
import Features from "../components/Home/Features";
import Story from "../components/Home/Story";
import Contact from "../components/Home/Contact";
import Footer from "../components/Home/Footer";

function HomePage() {
  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden">
      <Hero />
      <About />
      <Features />
      <Story />
      <Contact />
      <Footer />
    </main>
  );
}

export default HomePage;