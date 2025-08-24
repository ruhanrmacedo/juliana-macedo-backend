import { AppDataSource } from "../../../config/ormconfig";
import { AnthropometryMethod } from "../../enums/AnthropometryMethod";
import { AnthropometryEvaluation } from "../AnthropometryEvaluation";
import { AnthropometryResult } from "../AnthropometryResult";
import { BadRequest } from "./utils/errors";

import * as Adult from "./adult";
import * as Pediatric from "./pediatric";


const resRepo = () => AppDataSource.getRepository(AnthropometryResult);

export class AnthropometryCalculator {
  static async run(method: AnthropometryMethod, e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    switch (method) {
      // Adultos
      case AnthropometryMethod.DURNIN_WOMERSLEY: return Adult.calcDW(e);
      case AnthropometryMethod.FAULKNER: return Adult.calcFaulkner(e);
      case AnthropometryMethod.GUEDES: return Adult.calcGuedes(e);
      case AnthropometryMethod.JACKSON_POLLOCK_3: return Adult.calcJP3(e);
      case AnthropometryMethod.JACKSON_POLLOCK_7: return Adult.calcJP7(e);
      case AnthropometryMethod.JACKSON_POLLOCK_WARD_3: return Adult.calcJPW3(e);
      case AnthropometryMethod.JACKSON_POLLOCK_WARD_7: return Adult.calcJPW7(e);
      case AnthropometryMethod.PETROSKI: return Adult.calcPetroski(e);

      // Pediatria
      case AnthropometryMethod.WHO_BAZ: return Pediatric.calcWHO_BAZ(e);
      case AnthropometryMethod.WHO_HAZ: return Pediatric.calcWHO_HAZ(e);
      case AnthropometryMethod.WHO_WHZ: return Pediatric.calcWHO_WHZ(e);
      case AnthropometryMethod.SLAUGHTER: return Pediatric.calcSlaughter(e);

      default:
        throw new BadRequest("Método não suportado");
    }
  }

  static async runAndPersist(method: AnthropometryMethod, e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    const computed = await this.run(method, e);
    // Amarra avaliação e campos obrigatórios
    computed.evaluation = e;
    computed.sexo = e.sexo as any;
    computed.idade = e.idade ?? 0;

    return await resRepo().save(computed);
  }
}
