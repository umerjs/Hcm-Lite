import PDFDocument from "pdfkit";

/**
 * Generates an official PDF payslip buffer using PDFKit.
 *
 * @param {Object} payrollData - Detailed payroll computation for an employee
 * @param {Object} [settings={}] - Company settings (e.g. companyName)
 * @returns {Promise<Buffer>}
 */
export const generatePayslipPdf = async (payrollData, settings = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const companyName = settings.companyName || "HCM Lite";
      const {
        employee = {},
        month = "N/A",
        basic = 0,
        hra = 0,
        medical = 0,
        gross = 0,
        workingDays = 0,
        employedDays = 0,
        absentDays = 0,
        halfDays = 0,
        lateCount = 0,
        deductions = 0,
        tax = 0,
        net = 0,
      } = payrollData;

      // ── Header Banner ──────────────────────────────────────────────────────
      doc.rect(40, 40, 515, 60).fill("#1E293B");
      doc
        .fillColor("#FFFFFF")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(companyName.toUpperCase(), 55, 52);
      doc.fontSize(10).font("Helvetica").text("OFFICIAL SALARY PAYSLIP", 55, 78);
      doc.fontSize(12).font("Helvetica-Bold").text(`PERIOD: ${month}`, 400, 62, { align: "right" });

      const topY = 120;

      // ── Employee Information Box ───────────────────────────────────────────
      doc.rect(40, topY, 515, 75).strokeColor("#CBD5E1").stroke();
      doc.fillColor("#0F172A").fontSize(9).font("Helvetica-Bold");

      doc.text("Employee Name:", 55, topY + 12);
      doc.font("Helvetica").text(employee?.name || "N/A", 150, topY + 12);

      doc.font("Helvetica-Bold").text("Employee Code:", 320, topY + 12);
      doc.font("Helvetica").text(employee?.code || "N/A", 420, topY + 12);

      doc.font("Helvetica-Bold").text("Department:", 55, topY + 32);
      doc.font("Helvetica").text(employee?.department || "General", 150, topY + 32);

      doc.font("Helvetica-Bold").text("Designation:", 320, topY + 32);
      doc.font("Helvetica").text(employee?.designation || "Staff", 420, topY + 32);

      doc.font("Helvetica-Bold").text("Email:", 55, topY + 52);
      doc.font("Helvetica").text(employee?.email || "N/A", 150, topY + 52);

      doc.font("Helvetica-Bold").text("Days Employed:", 320, topY + 52);
      doc.font("Helvetica").text(`${employedDays} / ${workingDays}`, 420, topY + 52);

      // ── Earnings & Deductions Tables ───────────────────────────────────────
      const tableY = 215;

      doc.rect(40, tableY, 250, 22).fill("#F1F5F9");
      doc.rect(305, tableY, 250, 22).fill("#F1F5F9");

      doc.fillColor("#1E293B").font("Helvetica-Bold").fontSize(9);
      doc.text("EARNINGS", 55, tableY + 6);
      doc.text("AMOUNT (PKR)", 210, tableY + 6, { align: "right" });

      doc.text("DEDUCTIONS", 320, tableY + 6);
      doc.text("AMOUNT (PKR)", 475, tableY + 6, { align: "right" });

      let rowY = tableY + 28;
      doc.font("Helvetica").fontSize(9).fillColor("#334155");

      // Row 1: Basic & Tax
      doc.text("Basic Salary (100%)", 55, rowY);
      doc.text(basic.toLocaleString("en-PK", { minimumFractionDigits: 2 }), 210, rowY, {
        align: "right",
      });
      doc.text("Income Tax (Monthly)", 320, rowY);
      doc.text(tax.toLocaleString("en-PK", { minimumFractionDigits: 2 }), 475, rowY, {
        align: "right",
      });

      rowY += 18;
      // Row 2: HRA & Attendance Deductions
      doc.text("House Rent Allowance (HRA 40%)", 55, rowY);
      doc.text(hra.toLocaleString("en-PK", { minimumFractionDigits: 2 }), 210, rowY, {
        align: "right",
      });
      doc.text("Attendance & Penalty Deductions", 320, rowY);
      doc.text((deductions || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 }), 475, rowY, {
        align: "right",
      });

      rowY += 18;
      // Row 3: Medical & Notes
      doc.text("Medical Allowance (10%)", 55, rowY);
      doc.text(medical.toLocaleString("en-PK", { minimumFractionDigits: 2 }), 210, rowY, {
        align: "right",
      });
      doc.text(`Absents: ${absentDays} | Half: ${halfDays} | Lates: ${lateCount}`, 320, rowY);
      doc.text("—", 475, rowY, { align: "right" });

      rowY += 24;
      // Totals Box
      doc.rect(40, rowY, 250, 22).fill("#E2E8F0");
      doc.rect(305, rowY, 250, 22).fill("#E2E8F0");
      doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(9);

      doc.text("TOTAL GROSS", 55, rowY + 6);
      doc.text(gross.toLocaleString("en-PK", { minimumFractionDigits: 2 }), 210, rowY + 6, {
        align: "right",
      });

      const totalDeductions = (tax || 0) + (deductions || 0);
      doc.text("TOTAL DEDUCTIONS", 320, rowY + 6);
      doc.text(
        totalDeductions.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
        475,
        rowY + 6,
        { align: "right" },
      );

      // ── Net Pay Highlight Card ─────────────────────────────────────────────
      const netY = rowY + 40;
      doc.rect(40, netY, 515, 50).fill("#047857");
      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(13)
        .text("NET SALARY PAYABLE", 55, netY + 12);
      doc
        .fontSize(16)
        .text(`PKR ${net.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`, 280, netY + 11, {
          align: "right",
        });
      doc
        .fontSize(8)
        .font("Helvetica")
        .text("Gross Earnings less Total Deductions", 55, netY + 32);

      // ── Footer ─────────────────────────────────────────────────────────────
      doc
        .fillColor("#94A3B8")
        .fontSize(8)
        .font("Helvetica")
        .text(
          "This is a system-generated payslip and does not require a physical signature.",
          40,
          720,
          { align: "center", width: 515 },
        )
        .text(`Generated on: ${new Date().toUTCString()} · Confidential`, 40, 732, {
          align: "center",
          width: 515,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
