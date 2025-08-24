import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
    ManyToOne, JoinColumn
} from "typeorm";
import { User } from "../User";

@Entity("anthropometry_evaluation")
export class AnthropometryEvaluation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id" })
    userId: number;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column({ name: "assessor_id", nullable: true })
    assessorId?: number;

    @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "assessor_id" })
    assessor?: User;

    @Column({ type: "timestamptz", name: "measured_at" })
    measuredAt: Date;

    // snapshot
    @Column("decimal", { precision: 6, scale: 2, name: "peso", nullable: true }) peso?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "altura", nullable: true }) altura?: number;
    @Column("int", { name: "idade", nullable: true }) idade?: number;

    @Column({ type: "enum", enum: ["M", "F"], enumName: "sexo_enum", name: "sexo", nullable: true, })
    sexo?: "M" | "F";

    // dobras (mm)
    @Column("decimal", { precision: 6, scale: 2, name: "triceps_mm", nullable: true }) triceps_mm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "biceps_mm", nullable: true }) biceps_mm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "subescapular_mm", nullable: true }) subescapular_mm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "supra_iliaca_mm", nullable: true }) supra_iliaca_mm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "abdominal_mm", nullable: true }) abdominal_mm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "peitoral_torax_mm", nullable: true }) peitoral_torax_mm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "axilar_media_mm", nullable: true }) axilar_media_mm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "coxa_mm", nullable: true }) coxa_mm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "panturrilha_medial_mm", nullable: true }) panturrilha_medial_mm?: number;

    // circunferências (cm)
    @Column("decimal", { precision: 6, scale: 2, name: "cintura_cm", nullable: true }) cintura_cm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "quadril_cm", nullable: true }) quadril_cm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "pescoco_cm", nullable: true }) pescoco_cm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "braco_muac_cm", nullable: true }) braco_muac_cm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "coxa_circ_cm", nullable: true }) coxa_circ_cm?: number;
    @Column("decimal", { precision: 6, scale: 2, name: "panturrilha_circ_cm", nullable: true }) panturrilha_circ_cm?: number;

    @Column({ type: "jsonb", name: "extras", nullable: true })
    extras?: any;

    @CreateDateColumn({ type: "timestamptz", name: "created_at" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
    updatedAt: Date;
}  