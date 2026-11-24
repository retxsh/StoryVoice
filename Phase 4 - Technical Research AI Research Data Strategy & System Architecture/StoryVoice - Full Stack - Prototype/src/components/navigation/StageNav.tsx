"use client";

import Link from "next/link";
import { BackButton } from "./BackButton";

interface StageNavProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  backHref: string;
  backLabel?: string;
  projectId: string;
  crumbCurrent?: string;
}

const STEPS = [
  { num: 1, label: "Capture" },
  { num: 2, label: "Transcript" },
  { num: 3, label: "Transform" },
  { num: 4, label: "Review" },
  { num: 5, label: "Accept" },
];

export function StageNav({
  currentStep,
  backHref,
  backLabel = "Back",
  projectId,
  crumbCurrent,
}: StageNavProps) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div className="stage-nav-bar">
        <BackButton href={backHref} label={backLabel} />
        <div className="crumb">
          <Link href={`/projects/${projectId}/workspace`}>Project</Link>
          {crumbCurrent && (
            <>
              <span className="crumb-separator">/</span>
              <span>{crumbCurrent}</span>
            </>
          )}
        </div>
      </div>

      <nav className="stepper" aria-label="Progress">
        {STEPS.map((step, idx) => {
          const isDone = step.num < currentStep;
          const isCurrent = step.num === currentStep;

          return (
            <div key={step.num} style={{ display: "flex", alignItems: "center" }}>
              <div
                className={`step ${isDone ? "done" : isCurrent ? "current" : ""}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                <b>{isDone ? "✓" : step.num}</b>
                <span>{step.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <i
                  className={`step-line ${step.num < currentStep ? "done" : ""}`}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
