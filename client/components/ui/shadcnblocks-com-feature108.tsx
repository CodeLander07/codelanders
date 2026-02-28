"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { BookOpen, FileText, Route, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TabContent {
  badge: string;
  title: string;
  description: string;
  buttonText: string;
  imageSrc: string;
  imageAlt: string;
}

interface Tab {
  value: string;
  icon: React.ReactNode;
  label: string;
  content: TabContent;
}

interface Feature108Props {
  badge?: string;
  heading?: string;
  description?: string;
  tabs?: Tab[];
  className?: string;
  id?: string;
}

const Feature108 = ({
  badge = "TaxMate Features",
  heading = "Everything You Need for Stress-Free Tax Filing",
  description = "Smart tools designed to simplify your tax journey from documents to submission.",
  tabs = [
    {
      value: "tab-1",
      icon: <FileText className="h-auto w-4 shrink-0" />,
      label: "Document Extraction",
      content: {
        badge: "Smart OCR",
        title: "Document-based tax information extraction.",
        description:
          "Upload your W-2s, 1099s, receipts, and other tax documents. Our AI extracts key figures automatically—income, deductions, credits—so you don't have to type everything by hand.",
        buttonText: "Try It Now",
        imageSrc:
          "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80",
        imageAlt: "Document scanning and extraction",
      },
    },
    {
      value: "tab-2",
      icon: <Route className="h-auto w-4 shrink-0" />,
      label: "Guided Workflow",
      content: {
        badge: "Step by Step",
        title: "Guided tax filing workflow.",
        description:
          "Walk through your return with a clear, structured process. Answer simple questions, fill in sections in the right order, and never miss a step. We guide you from start to finish.",
        buttonText: "Start Filing",
        imageSrc:
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
        imageAlt: "Guided workflow process",
      },
    },
    {
      value: "tab-3",
      icon: <Target className="h-auto w-4 shrink-0" />,
      label: "Scheme Eligibility",
      content: {
        badge: "Maximize Savings",
        title: "Scheme eligibility recommendations.",
        description:
          "Discover tax schemes, credits, and deductions you qualify for. We analyze your situation and recommend opportunities to reduce your tax bill or increase your refund.",
        buttonText: "Check Eligibility",
        imageSrc:
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
        imageAlt: "Tax savings and eligibility",
      },
    },
    {
      value: "tab-4",
      icon: <BookOpen className="h-auto w-4 shrink-0" />,
      label: "Simplified Explanations",
      content: {
        badge: "Plain Language",
        title: "Simplified tax explanations.",
        description:
          "Complex tax terms and forms explained in plain language. Understand what each section means, why it matters, and how it affects your return—no jargon required.",
        buttonText: "Learn More",
        imageSrc:
          "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
        imageAlt: "Tax education and explanations",
      },
    },
  ],
  className,
  id = "features",
}: Feature108Props) => {
  return (
    <section
      id={id}
      role="region"
      aria-labelledby="feature-heading"
      className={cn(
        "relative bg-black text-white py-20 md:py-28 lg:py-32",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <header className="mx-auto max-w-3xl text-center">
          <h2
            id="feature-heading"
            className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl"
          >
            {heading}
          </h2>
          <p className="mt-5 text-base leading-7 text-white/60 sm:text-lg">
            {description}
          </p>
        </header>

        {/* Tabs */}
        <Tabs defaultValue={tabs[0].value} className="mt-14 lg:mt-16">
          <TabsList className="mx-auto mb-8 sm:mb-10 flex w-full max-w-3xl flex-wrap justify-center gap-1.5 sm:gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-2 backdrop-blur-sm sm:flex-nowrap">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 sm:px-5 sm:py-3 sm:text-sm",
                  "text-white/60 hover:bg-white/10 hover:text-white",
                  "data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-lg",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab content panels */}
          <div className="mx-auto h-96 w-1/2 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-2xl sm:p-6 md:p-8 lg:p-14">
            {tabs.map((tab) => (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="mt-0 grid gap-8 sm:gap-10 lg:grid-cols-2 lg:items-center lg:gap-12 data-[state=inactive]:hidden"
              >
                <div className="flex flex-col justify-center space-y-4 sm:space-y-5 order-2 lg:order-1">
                  <Badge
                    variant="outline"
                    className="w-1/3 border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white/80"
                  >
                    {tab.content.badge}
                  </Badge>
                  <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl lg:text-4xl xl:text-5xl">
                    {tab.content.title}
                  </h3>
                  <p className="max-w-xl text-sm leading-6 text-white/60 sm:text-base lg:text-lg">
                    {tab.content.description}
                  </p>
                  <Button
                    className="mt-1 w-1/3 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-white/95 sm:px-5 sm:py-3 sm:text-base">
                    {tab.content.buttonText}
                  </Button>
                </div>

              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </section>
  );
};

export { Feature108 };
