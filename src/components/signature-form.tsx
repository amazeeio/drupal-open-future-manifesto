"use client";

import { ChangeEvent, FormEvent, useState } from "react";

import type { SignatureRecord } from "@/lib/signature-schema";

type SignatureFormFields = {
  name: string;
  company: string;
  role: string;
  email: string;
};

const initialFields: SignatureFormFields = {
  name: "",
  company: "",
  role: "",
  email: ""
};

type SignatureFormProps = {
  onSigned?: (payload: { signature: SignatureRecord; signatureCount: number }) => void;
};

export function SignatureForm({ onSigned }: SignatureFormProps) {
  const [fields, setFields] = useState<SignatureFormFields>(initialFields);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFields((currentFields) => ({
      ...currentFields,
      [name]: value
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/signatures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(fields)
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: string; signature?: SignatureRecord; signatureCount?: number }
        | null;

      if (!response.ok) {
        setErrorMessage(payload?.error ?? "Unable to record your signature right now.");
        return;
      }

      setSuccessMessage(
        payload?.signatureCount
          ? `Thanks for signing. You are signer #${payload.signatureCount}.`
          : payload?.message ?? "Thanks for signing the manifesto."
      );

      if (payload?.signature && typeof payload.signatureCount === "number") {
        onSigned?.({
          signature: payload.signature,
          signatureCount: payload.signatureCount
        });
      }

      setFields(initialFields);
    } catch {
      setErrorMessage("Unable to record your signature right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form id="signForm" onSubmit={handleSubmit} noValidate>
      <div className="row2">
        <div className="field">
          <label htmlFor="sign-name">Name</label>
          <input
            autoComplete="name"
            id="sign-name"
            name="name"
            onChange={handleChange}
            placeholder="Jane Doe"
            required
            value={fields.name}
          />
        </div>

        <div className="field">
          <label htmlFor="sign-role">Title</label>
          <input
            autoComplete="organization-title"
            id="sign-role"
            name="role"
            onChange={handleChange}
            placeholder="CEO"
            required
            value={fields.role}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="sign-company">Company</label>
        <input
          autoComplete="organization"
          id="sign-company"
          name="company"
          onChange={handleChange}
          placeholder="Open Web Studio"
          required
          value={fields.company}
        />
      </div>

      <div className="field">
        <label htmlFor="sign-email">Email</label>
        <input
          autoComplete="email"
          id="sign-email"
          name="email"
          onChange={handleChange}
          placeholder="jane@studio.com"
          required
          type="email"
          value={fields.email}
        />
      </div>

      <button className="sign-btn" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing..." : "Sign the manifesto"}
      </button>

      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
      {successMessage ? <p className="status-message success">{successMessage}</p> : null}
    </form>
  );
}