import React from "react";

interface MoneyTextProps {
  amount: number | string | null | undefined;
  currency?: string;
  className?: string;
}

export const MoneyText: React.FC<MoneyTextProps> = ({
  amount,
  currency = "PKR",
  className = "",
}) => {
  if (amount === null || amount === undefined || amount === "") {
    return <span className={className}>-</span>;
  }

  const numericValue = typeof amount === "number" ? amount : parseFloat(String(amount));

  if (isNaN(numericValue)) {
    return <span className={className}>{String(amount)}</span>;
  }

  const formatted = numericValue.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className={`tabular-nums font-medium ${className}`}>
      {currency ? `${currency} ` : ""}
      {formatted}
    </span>
  );
};

export default MoneyText;
