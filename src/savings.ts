import {
  cents,
  expenseAmount,
  today,
  validDate,
  availableWalletBalances,
  allocateLegacySavings,
  type WalletKey,
  type Data,
  type Saving,
} from "./data";
export const savedAmount = (saving: Saving) =>
  saving.entries.reduce(
    (sum, e) =>
      sum + (e.type === "deposit" ? 1 : -1) * Math.round(e.amount * 100),
    0,
  ) / 100;
export const reservedAmount = (data: Data) =>
  (data.savings ?? []).reduce(
    (sum, s) => sum + Math.round(savedAmount(s) * 100),
    0,
  ) / 100;
export const freeAmount = (data: Data) =>
  (data.movements.reduce(
    (sum, m) =>
      sum +
      Math.round((m.type === "income" ? m.amount : -expenseAmount(m)) * 100),
    0,
  ) -
    Math.round(reservedAmount(data) * 100)) /
  100;
export function saveSaving(
  data: Data,
  name: string,
  target: number,
  id: string = crypto.randomUUID(),
): Data {
  data = allocateLegacySavings(data);
  if (!name.trim() || name.trim().length > 120 || !cents(target))
    throw Error("Indica un nombre y una meta válida mayor a cero.");
  const existing = (data.savings ?? []).find((s) => s.id === id);
  const saving: Saving = {
    id,
    name: name.trim(),
    target,
    entries: existing?.entries ?? [],
    allocations: existing?.allocations ?? { bank: 0, cash: 0, unassigned: 0 },
  };
  return {
    ...data,
    savings: existing
      ? data.savings!.map((s) => (s.id === id ? saving : s))
      : [...(data.savings ?? []), saving],
  };
}
export function moveSaving(
  data: Data,
  id: string,
  type: "deposit" | "withdrawal",
  amount: number,
  date: string = today(),
  wallet?: WalletKey,
): Data {
  data = allocateLegacySavings(data);
  const saving = data.savings?.find((s) => s.id === id);
  if (
    !saving ||
    !["deposit", "withdrawal"].includes(type) ||
    !cents(amount) ||
    !validDate(date)
  )
    throw Error("Introduce un importe válido.");
  if (type === "deposit" && amount > freeAmount(data))
    throw Error("El importe supera el dinero libre para apartar.");
  if (type === "withdrawal" && amount > savedAmount(saving))
    throw Error("El retiro supera el saldo del apartado.");
  const available = availableWalletBalances(data);
  const allocation = { ...saving.allocations! };
  const source = type === "deposit" ? available : allocation;
  const chosen =
    wallet ??
    (["bank", "cash", "unassigned"] as WalletKey[]).find(
      (key) => source[key] > 0,
    ) ??
    "bank";
  if (!["bank", "cash", "unassigned"].includes(chosen))
    throw Error("Selecciona Banco o Efectivo.");
  if (Math.round(amount * 100) > Math.round(source[chosen] * 100))
    throw Error(
      type === "deposit"
        ? "El importe supera el saldo disponible de esa cuenta. Elige otra cuenta o libera un apartado."
        : "El importe supera lo reservado en esa cuenta dentro del apartado.",
    );
  allocation[chosen] =
    (Math.round(allocation[chosen] * 100) +
      (type === "deposit" ? 1 : -1) * Math.round(amount * 100)) /
    100;
  return {
    ...data,
    savings: data.savings!.map((s) =>
      s.id === id
        ? {
            ...s,
            allocations: allocation,
            entries: [
              ...s.entries,
              { id: crypto.randomUUID(), type, amount, date, wallet: chosen },
            ],
          }
        : s,
    ),
  };
}
export function removeSaving(data: Data, id: string): Data {
  const saving = data.savings?.find((s) => s.id === id);
  if (!saving || savedAmount(saving) !== 0)
    throw Error("Retira primero todo el saldo del apartado.");
  return { ...data, savings: data.savings!.filter((s) => s.id !== id) };
}
