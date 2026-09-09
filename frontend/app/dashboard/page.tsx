"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { ExcelUpload } from "@/components/excel-upload";
import { TemplateUpload } from "@/components/template-upload";

export default function DashboardPage() {
  return (
    <DashboardLayout activeNav="dashboard">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-1">
          Dashboard
        </h1>
        <p className="text-sm text-secondary">
          Tools for testing and uploading data.
        </p>
      </div>

      {/* Excel Upload section */}
      <ExcelUpload />

      {/* Template Upload section */}
      <div className="mt-6">
        <TemplateUpload />
      </div>
    </DashboardLayout>
  );
}
