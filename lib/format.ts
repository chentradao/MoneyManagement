export const money = (value:number) => new Intl.NumberFormat("vi-VN", {maximumFractionDigits:0}).format(Number(value)||0)+" ₫";
export const number = (value:number, digits=1) => new Intl.NumberFormat("vi-VN", {maximumFractionDigits:digits}).format(Number(value)||0);
