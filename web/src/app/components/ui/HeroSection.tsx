"use client";

import React, { useMemo, useState, useEffect } from "react";

export function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const carouselItems = useMemo(
    () => [
      {
        title: "Analyze Your Codebase",
        description:
          "Uncover hidden bottlenecks, quantify technical debt, and unlock faster, safer deployments.",
      },
      {
        title: "Enterprise Intelligence Hub",
        description:
          "Swift transforms your technology assets into strategic business advantages. Make faster executive decisions with AI-powered insights.",
      },
      {
        title: "Accelerate Development",
        description:
          "Identify technical vulnerabilities and optimize your engineering resources for maximum efficiency.",
      },
    ],
    []
  );

  // Auto-rotate carousel every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) =>
        current === carouselItems.length - 1 ? 0 : current + 1
      );
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselItems.length]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md mx-auto">
        {/* Carousel */}
        <div className="mb-8 relative">
          {carouselItems.map((item, index) => (
            <div
              key={index}
              className={`transition-opacity duration-500 ${
                index === activeIndex
                  ? "opacity-100"
                  : "opacity-0 absolute top-0 left-0 right-0"
              }`}
            >
              <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {item.description}
              </p>
            </div>
          ))}

          {/* Carousel indicators */}
          <div className="flex justify-center mt-4 space-x-2">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  index === activeIndex
                    ? "bg-black dark:bg-white"
                    : "bg-gray-300 dark:bg-gray-700"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
