export enum NivelAtividade {
    SEDENTARIO = "Sedentário", // Pouco ou nenhum exercício - Multiplicador: 1.2
    LEVEMENTE_ATIVO = "Levemente Ativo", // Exercício leve (1-3 dias/semana) - Multiplicador: 1.375
    MODERADAMENTE_ATIVO = "Moderadamente Ativo", // Exercício moderado (3-5 dias/semana) - Multiplicador: 1.55
    ALTAMENTE_ATIVO = "Altamente Ativo", // Exercício intenso (6-7 dias/semana) - Multiplicador: 1.725
    ATLETA = "Atleta / Muito Ativo", // Exercício intenso diário + trabalho físico pesado - Multiplicador: 1.9
}