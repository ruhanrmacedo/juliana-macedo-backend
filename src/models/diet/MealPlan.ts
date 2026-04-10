import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
    ManyToOne, OneToMany, JoinColumn
} from "typeorm";
import { User } from "../User";
import { MealPlanDay } from "./MealPlanDay";
import { Meal } from "./Meal";

@Entity("meal_plans")
export class MealPlan {
    @PrimaryGeneratedColumn()
    id: number;

    // Paciente dono do plano
    @ManyToOne(() => User, (u) => u.id, { onDelete: "CASCADE" })
    @JoinColumn({ name: "patient_id" })
    patient: User;

    // Quem criou (nutricionista/profissional) - opcional
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "created_by_id" })
    createdBy?: User | null;

    @Column()
    title: string; // "Plano cutting 2000 kcal", "Plano semanal"

    @Column({ type: "text", nullable: true })
    notes?: string;

    @Column({ type: "date", name: "start_date", nullable: true })
    startDate?: Date;

    @Column({ type: "date", name: "end_date", nullable: true })
    endDate?: Date;

    @Column({ name: "is_active", default: true })
    isActive: boolean;

    @CreateDateColumn({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt: Date;

    // Se você usar "dias" específicos (segunda, terça...) isto liga o plano aos dias
    @OneToMany(() => MealPlanDay, (d) => d.plan, { cascade: true })
    days?: MealPlanDay[];

    // Refeições “globais” do plano (quando não diferencia dia) — opcional
    @OneToMany(() => Meal, (m) => m.plan, { cascade: true })
    meals?: Meal[];
}
