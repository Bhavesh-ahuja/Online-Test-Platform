import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/all";

import AnimatedTitle from "./AnimatedTitle";

gsap.registerPlugin(ScrollTrigger);

const About = () => {
  useGSAP(() => {
    const clipAnimation = gsap.timeline({
      scrollTrigger: {
        trigger: "#clip",
        start: "center center",
        end: "+=800 center",
        scrub: 0.5,
        pin: true,
        pinSpacing: true,
      },
    });

    clipAnimation.to(".mask-clip-path", {
      width: "100vw",
      height: "100vh",
      borderRadius: 0,
    });
  });

  return (
    <div id="about" className="min-h-screen w-screen">
      <div className="relative mb-8 mt-36 flex flex-col items-center gap-5">
        <p className="font-general text-sm uppercase md:text-[10px]">
          Welcome
        </p>

        <AnimatedTitle
          title="NO<b>T</b> JUS<b>T</b> A F<b>E</b>S<b>T</b>. <br /> A C<b>A</b>REER L<b>A</b>UNCHP<b>A</b>D."
          containerClass="mt-5 !text-black text-center"
        />

        <div className="about-subtext">
          <p>Developing skills that open doors</p>
          <p className="text-gray-500">
            Verbafest unites students from every year and stream into a single competitive space,
             blending communication, aptitude, and leadership challenges to build real placement-ready 
             skills for the corporate world.
          </p>
        </div>
      </div>

      <div className="h-dvh w-screen" id="clip">
        <div className="mask-clip-path about-image">
          <img
            src="img/about.jpeg"
            alt="Background"
            className="absolute left-0 top-0 size-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default About;
