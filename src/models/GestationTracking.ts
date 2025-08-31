import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { GestationType } from "./enums/GestationType";


@Entity("gestation_tracking")
export class GestationTracking {
    @PrimaryGeneratedColumn() id: number;

    @Column({ name: "user_id" }) userId: number;
    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" }) user: User;

    @Column("decimal", { precision: 5, scale: 2, name: "peso_pre_gestacional" })
    pesoPreGestacional: number;

    @Column("decimal", { precision: 5, scale: 2, name: "altura_cm" })
    alturaCm: number;

    @Column({ type: "date", name: "dum" }) dum: Date;

    @Column({ type: "int", name: "idade_gestacional_inicio", nullable: true })
    idadeGestacionalInicio?: number;

    @Column({ type: "enum", enum: GestationType, enumName: "gestation_type_enum", name: "tipo_gestacao" })
    tipoGestacao: GestationType;

    // snapshots/metas
    @Column("decimal", { precision: 4, scale: 1, name: "bmi_pre" }) bmiPre: number;
    @Column({ name: "bmi_class", length: 20 }) bmiClass: "UNDER" | "NORMAL" | "OVER" | "OBESE";
    @Column("decimal", { precision: 4, scale: 1, name: "meta_ganho_min_kg" }) metaGanhoMinKg: number;
    @Column("decimal", { precision: 4, scale: 1, name: "meta_ganho_max_kg" }) metaGanhoMaxKg: number;

    @CreateDateColumn({ name: "created_at" }) createdAt: Date;
    @UpdateDateColumn({ name: "updated_at" }) updatedAt: Date;
}
