import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { GestationTracking } from "./GestationTracking";


@Entity("gestation_visit")
export class GestationVisit {
    @PrimaryGeneratedColumn() id: number;

    @Column({ name: "tracking_id" }) trackingId: number;
    @ManyToOne(() => GestationTracking, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tracking_id" }) tracking: GestationTracking;

    @Column({ type: "date", name: "data" }) data: Date;

    @Column("decimal", { precision: 5, scale: 2, name: "peso_kg" })
    pesoKg: number;

    @Column("int", { name: "idade_gestacional_sem", nullable: true })
    idadeGestacional?: number;

    @Column("int", { name: "trimestre", nullable: true })
    trimestre?: 1 | 2 | 3;

    @Column("int", { name: "pa_sis", nullable: true }) paSistolica?: number;
    @Column("int", { name: "pa_dia", nullable: true }) paDiastolica?: number;

    @Column({ type: "text", nullable: true }) observacoes?: string;

    @CreateDateColumn({ name: "created_at" }) createdAt: Date;
}