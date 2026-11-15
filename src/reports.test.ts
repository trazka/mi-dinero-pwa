import { describe, it, expect } from "vitest";
import { groupReport, reportFree } from "./reports";
import type { Movement, Saving } from "./data";
const income: Movement = {
  id: "i",
  type: "income",
  amount: 1000,
  date: "2026-11-01",
  merchant: "Ingreso",
  category: "Sueldo",
  method: "Transferencia",
  notes: "",
};
const savings: Saving[] = [
  {
    id: "s",
    name: "Privado",
    target: 500,
    entries: [
      { id: "d", type: "deposit", amount: 200, date: "2026-11-02" },
      { id: "w", type: "withdrawal", amount: 50, date: "2026-12-01" },
    ],
  },
];
describe("dinero libre en reportes", () => {
  it("descuenta aportaciones y libera retiros en su periodo sin alterar ingresos ni gastos", () => {
    const groups = groupReport([income], savings, "monthly");
    expect(reportFree(groups.get("2026-11")!)).toBe(800);
    expect(reportFree(groups.get("2026-12")!)).toBe(50);
    expect(groups.get("2026-11")!.income).toBe(1000);
    expect(groups.get("2026-12")!.income).toBe(0);
    expect([...groups.values()].reduce((s, g) => s + reportFree(g), 0)).toBe(
      850,
    );
  });
  it("respeta fechas inclusivas y muestra periodos con solo aportaciones o retiros", () => {
    const groups = groupReport(
      [],
      savings,
      "daily",
      "2026-11-02",
      "2026-11-02",
    );
    expect([...groups.keys()]).toEqual(["2026-11-02"]);
    expect(reportFree(groups.get("2026-11-02")!)).toBe(-200);
  });
  it("agrupa semanas desde lunes y conserva centavos", () => {
    const groups = groupReport(
      [{ ...income, amount: 100.1 }],
      [
        {
          ...savings[0],
          entries: [
            { id: "d", type: "deposit", amount: 0.1, date: "2026-11-01" },
            { id: "w", type: "withdrawal", amount: 0.01, date: "2026-11-01" },
          ],
        },
      ],
      "weekly",
    );
    expect([...groups.keys()]).toEqual(["2026-10-26"]);
    expect(reportFree(groups.get("2026-10-26")!)).toBe(100.01);
  });
});
