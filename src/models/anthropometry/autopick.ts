import { AnthropometryEvaluation } from "./AnthropometryEvaluation";
import { AnthropometryMethod } from "../enums/AnthropometryMethod";
import { getAgeYearsAt, getAgeMonthsAt } from "./calculators/utils/date";


export function calcAutopick(e: AnthropometryEvaluation): {
  method?: AnthropometryMethod;
  who?: AnthropometryMethod[];         // BAZ/HAZ/WHZ…
  slaughter?: boolean;                 // se TR+SB presentes
  nextModule?: "GESTACIONAL" | "OBESIDADE_SEVERA";
} {
  const measuredAt = e.measuredAt || new Date();
  // Idade em anos e meses:
  const anos = e.idade ?? getAgeYearsAt(e.user?.dataNascimento, measuredAt);
  const meses = getAgeMonthsAt(e.user?.dataNascimento, measuredAt);

  // (Exemplo) Flags de fluxos especiais vindas de extras
  const gestante = e.extras?.gestante === true;
  const obesGrave = e.extras?.obesidade_grave === true;

  if (gestante) return { nextModule: "GESTACIONAL" };
  if (obesGrave) return { nextModule: "OBESIDADE_SEVERA" };

  // 0–59 meses → OMS WFL/WHZ + HAZ
  if (meses !== null && meses >= 0 && meses <= 59) {
    return { who: [AnthropometryMethod.WHO_WHZ, AnthropometryMethod.WHO_HAZ] };
  }

  // 5–19 anos → OMS BAZ + HAZ; Slaughter opcional (8–18) se TR+SB
  if (anos !== null && anos >= 5 && anos <= 19) {
    const hasTR = e.triceps_mm != null;
    const hasSB = e.subescapular_mm != null;
    const allowSlaughter = anos >= 8 && anos <= 18 && hasTR && hasSB;
    return { who: [AnthropometryMethod.WHO_BAZ, AnthropometryMethod.WHO_HAZ], slaughter: allowSlaughter };
  }

  // Adultos
  if (anos !== null && anos >= 18 && e.sexo) {
    const atleta = e.extras?.atleta === true;
    if (atleta) return { method: AnthropometryMethod.JACKSON_POLLOCK_7 };

    if (e.sexo === "M") {
      if (anos >= 60) return { method: AnthropometryMethod.DURNIN_WOMERSLEY };
      return { method: AnthropometryMethod.JACKSON_POLLOCK_3 };
    } else {
      if (anos > 55) return { method: AnthropometryMethod.DURNIN_WOMERSLEY };
      return { method: AnthropometryMethod.JACKSON_POLLOCK_WARD_3 };
    }
  }

  // Fallback
  return {};
}
