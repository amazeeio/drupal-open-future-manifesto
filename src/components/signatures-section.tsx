"use client";

import { useState } from "react";

import { seedSignatories } from "@/lib/manifesto";
import type { SignatureRecord } from "@/lib/signature-schema";

import { SignatureForm } from "./signature-form";

type SignaturesSectionProps = {
  initialSignatures: SignatureRecord[];
};

export function SignaturesSection({ initialSignatures }: SignaturesSectionProps) {
  const [signatures, setSignatures] = useState(initialSignatures);
  const [signatureCount, setSignatureCount] = useState(seedSignatories.length + initialSignatures.length);
  const [freshSignatureId, setFreshSignatureId] = useState<string | null>(null);
  const [hasSigned, setHasSigned] = useState(false);

  function handleSigned(payload: { signature: SignatureRecord; signatureCount: number }) {
    setSignatureCount(seedSignatories.length + payload.signatureCount);
    setSignatures((currentSignatures) => [payload.signature, ...currentSignatures]);
    setFreshSignatureId(payload.signature.id);
    setHasSigned(true);
  }

  const visibleSignatories = [
    ...signatures.map((signature) => ({
      id: signature.id,
      name: signature.name,
      title: signature.role,
      company: signature.company,
      isFresh: signature.id === freshSignatureId
    })),
    ...seedSignatories.map((signature, index) => ({
      id: `seed-${index}`,
      name: signature.name,
      title: signature.title,
      company: signature.company,
      isFresh: false
    }))
  ];

  return (
    <>
      <section className="sign" id="sign">
        <div className="wrap">
          <h2>
            We are not waiting for permission.
            <br />
            We are signing for it.
          </h2>
          <p className="kick">Sign with us — then go build.</p>

          {hasSigned ? <p className="thanks show">Your name stands with ours. Now go build. ✦</p> : <SignatureForm onSigned={handleSigned} />}

          <p className="count">{signatureCount.toLocaleString()} signatories and counting</p>
        </div>
      </section>

      <section className="signatories" id="signatories">
        <div className="wrap-wide">
          <div className="head">
            <span className="eyebrow">The undersigned</span>
            <h2>Signatories</h2>
            <p className="sub">Leaders building the open future, side by side.</p>
          </div>

          <div className="sig-grid" id="sigGrid" aria-live="polite">
            {visibleSignatories.map((signature) => (
              <div className={`sig${signature.isFresh ? " fresh you" : ""}`} key={signature.id}>
                <div className="nm">{signature.name}</div>
                <div className="rl">
                  {signature.title} · <b>{signature.company}</b>
                </div>
              </div>
            ))}
          </div>

          <p className="sig-more" id="sigMore"></p>
        </div>
      </section>
    </>
  );
}