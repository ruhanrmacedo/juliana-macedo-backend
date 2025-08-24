export function siriFromDc(densidade: number): number {
    // Siri (1961): %G = (495 / Dc) - 450
    return (495 / densidade) - 450;
}
export function kgFat(pesoKg: number, percentGordura: number) {
    return +(pesoKg * (percentGordura / 100)).toFixed(2);
}
export function kgLean(pesoKg: number, percentGordura: number) {
    return +(pesoKg - kgFat(pesoKg, percentGordura)).toFixed(2);
}
