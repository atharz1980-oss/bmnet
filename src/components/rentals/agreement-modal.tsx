"use client";

import { useState } from "react";
import { FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AgreementModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  title?: string;
  body?: string;
}

export function AgreementModal({ open, onClose, onAccept, title = "عقد إيجار المعدات", body }: AgreementModalProps) {
  const [agreed, setAgreed] = useState(false);

  if (!open) return null;

  const handleAccept = () => {
    if (!agreed) return;
    onAccept();
    setAgreed(false);
  };

  const handleClose = () => {
    setAgreed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-charcoal-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-bold text-charcoal-900">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-charcoal-500 transition hover:bg-charcoal-50 hover:text-charcoal-900"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {body ? (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-charcoal-700">{body}</div>
          ) : (
            <p className="text-sm text-charcoal-600">
              عقد إيجار المعدات - يرجى قراءة الشروط والأحكام كاملة قبل الموافقة.
            </p>
          )}
        </div>
        <div className="border-t border-charcoal-200 px-6 py-4">
          <label className="flex items-start gap-3 text-sm leading-relaxed text-charcoal-800">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0"
            />
            <span>لقد قرأت عقد إيجار المعدات وأوافق على جميع الشروط والأحكام</span>
          </label>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              إلغاء
            </Button>
            <Button type="button" onClick={handleAccept} disabled={!agreed}>
              قرأت وأوافق
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
