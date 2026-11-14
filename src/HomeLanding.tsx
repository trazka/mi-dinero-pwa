import {
  ArrowLeftRight,
  HandCoins,
  PiggyBank,
  Eye,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
export default function HomeLanding({
  disabled,
  onMovements,
  onPayment,
  onSavings,
  onSummary,
}: {
  disabled: boolean;
  onMovements: () => void;
  onPayment: () => void;
  onSavings: () => void;
  onSummary: () => void;
}) {
  return (
    <section className="home-landing" aria-label="Accesos de Inicio">
      <div className="home-shortcuts">
        <button disabled={disabled} onClick={onMovements}>
          <ArrowLeftRight size={23} />
          <span>Consultar movimientos</span>
          <ChevronRight size={20} />
        </button>
        <button disabled={disabled} onClick={onPayment}>
          <HandCoins size={23} />
          <span>Registrar un abono</span>
          <ChevronRight size={20} />
        </button>
        <button disabled={disabled} onClick={onSavings}>
          <PiggyBank size={23} />
          <span>Mis apartados</span>
          <ChevronRight size={20} />
        </button>
      </div>
      <button
        className="button secondary home-summary"
        disabled={disabled}
        onClick={onSummary}
      >
        <Eye size={22} /> Ver mi resumen
      </button>
      <p className="home-privacy">
        <ShieldCheck size={17} /> Privado y local
      </p>
    </section>
  );
}
