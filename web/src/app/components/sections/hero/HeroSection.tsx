"use client";
import React, { useMemo, useState, useEffect } from "react";

export function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselItems = useMemo(
    () => [
      {
        title: "From Tribal Knowledge to System Intelligence",
        description:
          "For engineering leaders struggling with incomplete system visibility, Swift delivers strategic insights by analyzing your static codebase — not runtime noise. Unlike traditional monitoring tools, Swift uncovers product logic gaps, architectural drift, and deployment bottlenecks you can't see today. No IDEs, no code changes — just the clarity you need to lead confidently.",
      },
      {
        title: "Transform Blind Spots Into Business Advantage",
        description:
          "For CTOs and Heads of Engineering frustrated with firefighting incidents and unpredictable systems, Swift acts as your executive intelligence layer — revealing where tech debt, flow gaps, and scaling risks are growing. Unlike Copilot or Datadog, Swift speaks in system-wide patterns, not micro-level code snippets. We help you move from reactive management to strategic modernization.",
      },
      {
        title: "The Missing Map for Your Engineering Systems",
        description:
          "For leaders scaling complex SaaS platforms, Swift maps out your codebase's evolution — highlighting bottlenecks, loopholes, and architectural drift before they cost you. Unlike legacy static analyzers, Swift contextualizes your code as living product flows, aligned to your business needs. Get the clarity to prioritize, invest, and scale — without blind bets.",
      },
    ],
    [],
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) => (current === carouselItems.length - 1 ? 0 : current + 1));
    }, 30000);
    return () => clearInterval(interval);
  }, [carouselItems.length]);
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-2xl mx-auto">
        {/* Carousel */}
        <div className="mb-8 relative">
          {carouselItems.map((item, index) => (
            <div
              key={index}
              className={`transition-opacity duration-500 ${index === activeIndex ? "opacity-100" : "opacity-0 absolute top-0 left-0 right-0"
                }`}
            >
              <h2 className="text-2xl font-bold mb-4">{item.title}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm md:text-base">{item.description}</p>
            </div>
          ))}
          {/* Carousel indicators */}
          <div className="flex justify-center mt-6 space-x-2">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${index === activeIndex ? "bg-black dark:bg-white" : "bg-gray-300 dark:bg-gray-700"
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
