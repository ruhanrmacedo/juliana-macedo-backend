import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
    CreateDateColumn, UpdateDateColumn
} from "typeorm";
import { AnthropometryMethod } from "../enums/AnthropometryMethod";
import { AnthropometryEvaluation } from "./AnthropometryEvaluation";

@Entity("anthropometry_result")
export class AnthropometryResult {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => AnthropometryEvaluation, { onDelete: "CASCADE" })
    @JoinColumn({ name: "evaluation_id" })
    evaluation: AnthropometryEvaluation;

    @Column({
        type: "enum",
        enum: AnthropometryMethod,
        enumName: "anthropometry_method_enum",
        name: "method",
    })
    method: AnthropometryMethod;

    @Column({
        type: "enum",
        enum: ["M", "F"],
        enumName: "sexo_enum",
        name: "sexo",
    })
    sexo: "M" | "F";

    @Column("int", { name: "idade" })
    idade: number;

    @Column("decimal", { precision: 8, scale: 6, name: "densidade_corp", nullable: true }) densidadeCorp?: number;
    @Column("decimal", { precision: 5, scale: 2, name: "percentual_gordura", nullable: true }) percentualGordura?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "massa_gorda_kg", nullable: true }) massaGordaKg?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "massa_magra_kg", nullable: true }) massaMagraKg?: number;

    // pediatria
    @Column("decimal", { precision: 6, scale: 3, name: "z_score", nullable: true }) zScore?: number;
    @Column("decimal", { precision: 5, scale: 2, name: "percentil", nullable: true }) percentil?: number;
    @Column({ type: "varchar", length: 40, name: "classificacao", nullable: true }) classificacao?: string;

    @Column({ type: "jsonb", name: "parametros_json", nullable: true }) parametrosJson?: any;

    @Column({ type: "smallint", name: "version", default: 1 }) version: number;

    @CreateDateColumn({ type: "timestamptz", name: "created_at" }) createdAt: Date;
    @UpdateDateColumn({ type: "timestamptz", name: "updated_at" }) updatedAt: Date;

    @Column({ type: "text", name: "notes", nullable: true }) notes?: string;
}
