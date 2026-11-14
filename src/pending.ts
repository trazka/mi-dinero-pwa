import {
  today,
  validDate,
  validPending,
  saveMovement,
  removeMovement,
  payDebt,
  type Data,
  type Movement,
  type PendingMovement,
} from "./data";
import { moveSaving } from "./savings";

export function savePending(data: Data, pending: PendingMovement): Data {
  if (!validPending(pending))
    throw Error("Revisa los datos del movimiento pendiente.");
  const old = data.movements.find((m) => m.id === pending.id);
  if (old?.paymentId || old?.recurringId)
    throw Error(
      "Corrige este abono o recurrente desde su sección antes de dejarlo pendiente.",
    );
  const next = old ? removeMovement(data, pending.id) : data;
  return {
    ...next,
    pendingMovements: [
      ...(next.pendingMovements ?? []).filter((p) => p.id !== pending.id),
      pending,
    ],
  };
}
export function recordMovement(data: Data, movement: Movement): Data {
  return movement.date > today()
    ? savePending(data, movement)
    : saveMovement(data, movement);
}
export function recordPayment(
  data: Data,
  debtId: string,
  amount: number,
  date: string,
): Data {
  if (date <= today()) return payDebt(data, debtId, amount, date);
  const debt = data.debts.find((d) => d.id === debtId);
  if (!debt) throw Error("La deuda ya no existe.");
  return savePending(data, {
    id: crypto.randomUUID(),
    type: "payment",
    targetId: debtId,
    date,
    amount,
    merchant: `Abono · ${debt.creditor}`,
    category: "Pago de deuda",
    method: "Transferencia",
    notes: "",
  });
}
export function recordSaving(
  data: Data,
  savingId: string,
  amount: number,
  date: string,
): Data {
  if (date <= today())
    return moveSaving(data, savingId, "deposit", amount, date);
  const saving = data.savings?.find((s) => s.id === savingId);
  if (!saving) throw Error("El apartado ya no existe.");
  return savePending(data, {
    id: crypto.randomUUID(),
    type: "saving",
    targetId: savingId,
    date,
    amount,
    merchant: `Aportación · ${saving.name}`,
    category: "Apartado",
    method: "",
    notes: "",
  });
}
export function cancelPending(data: Data, id: string): Data {
  return {
    ...data,
    pendingMovements: (data.pendingMovements ?? []).filter((p) => p.id !== id),
  };
}
export function confirmPending(data: Data, id: string, date = today()): Data {
  const pending = data.pendingMovements?.find((p) => p.id === id);
  if (!pending || pending.date > today() || !validDate(date) || date > today())
    throw Error("El movimiento no está pendiente o todavía no llega su fecha.");
  const next = cancelPending(data, id);
  if (pending.type === "payment")
    return payDebt(next, pending.targetId!, pending.amount, date);
  if (pending.type === "saving")
    return moveSaving(next, pending.targetId!, "deposit", pending.amount, date);
  const { targetId: _target, ...movement } = pending;
  return saveMovement(next, { ...movement, type: pending.type, date });
}
