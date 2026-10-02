/** Spreadsheet IDs are server-side Apps Script Script Properties, never browser config. */
export const SHEETS = {
  finance: { cash: "TienMat", accounts: "TaiKhoan", investments: "DauTu", loans: "ChoVay" },
  attendance: { companies: "Companies", rates: "Salary_Rates", attendance: "ChamCong_Data" },
  timezone: "Asia/Ho_Chi_Minh",
} as const;
